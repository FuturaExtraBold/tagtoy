import type {
  GradientMode,
  RenderConfig,
  Stroke,
  StyleMode,
} from "../types/drawing";
import { drawBlobBrush, drawBrush } from "./brushStrokes";
import {
  getBoundsFromPoints,
  getDrawingBounds,
  seededRand,
  shadowCoords,
} from "./renderHelpers";

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

interface RenderOptions {
  dripProgress?: number;
  includeDrips?: boolean;
  gradientBounds?: Bounds;
  canvasSize?: { width: number; height: number };
}

function seedForStroke(stroke: Stroke): number {
  const points =
    stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
  return Math.round(points[0].x * 7 + points[0].y * 13 + stroke.id * 17);
}

function drawDrips(
  ctx: Ctx2D,
  points: Stroke["points"],
  lineWidth: number,
  color: string,
  seed: number,
  dripCount: number,
  dripProgress = 1,
  offsetX = 0,
  offsetY = 0,
): void {
  if (points.length < 2 || dripProgress <= 0) return;
  const rand = seededRand(seed);
  const easedProgress =
    1 - Math.pow(1 - Math.max(0, Math.min(1, dripProgress)), 3);
  const activeDrips = Math.max(1, Math.ceil(dripCount * easedProgress));

  for (let i = 0; i < activeDrips; i++) {
    const idx = Math.floor(rand() * points.length);
    const p = points[idx];
    const dripWidth = Math.max(1, lineWidth * (0.04 + rand() * 0.06));
    const dripLength = lineWidth * (0.18 + rand() * 0.55) * easedProgress;
    ctx.beginPath();
    ctx.moveTo(p.x + offsetX, p.y + lineWidth / 2 + offsetY);
    ctx.lineTo(p.x + offsetX, p.y + lineWidth / 2 + dripLength + offsetY);
    ctx.strokeStyle = color;
    ctx.lineWidth = dripWidth;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

function drawExtrusion(
  ctx: Ctx2D,
  stroke: Stroke,
  lineWidth: number,
  brushType: RenderConfig["brushType"],
  sx: number,
  sy: number,
  color: string,
  pressureSensitivity: boolean,
  sensitivity: number,
  blob = false,
): void {
  const points =
    stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
  const dist = Math.hypot(sx, sy);
  if (dist < 1) return;

  const stepSize = Math.max(1, lineWidth * 0.4);
  const steps = Math.ceil(dist / stepSize);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (blob) {
      drawBlobBrush(ctx, points, lineWidth, color, sx * t, sy * t);
    } else {
      drawBrush(
        ctx,
        points,
        lineWidth,
        brushType,
        color,
        pressureSensitivity,
        sensitivity,
        sx * t,
        sy * t,
      );
    }
  }
}

function renderGradientFill(
  ctx: Ctx2D,
  points: Stroke["points"],
  config: RenderConfig,
  bounds: Bounds,
  canvasSize: { width: number; height: number },
): void {
  const {
    brushSize,
    brushType,
    pressureSensitivity,
    sensitivity,
    gradientStart,
    gradientEnd,
  } = config;
  const { width, height } = canvasSize;
  const off = new OffscreenCanvas(width, height);
  const offCtx = off.getContext("2d")!;

  drawBrush(
    offCtx,
    points,
    brushSize,
    brushType,
    "#000000",
    pressureSensitivity,
    sensitivity,
  );

  offCtx.globalCompositeOperation = "source-in";
  const grad = offCtx.createLinearGradient(0, bounds.minY, 0, bounds.maxY);
  grad.addColorStop(0, gradientStart);
  grad.addColorStop(1, gradientEnd);
  offCtx.fillStyle = grad;
  offCtx.fillRect(0, 0, width, height);

  ctx.drawImage(off, 0, 0);
}

function renderTagToCtx(
  ctx: Ctx2D,
  strokes: Stroke[],
  config: RenderConfig,
): void {
  const { brushSize, brushType, pressureSensitivity, sensitivity } = config;
  for (const stroke of strokes) {
    const points =
      stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
    if (points.length < 2) continue;
    drawBrush(
      ctx,
      points,
      brushSize,
      brushType,
      "#000000",
      pressureSensitivity,
      sensitivity,
    );
  }
}

function renderThrowupStrokeToCtx(
  ctx: Ctx2D,
  stroke: Stroke,
  config: RenderConfig,
  options: RenderOptions,
): void {
  const points =
    stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
  const {
    brushSize,
    shadowOffset,
    shadowColor,
    shadowAttached,
    outlineSize,
    outlineColor,
    throwupColor,
    brushType,
    showDrips,
    dripCount,
    pressureSensitivity,
    sensitivity,
  } = config;

  const [sx, sy] = shadowCoords(config);
  const seed = seedForStroke(stroke);
  const dripProgress = options.dripProgress ?? 1;
  const includeDrips = options.includeDrips ?? true;

  if (includeDrips && showDrips) {
    drawDrips(
      ctx,
      points,
      outlineSize,
      shadowColor,
      seed,
      dripCount,
      dripProgress,
      sx,
      sy,
    );
  }

  if (shadowAttached && shadowOffset > 0) {
    drawExtrusion(
      ctx,
      stroke,
      outlineSize,
      brushType,
      sx,
      sy,
      shadowColor,
      pressureSensitivity,
      sensitivity,
      true,
    );
  } else if (shadowOffset > 0) {
    drawBlobBrush(ctx, points, outlineSize, shadowColor, sx, sy);
  }

  drawBlobBrush(ctx, points, outlineSize, outlineColor);
  drawBlobBrush(ctx, points, brushSize, throwupColor);
}

function renderThrowupToCtx(
  ctx: Ctx2D,
  strokes: Stroke[],
  config: RenderConfig,
  options: RenderOptions,
): void {
  for (const stroke of strokes) {
    if (stroke.renderPoints.length < 2 && stroke.points.length < 2) continue;
    renderThrowupStrokeToCtx(ctx, stroke, config, options);
  }
}

function renderBurnerStrokeToCtx(
  ctx: Ctx2D,
  stroke: Stroke,
  config: RenderConfig,
  bounds: Bounds,
  options: RenderOptions,
): void {
  const points =
    stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
  const {
    brushSize,
    shadowOffset,
    shadowColor,
    shadowAttached,
    outlineSize,
    outlineColor,
    brushType,
    showDrips,
    dripCount,
    pressureSensitivity,
    sensitivity,
  } = config;
  // When there is no outline, the shadow should match the fill brush size.
  const shadowSize = outlineSize || brushSize;

  const [sx, sy] = shadowCoords(config);
  const seed = seedForStroke(stroke);
  const dripProgress = options.dripProgress ?? 1;
  const includeDrips = options.includeDrips ?? true;

  if (includeDrips && showDrips) {
    drawDrips(
      ctx,
      points,
      shadowSize,
      shadowColor,
      seed,
      dripCount,
      dripProgress,
      sx,
      sy,
    );
  }

  if (shadowAttached && shadowOffset > 0) {
    drawExtrusion(
      ctx,
      stroke,
      shadowSize,
      brushType,
      sx,
      sy,
      shadowColor,
      pressureSensitivity,
      sensitivity,
    );
  } else if (shadowOffset > 0) {
    drawBrush(
      ctx,
      points,
      shadowSize,
      brushType,
      shadowColor,
      pressureSensitivity,
      sensitivity,
      sx,
      sy,
    );
  }

  drawBrush(
    ctx,
    points,
    outlineSize,
    brushType,
    outlineColor,
    pressureSensitivity,
    sensitivity,
  );

  if (options.canvasSize) {
    renderGradientFill(ctx, points, config, bounds, options.canvasSize);
  }
}

function renderBurnerCombinedToCtx(
  ctx: Ctx2D,
  strokes: Stroke[],
  config: RenderConfig,
  options: RenderOptions,
): void {
  const {
    brushSize,
    shadowOffset,
    shadowColor,
    shadowAttached,
    outlineSize,
    outlineColor,
    brushType,
    showDrips,
    dripCount,
    pressureSensitivity,
    sensitivity,
    gradientStart,
    gradientEnd,
  } = config;

  // When there is no outline, the shadow should match the fill brush size.
  const shadowSize = outlineSize || brushSize;

  const [sx, sy] = shadowCoords(config);
  const pad = Math.max(brushSize, outlineSize) / 2;
  const bounds = options.gradientBounds ?? getDrawingBounds(strokes, pad);
  const dripProgress = options.dripProgress ?? 1;
  const includeDrips = options.includeDrips ?? true;

  if (includeDrips && showDrips) {
    for (const stroke of strokes) {
      const points =
        stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
      if (points.length < 2) continue;
      drawDrips(
        ctx,
        points,
        shadowSize,
        shadowColor,
        seedForStroke(stroke),
        dripCount,
        dripProgress,
        sx,
        sy,
      );
    }
  }

  for (const stroke of strokes) {
    const points =
      stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
    if (points.length < 2) continue;
    if (shadowAttached && shadowOffset > 0) {
      drawExtrusion(
        ctx,
        stroke,
        shadowSize,
        brushType,
        sx,
        sy,
        shadowColor,
        pressureSensitivity,
        sensitivity,
      );
    } else if (shadowOffset > 0) {
      drawBrush(
        ctx,
        points,
        shadowSize,
        brushType,
        shadowColor,
        pressureSensitivity,
        sensitivity,
        sx,
        sy,
      );
    }
  }

  for (const stroke of strokes) {
    const points =
      stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
    if (points.length < 2) continue;
    drawBrush(
      ctx,
      points,
      outlineSize,
      brushType,
      outlineColor,
      pressureSensitivity,
      sensitivity,
    );
  }

  if (options.canvasSize) {
    const { width, height } = options.canvasSize;
    const off = new OffscreenCanvas(width, height);
    const offCtx = off.getContext("2d")!;

    for (const stroke of strokes) {
      const points =
        stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
      if (points.length < 2) continue;
      drawBrush(
        offCtx,
        points,
        brushSize,
        brushType,
        "#000000",
        pressureSensitivity,
        sensitivity,
      );
    }

    offCtx.globalCompositeOperation = "source-in";
    const grad = offCtx.createLinearGradient(0, bounds.minY, 0, bounds.maxY);
    grad.addColorStop(0, gradientStart);
    grad.addColorStop(1, gradientEnd);
    offCtx.fillStyle = grad;
    offCtx.fillRect(0, 0, width, height);

    ctx.drawImage(off, 0, 0);
  }
}

function renderBurnerToCtx(
  ctx: Ctx2D,
  strokes: Stroke[],
  gradientMode: GradientMode,
  config: RenderConfig,
  options: RenderOptions,
): void {
  if (gradientMode === "combined") {
    renderBurnerCombinedToCtx(ctx, strokes, config, options);
    return;
  }

  const pad = Math.max(config.brushSize, config.outlineSize) / 2;
  for (const stroke of strokes) {
    const points =
      stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
    if (points.length < 2) continue;
    renderBurnerStrokeToCtx(
      ctx,
      stroke,
      config,
      getBoundsFromPoints(points, pad),
      options,
    );
  }
}

export function renderStyleToCtx(
  ctx: Ctx2D,
  style: StyleMode,
  strokes: Stroke[],
  gradientMode: GradientMode,
  config: RenderConfig,
  options: RenderOptions = {},
): void {
  if (style === "tag") {
    renderTagToCtx(ctx, strokes, config);
    return;
  }

  if (style === "throwup") {
    renderThrowupToCtx(ctx, strokes, config, options);
    return;
  }

  // wildstyle always uses combined gradient mode
  const effectiveGradientMode =
    style === "wildstyle" ? "combined" : gradientMode;
  renderBurnerToCtx(ctx, strokes, effectiveGradientMode, config, options);
}
