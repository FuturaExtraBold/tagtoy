import { Container, Graphics } from "pixi.js";

import type {
  GradientMode,
  RenderConfig,
  Stroke,
  StyleMode,
} from "../types/drawing";
import { drawBlobBrush, drawBrush } from "./brushStrokes";
import {
  blendHex,
  getBoundsFromPoints,
  getDrawingBounds,
  seededRand,
  shadowCoords,
} from "./renderHelpers";

interface RenderOptions {
  dripProgress?: number;
  includeDrips?: boolean;
  gradientBounds?: { minX: number; minY: number; maxX: number; maxY: number };
}

function seedForStroke(stroke: Stroke): number {
  const points =
    stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
  return Math.round(points[0].x * 7 + points[0].y * 13 + stroke.id * 17);
}

function drawDrips(
  g: Graphics,
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
  const activeDrips = Math.max(1, Math.ceil(dripCount * dripProgress));

  for (let i = 0; i < activeDrips; i++) {
    const idx = Math.floor(rand() * points.length);
    const p = points[idx];
    const dripWidth = Math.max(1, lineWidth * (0.04 + rand() * 0.06));
    const dripLength = lineWidth * (0.18 + rand() * 0.55) * dripProgress;
    g.moveTo(p.x + offsetX, p.y + lineWidth / 2 + offsetY)
      .lineTo(p.x + offsetX, p.y + lineWidth / 2 + dripLength + offsetY)
      .stroke({ width: dripWidth, color, cap: "round" });
  }
}

function drawOverspray(
  g: Graphics,
  points: Stroke["points"],
  lineWidth: number,
  oversprayAmount: number,
  seed: number,
): void {
  const rand = seededRand(seed ^ 0xdeadbeef);
  const step = Math.max(1, Math.floor(points.length / 24));
  for (let i = 0; i < points.length; i += step) {
    const p = points[i];
    const splats = Math.floor((3 + rand() * 5) * Math.sqrt(oversprayAmount));
    for (let j = 0; j < splats; j++) {
      const angle = rand() * Math.PI * 2;
      const dist = lineWidth * 0.5 + rand() * lineWidth * 0.2 * oversprayAmount;
      const size = (0.4 + rand() * 1.8) * oversprayAmount;
      const alpha = 0.07 + rand() * 0.18;
      g.circle(
        p.x + Math.cos(angle) * dist,
        p.y + Math.sin(angle) * dist,
        size,
      ).fill({ color: 0x000000, alpha });
    }
  }
}

