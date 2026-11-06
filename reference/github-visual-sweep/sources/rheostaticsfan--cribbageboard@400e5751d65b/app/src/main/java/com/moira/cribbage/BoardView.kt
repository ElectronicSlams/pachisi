package com.moira.cribbage

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.Canvas
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import kotlin.math.roundToInt

/**
 * Two units are in play and mixing them up is the easy mistake here.
 *
 *   `scale` is pixels per HOLE SPACING — the geometry's unit.
 *   `lg`    is pixels per LANE GAP, which is 1.51 spacings.
 *
 * Anything sized by how far apart the holes are (holes, pegs) scales by the former; anything
 * sized by how wide a track is (the band, the skunk line, the game-hole ring) by the latter.
 */
private const val BAND = 0.84f          // of a lane gap
private const val HOLE = 0.14f          // of a hole spacing
private const val PEG = 0.80f           // of a hole spacing
private const val PEG_CORNER = 0.22f

/**
 * How close a touch must be to a peg to pick it up. Generous in absolute terms, but capped
 * relative to the board: on a small screen a fixed 30 dp circle would span more than a lane
 * gap and grab a neighbouring player's peg.
 */
private val GrabRadius = 30.dp
private const val GRAB_LANE_GAPS = 0.8f

private data class Drag(val player: Int, val pos: Offset, val hole: Int?)

