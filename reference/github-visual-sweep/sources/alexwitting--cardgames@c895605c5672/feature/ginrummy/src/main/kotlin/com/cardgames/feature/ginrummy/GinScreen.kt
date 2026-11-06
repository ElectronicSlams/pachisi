package com.cardgames.feature.ginrummy

import androidx.compose.animation.BoundsTransform
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.animateBounds
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.movableContentOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.LookaheadScope
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cardgames.core.domain.cards.Card
import com.cardgames.core.domain.ginrummy.GinEngine
import com.cardgames.core.domain.ginrummy.GinPhase
import com.cardgames.core.domain.ginrummy.GinPlayer
import com.cardgames.core.domain.ginrummy.GinState
import com.cardgames.core.ui.cards.CARD_CORNER_PERCENT
import com.cardgames.core.ui.cards.DragDropContainer
import com.cardgames.core.ui.cards.DragDropState
import com.cardgames.core.ui.cards.LocalCardTableTheme
import com.cardgames.core.ui.cards.PlayingCard
import com.cardgames.core.ui.cards.dropTarget
import com.cardgames.core.ui.cards.rememberDragDropState
import com.cardgames.core.ui.chrome.GameScaffold
import com.cardgames.core.ui.chrome.RailButton
import com.cardgames.core.ui.feedback.LocalGameFeedback
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * One card slot in the shared movable-content pool, keyed by [Card] identity — the same trick
 * solitaire uses: whichever pile a card currently renders in, it's the *same* composable node, so
 * [animateBounds] glides it smoothly across piles on any state change, whether that change came
 * from a tap or an auto-driven AI move. Covers the *entire* hand — stock and the opponent's hand
 * render their real (face-down) card identities too, so a stock draw visibly glides from the pile
 * and flips face up in transit instead of fading in from nowhere, and the opponent's own
 * draws/discards glide the same way, still face down throughout unless the card lands somewhere
 * the player is allowed to see it. Rendering a card face down never leaks its identity —
 * [PlayingCard] shows a generic back and content description regardless of which [Card] backs the
 * cache entry.
 *
 * [durationMillis] is read at whichever call site currently renders the card — i.e. its
 * *destination* — so a call site can make its own arrivals read slower without touching anyone
 * else's: opponent moves and the player's hand — which reorders itself around melds — both want a
 * slower, more deliberate glide than a plain pile crossing.
 *
 * [rotationZ] is this same destination's target tilt (0 outside [HandFan], which is the only
 * layout that ever rotates a card) — owned and animated right here, alongside position, rather
 * than by a second, independent animation living inside `HandFan`: one card identity, one place
 * deciding its whole on-screen transform, animated as one unit so position and rotation can never
 * drift out of sync with each other.
 */
internal typealias MovableCard = @Composable (faceUp: Boolean, durationMillis: Int, rotationZ: Float, modifier: Modifier) -> Unit

@Composable
fun GinScreen(
    onNavigateBack: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenStats: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val viewModel: GinViewModel = hiltViewModel()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val feedback = LocalGameFeedback.current
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(viewModel, feedback) {
        viewModel.effects.collect { effect ->
            when (effect) {
                is GinEffect.ShowSnackbar -> launch { snackbarHostState.showSnackbar(effect.message) }
                else -> feedback.reactTo(effect)
            }
        }
    }

    GinContent(
        state = state,
        onIntent = viewModel::onIntent,
        onNavigateBack = onNavigateBack,
        onOpenSettings = onOpenSettings,
        onOpenStats = onOpenStats,
        snackbarHostState = snackbarHostState,
        modifier = modifier,
    )
}

/**
 * The screen's entire UI, decoupled from the ViewModel — a plain parameter/state composable, so
 * it previews with no Hilt graph (same split as solitaire's `SolitaireContent`).
 *
 * The AI's turns and every layoff resolve on their own (see [GinViewModel.autoDriveSeat]), paced
 * with a think-delay per real decision, plus the cross-pile glide (this file's
 * [rememberMovableCards]) and the scoring/scoreboard detail below. The board's own rows
 * (`OpponentHandRow`, `StockDiscardRow`, `PlayerHandArea`, etc.) live in `GinBoardRows.kt`,
 * split out once this file had grown to cover several different jobs in one large file.
 */
