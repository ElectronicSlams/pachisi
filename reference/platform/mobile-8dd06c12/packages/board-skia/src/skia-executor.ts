import {
  BlurStyle,
  PaintStyle,
  Skia,
  type SkCanvas,
  type SkPaint,
  type SkTypeface,
} from "@shopify/react-native-skia";
import type { BoardSurface } from "@eslams/theme-tokens";
import { MATERIAL_SKSL } from "./material-shader";
import type { DrawStyle, MaterialLayer, Rect, RenderCommand, RenderPlan } from "./types";

const compiledMaterialEffect = (() => {
  const effect = Skia.RuntimeEffect.Make(MATERIAL_SKSL);
  if (!effect) throw new Error("The pinned eSlams board material SkSL program failed to compile.");
  return effect;
})();

const MIN_TEXT_VIEWPORT_EDGE = 96;

// Worklets are dependency-first because workletized functions are intentionally not hoisted.


function clampAlpha(value: number): number {
  "worklet";
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
}


function paintForStyle(style: DrawStyle, glowPass = false): SkPaint {
  "worklet";
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setDither(true);
  paint.setColor(Skia.Color(style.color));
  paint.setAlphaf(clampAlpha(glowPass ? (style.alpha ?? 1) * 0.62 : style.alpha ?? 1));
  paint.setStyle(style.mode === "stroke" ? PaintStyle.Stroke : PaintStyle.Fill);
  paint.setStrokeWidth(Math.max(0.5, style.strokeWidth ?? 1));
  if (glowPass) paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 8, true));
  return paint;
}

function colorFloats(color: string): readonly [number, number, number, number] {
  "worklet";
  const match = /^#([0-9a-f]{6})([0-9a-f]{2})?$/iu.exec(color);
  if (!match?.[1]) return [0, 0, 0, 1];
  const rgb = match[1];
  const alpha = match[2] ? Number.parseInt(match[2], 16) / 255 : 1;
  return [
    Number.parseInt(rgb.slice(0, 2), 16) / 255,
    Number.parseInt(rgb.slice(2, 4), 16) / 255,
    Number.parseInt(rgb.slice(4, 6), 16) / 255,
    alpha,
  ];
}

function surfaceIndex(surface: BoardSurface): number {
  "worklet";
  switch (surface) {
    case "flat": return 0;
    case "wood": return 1;
    case "felt": return 2;
    case "phosphor": return 3;
    case "glass": return 4;
    case "void": return 5;
  }
}

function toSkRect(rect: Rect) {
  "worklet";
  return Skia.XYWHRect(rect.x, rect.y, rect.width, rect.height);
}

function drawMaterial(canvas: SkCanvas, material: MaterialLayer): void {
  "worklet";
  const paint = paintForStyle({ color: material.baseColor });
  const uniforms = [
    material.rect.width,
    material.rect.height,
    ...colorFloats(material.baseColor),
    ...colorFloats(material.accentColor),
    material.detail,
    surfaceIndex(material.surface),
    material.phase,
  ];
  paint.setShader(compiledMaterialEffect.makeShader(uniforms));
  canvas.drawRect(toSkRect(material.rect), paint);
}

function drawCommand(
  canvas: SkCanvas,
  command: RenderCommand,
  glowPass: boolean,
  typeface?: SkTypeface,
): void {
  "worklet";
  const paint = paintForStyle(command.style, glowPass);
  switch (command.kind) {
    case "rect":
      canvas.drawRect(toSkRect(command.rect), paint);
      return;
    case "rounded-rect":
      canvas.drawRRect(Skia.RRectXY(toSkRect(command.rect), command.radius, command.radius), paint);
      return;
    case "circle":
      canvas.drawCircle(command.center.x, command.center.y, command.radius, paint);
      return;
    case "line":
      canvas.drawLine(command.from.x, command.from.y, command.to.x, command.to.y, paint);
      return;
    case "arc":
      canvas.drawArc(toSkRect(command.rect), command.startDegrees, command.sweepDegrees, command.useCenter, paint);
      return;
    case "polygon": {
      const first = command.points[0];
      if (!first) return;
      const builder = Skia.PathBuilder.Make();
      builder.moveTo(first.x, first.y);
      for (const point of command.points.slice(1)) builder.lineTo(point.x, point.y);
      if (command.closed) builder.close();
      const path = builder.detach();
      canvas.drawPath(path, paint);
      path.dispose();
      builder.dispose();
      return;
    }
    case "text": {
      if (glowPass) return;
      const font = Skia.Font(typeface, command.size);
      canvas.drawText(command.text, command.at.x, command.at.y, paint, font);
      font.dispose();
      return;
    }
  }
}

export function drawRenderPlan(canvas: SkCanvas, plan: RenderPlan, typeface?: SkTypeface): void {
  "worklet";
  drawMaterial(canvas, plan.material);
  for (const command of plan.commands) {
    if (command.kind === "text"
      && Math.min(plan.viewport.width, plan.viewport.height) < MIN_TEXT_VIEWPORT_EDGE) continue;
    if (command.style.glow) drawCommand(canvas, command, true, typeface);
    drawCommand(canvas, command, false, typeface);
  }
}