function drawExtrusion(
  g: Graphics,
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
      drawBlobBrush(g, points, lineWidth, color, sx * t, sy * t);
    } else {
      drawBrush(
        g,
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

function clearMaskedLayer(
  container: Container,
  accent: Graphics,
  mask: Graphics,
): void {
  accent.mask = mask;
  container.addChild(accent);
  container.addChild(mask);
}

function createVerticalGradientField(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  startColor: string,
  endColor: string,
  steps = 96,
): Graphics {
  const gradient = new Graphics();
  const width = bounds.maxX - bounds.minX;
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const stepHeight = height / steps;

  for (let i = 0; i < steps; i++) {
    const y = bounds.minY + stepHeight * i;
    const t = steps === 1 ? 0 : i / (steps - 1);
    gradient
      .rect(bounds.minX, y, width, stepHeight + 1)
      .fill({ color: blendHex(startColor, endColor, t) });
  }

  return gradient;
}

function createTagDisplay(strokes: Stroke[], config: RenderConfig): Container {
  const container = new Container();
  const g = new Graphics();
  const {
    brushSize,
    brushType,
    showOverspray,
    oversprayAmount,
    pressureSensitivity,
    sensitivity,
  } = config;

  for (const stroke of strokes) {
    const points =
      stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
    if (points.length < 2) continue;
    const seed = seedForStroke(stroke);
    drawBrush(
      g,
      points,
      brushSize,
      brushType,
      "#000000",
      pressureSensitivity,
      sensitivity,
    );
    if (showOverspray) {
      drawOverspray(g, points, brushSize, oversprayAmount, seed);
    }
  }

  container.addChild(g);
  return container;
}

function createThrowupStrokeDisplay(
  stroke: Stroke,
  config: RenderConfig,
  options: RenderOptions,
): Container {
  const container = new Container();
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
    const drips = new Graphics();
    drawDrips(
      drips,
      points,
      outlineSize,
      shadowColor,
      seed,
      dripCount,
      dripProgress,
      sx,
      sy,
    );
    container.addChild(drips);
  }

  const shadow = new Graphics();
  if (shadowAttached && shadowOffset > 0) {
    drawExtrusion(
      shadow,
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
    drawBlobBrush(shadow, points, outlineSize, shadowColor, sx, sy);
  }
  container.addChild(shadow);

  const outline = new Graphics();
  drawBlobBrush(outline, points, outlineSize, outlineColor);
  container.addChild(outline);

  const fill = new Graphics();
  drawBlobBrush(fill, points, brushSize, throwupColor);
  container.addChild(fill);

  return container;
}

function createThrowupDisplay(
  strokes: Stroke[],
  config: RenderConfig,
  options: RenderOptions,
): Container {
  const container = new Container();

  for (const stroke of strokes) {
    if (stroke.renderPoints.length < 2 && stroke.points.length < 2) continue;
    container.addChild(createThrowupStrokeDisplay(stroke, config, options));
  }

  return container;
}

function createBurnerStrokeDisplay(
  stroke: Stroke,
  config: RenderConfig,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  options: RenderOptions,
): Container {
  const container = new Container();
  const points =
    stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
  const {
    brushSize,
    shadowOffset,
    shadowColor,
    shadowAttached,
    outlineSize,
    outlineColor,
    gradientStart,
    gradientEnd,
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
    const drips = new Graphics();
    drawDrips(
      drips,
      points,
      outlineSize,
      shadowColor,
      seed,
      dripCount,
      dripProgress,
      sx,
      sy,
    );
    container.addChild(drips);
  }

  const shadow = new Graphics();
  if (shadowAttached && shadowOffset > 0) {
    drawExtrusion(
      shadow,
      stroke,
      outlineSize,
      brushType,
      sx,
      sy,
      shadowColor,
      pressureSensitivity,
      sensitivity,
    );
  } else if (shadowOffset > 0) {
    drawBrush(
      shadow,
      points,
      outlineSize,
      brushType,
      shadowColor,
      pressureSensitivity,
      sensitivity,
      sx,
      sy,
    );
  }
  container.addChild(shadow);

  const outline = new Graphics();
  drawBrush(
    outline,
    points,
    outlineSize,
    brushType,
    outlineColor,
    pressureSensitivity,
    sensitivity,
  );
  container.addChild(outline);

  const fillMask = new Graphics();
  drawBrush(
    fillMask,
    points,
    brushSize,
    brushType,
    "#ffffff",
    pressureSensitivity,
    sensitivity,
  );
  const fill = createVerticalGradientField(bounds, gradientStart, gradientEnd);
  clearMaskedLayer(container, fill, fillMask);

  return container;
}

function createBurnerCombinedDisplay(
  strokes: Stroke[],
  config: RenderConfig,
  options: RenderOptions,
): Container {
  const container = new Container();
  const {
    brushSize,
    shadowOffset,
    shadowColor,
    shadowAttached,
    outlineSize,
    outlineColor,
    gradientStart,
    gradientEnd,
    brushType,
    showDrips,
    dripCount,
    pressureSensitivity,
    sensitivity,
  } = config;

  const [sx, sy] = shadowCoords(config);
  const pad = Math.max(brushSize, outlineSize) / 2;
  const bounds = options.gradientBounds ?? getDrawingBounds(strokes, pad);
  const dripProgress = options.dripProgress ?? 1;
  const includeDrips = options.includeDrips ?? true;

  if (includeDrips && showDrips) {
    const drips = new Graphics();
    for (const stroke of strokes) {
      const points =
        stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
      if (points.length < 2) continue;
      drawDrips(
        drips,
        points,
        outlineSize,
        shadowColor,
        seedForStroke(stroke),
        dripCount,
        dripProgress,
        sx,
        sy,
      );
    }
    container.addChild(drips);
  }

  const shadow = new Graphics();
  for (const stroke of strokes) {
    const points =
      stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
    if (points.length < 2) continue;
    if (shadowAttached && shadowOffset > 0) {
      drawExtrusion(
        shadow,
        stroke,
        outlineSize,
        brushType,
        sx,
        sy,
        shadowColor,
        pressureSensitivity,
        sensitivity,
      );
    } else if (shadowOffset > 0) {
      drawBrush(
        shadow,
        points,
        outlineSize,
        brushType,
        shadowColor,
        pressureSensitivity,
        sensitivity,
        sx,
        sy,
      );
    }
  }
  container.addChild(shadow);

  const outline = new Graphics();
  for (const stroke of strokes) {
    const points =
      stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
    if (points.length < 2) continue;
    drawBrush(
      outline,
      points,
      outlineSize,
      brushType,
      outlineColor,
      pressureSensitivity,
      sensitivity,
    );
  }
  container.addChild(outline);

  const fillMask = new Graphics();
  for (const stroke of strokes) {
    const points =
      stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
    if (points.length < 2) continue;
    drawBrush(
      fillMask,
      points,
      brushSize,
      brushType,
      "#ffffff",
      pressureSensitivity,
      sensitivity,
    );
  }
  const fill = createVerticalGradientField(bounds, gradientStart, gradientEnd);
  clearMaskedLayer(container, fill, fillMask);

  return container;
}

function createBurnerDisplay(
  strokes: Stroke[],
  gradientMode: GradientMode,
  config: RenderConfig,
  options: RenderOptions,
): Container {
  if (gradientMode === "combined") {
    return createBurnerCombinedDisplay(strokes, config, options);
  }

  const container = new Container();
  const pad = Math.max(config.brushSize, config.outlineSize) / 2;

  for (const stroke of strokes) {
    const points =
      stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
    if (points.length < 2) continue;
    container.addChild(
      createBurnerStrokeDisplay(
        stroke,
        config,
        getBoundsFromPoints(points, pad),
        options,
      ),
    );
  }

  return container;
}

export function createStyleDisplay(
  style: StyleMode,
  strokes: Stroke[],
  gradientMode: GradientMode,
  config: RenderConfig,
  options: RenderOptions = {},
): Container {
  if (style === "tag") {
    return createTagDisplay(strokes, config);
  }

  if (style === "throwup") {
    return createThrowupDisplay(strokes, config, options);
  }

  return createBurnerDisplay(strokes, gradientMode, config, options);
}