@Composable
internal fun GinContent(
    state: GinUiState,
    onIntent: (GinIntent) -> Unit,
    onNavigateBack: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenStats: () -> Unit,
    snackbarHostState: SnackbarHostState,
    modifier: Modifier = Modifier,
) {
    val theme = LocalCardTableTheme.current
    val game = state.game
    val dragState = rememberDragDropState<GinDragSource>()

    // Set when a drag-driven draw/discard drops, naming the card whose destination render should
    // skip the glide-from-origin animation for one frame — the drag ghost already carried it
    // there, so replaying the full pile-to-hand journey a second time would double as a
    // "reanimate from the pile" motion. Cleared by whichever composable renders that card's new
    // location once it's read the skip.
    var justDroppedCard by remember { mutableStateOf<Card?>(null) }

    // Names the card the opponent just took from the discard pile (draw or the upcard decision)
    // — the pile's top card is already public knowledge, so it stays face up while it glides into
    // the opponent's otherwise-hidden hand instead of flipping to its back the instant it
    // reparents there. Detected structurally from consecutive [GinState]s (previous discard-pile
    // top disappearing into the opponent's hand) rather than a new ViewModel effect, since this
    // needs to hold for the glide's *duration*, not fire-and-forget like a sound/haptic cue.
    // Cleared after roughly one glide's worth of time — by then the card should be settled in the
    // fan, so hiding it reads as "tucked into the hand" rather than an abrupt snap mid-flight.
    var revealDuringGlide by remember { mutableStateOf<Card?>(null) }
    var previousDiscardTop by remember { mutableStateOf(game.discardPile.lastOrNull()) }
    LaunchedEffect(game) {
        val takenCard = previousDiscardTop
        previousDiscardTop = game.discardPile.lastOrNull()
        revealDuringGlide = null
        if (takenCard != null && takenCard !in game.discardPile && takenCard == game.opponentHand.lastOrNull()) {
            revealDuringGlide = takenCard
            delay(OPPONENT_MOVE_MILLIS.toLong())
            if (revealDuringGlide == takenCard) revealDuringGlide = null
        }
    }

    GameScaffold(
        gameTitle = "Gin Rummy",
        onNavigateBack = onNavigateBack,
        onOpenSettings = onOpenSettings,
        onOpenStats = onOpenStats,
        snackbarHostState = snackbarHostState,
        modifier = modifier,
        topBarInfo = {
            Column {
                Text(
                    text =
                        "You ${game.matchScores.getValue(GinPlayer.PLAYER)} " +
                            "– ${game.matchScores.getValue(GinPlayer.OPPONENT)} Opponent",
                    color = theme.colors.chromeText,
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    text =
                        "Hand ${game.handNumber} · boxes ${game.boxes.getValue(GinPlayer.PLAYER)}" +
                            "–${game.boxes.getValue(GinPlayer.OPPONENT)}",
                    color = theme.colors.chromeText.copy(alpha = 0.7f),
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        },
        topBarActions = {
            RailButton(
                imageVector = Icons.Filled.Add,
                label = "New match",
                onClick = { onIntent(GinIntent.NewMatch) },
            )
        },
        bottomBarActions = { GinBottomBarActions(state, onIntent) },
    ) { innerPadding ->
        DragDropContainer(
            state = dragState,
            ghost = { source -> GinDragGhost(game, source) },
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
        ) {
            LookaheadScope {
                val cards = rememberMovableCards(dealKey = game.seed, lookaheadScope = this)
                Column(
                    modifier =
                        Modifier
                            .fillMaxSize()
                            .padding(horizontal = 8.dp),
                ) {
                    Spacer(modifier = Modifier.height(8.dp))
                    OpponentHandRow(
                        hand = game.opponentHand,
                        cards = cards,
                        isThinking = state.isOpponentThinking,
                        revealed = game.phase is GinPhase.HandOver || game.phase is GinPhase.MatchOver,
                        revealDuringGlide = revealDuringGlide,
                        // A card drawn from the stock or discard pile is still visually near/
                        // under this row's own piles for the early part of its glide up into the
                        // hand; without an explicit z-order it would render *beneath* those piles,
                        // since Compose's default paint order follows declaration order and
                        // StockDiscardRow is declared after this row.
                        modifier = Modifier.zIndex(1f).align(Alignment.CenterHorizontally).widthIn(max = MAX_BOARD_WIDTH),
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    StockDiscardRow(
                        game = game,
                        isPlayerTurn = state.isPlayerTurn,
                        dragState = dragState,
                        onIntent = onIntent,
                        cards = cards,
                        justDroppedCard = justDroppedCard,
                        onJustDroppedCardChange = { justDroppedCard = it },
                        modifier =
                            Modifier
                                .weight(1f)
                                .align(Alignment.CenterHorizontally)
                                .widthIn(max = MAX_BOARD_WIDTH),
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    TurnPrompt(phase = game.phase)
                    Spacer(modifier = Modifier.height(8.dp))
                    PlayerHandArea(
                        state = state,
                        dragState = dragState,
                        onIntent = onIntent,
                        cards = cards,
                        justDroppedCard = justDroppedCard,
                        onJustDroppedCardChange = { justDroppedCard = it },
                        modifier = Modifier.align(Alignment.CenterHorizontally).widthIn(max = MAX_BOARD_WIDTH),
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
            HandOverOverlay(state = state, onIntent = onIntent, modifier = Modifier.align(Alignment.Center))
            GinAvailableOverlay(state = state, onIntent = onIntent, modifier = Modifier.align(Alignment.Center))
        }
    }
}

/**
 * The card following the finger during a drag — a plain copy, never the movable original. Always
 * face up, including a stock draw: dragging it off the pile *is* looking at it (the move can't be
 * reversed mid-drag, only undone afterward via [GinIntent.Undo]), so there's nothing left to hide
 * by the time the finger has actually picked it up.
 */
@Composable
private fun GinDragGhost(
    game: GinState,
    source: GinDragSource,
) {
    when (source) {
        is GinDragSource.HandCard -> PlayingCard(card = source.card, faceUp = true)
        GinDragSource.StockTop -> game.stock.lastOrNull()?.let { PlayingCard(card = it, faceUp = true) }
        GinDragSource.DiscardTop -> game.discardPile.lastOrNull()?.let { PlayingCard(card = it, faceUp = true) }
    }
}

/** One outline style for drop-legality highlights (mirrors solitaire's `SolitaireScreen.pileOutline`). */
internal fun Modifier.pileOutline(
    show: Boolean,
    color: Color,
): Modifier = if (show) border(width = 2.dp, color = color, shape = RoundedCornerShape(percent = CARD_CORNER_PERCENT)) else this

/**
 * Registers this node as [target]: accepts exactly what the engine deems legal. [onCardDropped]
 * names the physical card just moved (resolved against the pre-drop [game]) so the destination
 * can skip re-gliding it in from scratch — see `justDroppedCard` in [GinContent].
 */
internal fun Modifier.ginDropTarget(
    dragState: DragDropState<GinDragSource>,
    game: GinState,
    target: GinDropTarget,
    onIntent: (GinIntent) -> Unit,
    onCardDropped: (Card) -> Unit,
): Modifier =
    dropTarget(
        state = dragState,
        key = target,
        canAccept = { source -> game.moveFor(source, target)?.let { GinEngine.isLegal(game, it) } == true },
        onDrop = { source ->
            game.cardFor(source)?.let(onCardDropped)
            onIntent(GinIntent.DropCard(source, target))
        },
    )

/**
 * One movable composable per known-identity card, cached per hand (a fresh seed means a fresh
 * deal, not a continuation — nothing should glide across that boundary). See the [MovableCard]
 * KDoc for which cards get this treatment.
 */
@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
private fun rememberMovableCards(
    dealKey: Any,
    lookaheadScope: LookaheadScope,
): (Card) -> MovableCard {
    val cache = remember(dealKey, lookaheadScope) { mutableMapOf<Card, MovableCard>() }
    return { card ->
        cache.getOrPut(card) {
            movableContentOf { faceUp, durationMillis, targetRotation, modifier ->
                val appear = remember { Animatable(0f) }
                LaunchedEffect(Unit) { appear.animateTo(1f, tween(APPEAR_MILLIS)) }
                val boundsTransform = remember(durationMillis) { BoundsTransform { _, _ -> tween(durationMillis) } }
                // Same duration as the position glide above, triggered from this same composable
                // (see [MovableCard]'s KDoc) — initialized to the current target so a card's first
                // appearance never animates in from some earlier default angle.
                val rotationAnimatable = remember { Animatable(targetRotation) }
                LaunchedEffect(targetRotation, durationMillis) { rotationAnimatable.animateTo(targetRotation, tween(durationMillis)) }
                PlayingCard(
                    card = card,
                    faceUp = faceUp,
                    flipMillis = FLIP_MILLIS,
                    modifier =
                        Modifier
                            .animateBounds(lookaheadScope, boundsTransform = boundsTransform)
                            .graphicsLayer {
                                alpha = appear.value
                                rotationZ = rotationAnimatable.value
                            }.then(modifier),
                )
            }
        }
    }
}

private const val APPEAR_MILLIS = 480

/** Double [com.cardgames.core.ui.cards.PlayingCard]'s shared default — gin runs at half speed, solitaire doesn't. */
private const val FLIP_MILLIS = 560

/**
 * Caps each board row's own width so cards can't balloon huge on a wide tablet landscape
 * viewport — mirrors `SolitaireScreen.kt`'s own `MAX_BOARD_WIDTH`. Applied per-row at each call
 * site rather than around the whole board `Column`, so it doesn't touch the
 * `DragDropContainer`/`LookaheadScope` coordinate space the movable-card glide animations rely on.
 */
private val MAX_BOARD_WIDTH = 640.dp

/**
 * The slowest of the three glide tiers (see `GinBoardRows.kt`'s `MOVE_MILLIS`/
 * `PLAYER_HAND_MOVE_MILLIS` for the other two and the tiering rationale) — the opponent's hand is
 * slowest of all so their moves are easy to actually watch and follow. Kept here (`internal`, not
 * `private`) rather than with its siblings because [GinContent] also needs it directly, for the
 * `revealDuringGlide` timing above, which isn't owned by any one board row.
 */
internal const val OPPONENT_MOVE_MILLIS = 1500