@Composable
fun BoardView(vm: GameViewModel, modifier: Modifier = Modifier) {
    val palette = LocalPalette.current
    val haptics = LocalHapticFeedback.current
    val density = LocalDensity.current
    val geom = BoardGeometry

    BoxWithConstraints(modifier.clipToBounds()) {
        val wPx = with(density) { maxWidth.toPx() }
        val hPx = with(density) { maxHeight.toPx() }
        val scale = minOf(wPx / geom.width, hPx / geom.height)
        val lg = BoardGeometry.laneGap * scale
        val origin = Offset(
            (wPx - geom.width * scale) / 2f,
            (hPx - geom.height * scale) / 2f,
        )
        val grabPx = minOf(with(density) { GrabRadius.toPx() }, GRAB_LANE_GAPS * lg)
        fun screen(lane: Int, hole: Int): Offset {
            val p = geom.lanes[lane][hole]
            return Offset(origin.x + p.x * scale, origin.y + p.y * scale)
        }

        var drag by remember { mutableStateOf<Drag?>(null) }

        Canvas(
            modifier = Modifier
                .matchParentSize()
                .pointerInput(scale, origin) {
                    // finally: if this coroutine is cancelled mid-gesture (a window resize
                    // changes the key) onDragCancel never fires, and a phantom peg would
                    // stay painted until the next touch.
                    try {
                    detectDragGestures(
                        onDragStart = { start ->
                            // Grab the back peg — the one you move. Nearest wins, so
                            // overlapping pegs at the start of a game still work.
                            val s = vm.state
                            var best: Int? = null
                            var bestD = grabPx * grabPx
                            for (i in s.players.indices) {
                                val p = screen(s.laneOf(i), s.players[i].backPeg)
                                val d = (p - start).getDistanceSquared()
                                if (d < bestD) { bestD = d; best = i }
                            }
                            drag = best?.let { Drag(it, start, null) }
                        },
                        onDrag = { change, amount ->
                            change.consume()
                            val d = drag ?: return@detectDragGestures
                            val s = vm.state
                            val pos = d.pos + amount
                            drag = d.copy(
                                pos = pos,
                                hole = geom.nearestHole(
                                    lane = s.laneOf(d.player),
                                    point = pos,
                                    from = s.players[d.player].score,
                                    scale = scale,
                                    origin = origin,
                                ),
                            )
                        },
                        onDragEnd = {
                            drag?.let { d ->
                                d.hole?.let {
                                    haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                                    vm.peg(d.player, it)
                                }
                            }
                            drag = null
                        },
                        onDragCancel = { drag = null },
                    )
                    } finally {
                        drag = null
                    }
                }
        ) {
            val s = vm.state
            val usedLanes = s.players.indices.map { s.laneOf(it) }.toSet()

            // Track: a thick round-capped line through every hole, then the holes on top.
            for (lane in 0 until LANE_COUNT) {
                val live = lane in usedLanes
                val pts = geom.lanes[lane]
                val path = Path()
                pts.forEachIndexed { i, p ->
                    val x = origin.x + p.x * scale
                    val y = origin.y + p.y * scale
                    if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
                }
                drawPath(
                    path = path,
                    color = if (live) palette.bandFill else palette.bandFillIdle,
                    style = Stroke(
                        width = BAND * lg,
                        cap = StrokeCap.Round,
                        join = StrokeJoin.Round,
                    ),
                )
            }
            for (lane in 0 until LANE_COUNT) {
                val live = lane in usedLanes
                geom.lanes[lane].forEachIndexed { i, _ ->
                    if (i != GAME_HOLE) {
                        drawCircle(
                            color = if (live) palette.holeColor else palette.holeIdle,
                            radius = HOLE * scale,
                            center = screen(lane, i),
                        )
                    }
                }
            }

            // Skunk line, level across the three centre columns because hole 91 sits at the
            // same height in every lane.
            val a = screen(0, SKUNK_HOLE)
            val b = screen(LANE_COUNT - 1, SKUNK_HOLE)
            val sy = a.y + 0.55f * lg
            drawLine(
                color = palette.marking,
                start = Offset(a.x - 0.55f * lg, sy),
                end = Offset(b.x + 0.55f * lg, sy),
                strokeWidth = 0.08f * lg,
            )

            // The single shared game hole.
            val g = screen(1, GAME_HOLE)
            drawCircle(palette.marking, 0.40f * lg, g, style = Stroke(width = 0.10f * lg))
            drawCircle(palette.marking, 0.15f * lg, g)

            // Pegs. Back peg carries a white core so it reads as "previous score".
            s.players.forEachIndexed { i, p ->
                val lane = s.laneOf(i)
                val col = palette.playerColors[lane]
                val dragging = drag?.player == i
                when {
                    // The back peg is in the air; only the front one stays put.
                    dragging -> drawPeg(screen(lane, p.score), col, palette, scale, true)
                    // Start of the game: both pegs share the stub, so draw one.
                    p.score == p.backPeg -> drawPeg(screen(lane, p.score), col, palette, scale, true)
                    else -> {
                        drawPeg(screen(lane, p.backPeg), col, palette, scale, false)
                        drawPeg(screen(lane, p.score), col, palette, scale, true)
                    }
                }
            }
            drag?.let { d ->
                val lane = s.laneOf(d.player)
                val col = palette.playerColors[lane]
                val from = screen(lane, s.players[d.player].backPeg)
                drawCircle(
                    palette.outline, 0.34f * lg, from,
                    style = Stroke(width = 0.06f * lg),
                )
                d.hole?.let { h ->
                    drawCircle(
                        col, 0.42f * lg, screen(lane, h),
                        style = Stroke(width = 0.09f * lg),
                    )
                }
                drawPeg(d.pos, col, palette, scale, false)
            }
        }

        // "S" markers, as text rather than canvas glyphs.
        val sPos = screen(0, SKUNK_HOLE)
        val sPos2 = screen(LANE_COUNT - 1, SKUNK_HOLE)
        val sFont = with(density) { (0.80f * lg).toSp() }
        SkunkLabel("S", sPos.x - 1.45f * lg, sPos.y - 0.10f * lg, sFont, palette.marking)
        SkunkLabel("S", sPos2.x + 0.72f * lg, sPos.y - 0.10f * lg, sFont, palette.marking)

        // The running total, following the peg. Carries the player's own colour, so with
        // three pegs on the board it's never ambiguous whose score is moving. Absent when
        // the peg is nowhere near a hole — which is also how you abandon a drag.
        drag?.let { d ->
            val hole = d.hole ?: return@let
            val gained = hole - vm.state.players[d.player].score
            val fill = palette.playerColors[vm.state.laneOf(d.player)]
            // Sits above the finger, except along the top run where the board is clipped and
            // it would be cut off — there it flips below. Since the bubble is now the only
            // signal that a hole is actually snapped, losing it would matter.
            val above = d.pos.y > 2.2f * lg
            Box(
                modifier = Modifier
                    .offset {
                        IntOffset(
                            (d.pos.x + 0.7f * lg)
                                .coerceIn(0f, (wPx - 2.8f * lg).coerceAtLeast(0f))
                                .roundToInt(),
                            (d.pos.y + if (above) -1.7f * lg else 1.0f * lg).roundToInt(),
                        )
                    }
                    .background(fill, RoundedCornerShape(50))
                    .border(with(density) { (0.07f * lg).toDp() }, palette.ink, RoundedCornerShape(50))
                    .padding(horizontal = 12.dp, vertical = 5.dp)
            ) {
                Text(
                    text = "+$gained",
                    color = onPlayerColor(fill),
                    fontSize = with(density) { (0.70f * lg).toSp() },
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

@Composable
private fun SkunkLabel(text: String, x: Float, y: Float, size: TextUnit, color: Color) {
    Box(modifier = Modifier.offset { IntOffset(x.roundToInt(), y.roundToInt()) }) {
        Text(text = text, color = color, fontSize = size, fontWeight = FontWeight.Bold)
    }
}

private fun DrawScope.drawPeg(
    at: Offset,
    color: Color,
    palette: CribPalette,
    scale: Float,
    front: Boolean,
) {
    val side = PEG * scale
    val corner = CornerRadius(PEG_CORNER * side)
    val topLeft = Offset(at.x - side / 2f, at.y - side / 2f)
    drawRoundRect(color, topLeft, Size(side, side), corner)
    drawRoundRect(
        palette.ink, topLeft, Size(side, side), corner,
        style = Stroke(width = 0.085f * scale),
    )
    if (!front) {
        val inner = side * 0.40f
        drawRoundRect(
            Color.White,
            Offset(at.x - inner / 2f, at.y - inner / 2f),
            Size(inner, inner),
            CornerRadius(inner * 0.25f),
        )
    }
}
