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
}

function seedForStroke(stroke: Stroke): number {
  return Math.round(stroke.points[0].x * 7 + stroke.points[0].y * 13);
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

function drawAccentTexture(
  g: Graphics,
  points: Stroke["points"],
  lineWidth: number,
  amount: number,
  sizeScale: number,
  color: string,
  seed: number,
  minSpread: number,
  maxSpread: number,
  minSize: number,
  maxSize: number,
  offsetX = 0,
  offsetY = 0,
): void {
  if (points.length < 2 || amount <= 0) return;
  const rand = seededRand(seed);
  const step = Math.max(1, Math.floor(points.length / 22));

  for (let i = 0; i < points.length; i += step) {
    const p = points[i];
    const splats = Math.max(1, Math.floor((1.5 + rand() * 3.5) * amount));
    for (let j = 0; j < splats; j++) {
      const angle = rand() * Math.PI * 2;
      const dist =
        lineWidth * (minSpread + rand() * (maxSpread - minSpread));
      const size =
        (minSize + rand() * (maxSize - minSize)) * amount * sizeScale;
      g.circle(
        p.x + offsetX + Math.cos(angle) * dist,
        p.y + offsetY + Math.sin(angle) * dist,
        size,
      ).fill({ color });
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
  const dist = Math.hypot(sx, sy);
  if (dist < 1) return;

  const stepSize = Math.max(1, lineWidth * 0.4);
  const steps = Math.ceil(dist / stepSize);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (blob) {
      drawBlobBrush(g, stroke.points, lineWidth, color, sx * t, sy * t);
    } else {
      drawBrush(
        g,
        stroke.points,
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
    if (stroke.points.length < 2) continue;
    const seed = seedForStroke(stroke);
    drawBrush(
      g,
      stroke.points,
      brushSize,
      brushType,
      "#000000",
      pressureSensitivity,
      sensitivity,
    );
    if (showOverspray) {
      drawOverspray(g, stroke.points, brushSize, oversprayAmount, seed);
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
    showInnerAccent,
    innerAccentAmount,
    innerAccentSize,
    innerAccentColor,
    showBackAccent,
    backAccentAmount,
    backAccentSize,
    backAccentColor,
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
      stroke.points,
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

  if (showBackAccent && backAccentAmount > 0 && shadowOffset > 0) {
    const accent = new Graphics();
    drawAccentTexture(
      accent,
      stroke.points,
      outlineSize,
      backAccentAmount,
      backAccentSize,
      backAccentColor,
      seed ^ 0xa11ce,
      0.42,
      0.92,
      0.45,
      1.4,
      sx,
      sy,
    );
    container.addChild(accent);
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
    drawBlobBrush(shadow, stroke.points, outlineSize, shadowColor, sx, sy);
  }
  container.addChild(shadow);

  const outline = new Graphics();
  drawBlobBrush(outline, stroke.points, outlineSize, outlineColor);
  container.addChild(outline);

  const fill = new Graphics();
  drawBlobBrush(fill, stroke.points, brushSize, throwupColor);
  container.addChild(fill);

  if (showInnerAccent && innerAccentAmount > 0) {
    const accent = new Graphics();
    drawAccentTexture(
      accent,
      stroke.points,
      brushSize,
      innerAccentAmount,
      innerAccentSize,
      innerAccentColor,
      seed ^ 0x1aacce,
      0.02,
      0.32,
      0.35,
      1.1,
    );
    const mask = new Graphics();
    drawBlobBrush(mask, stroke.points, brushSize, "#ffffff");
    clearMaskedLayer(container, accent, mask);
  }

  return container;
}

function createThrowupDisplay(
  strokes: Stroke[],
  config: RenderConfig,
  options: RenderOptions,
): Container {
  const container = new Container();

  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
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
    showInnerAccent,
    innerAccentAmount,
    innerAccentSize,
    innerAccentColor,
    showBackAccent,
    backAccentAmount,
    backAccentSize,
    backAccentColor,
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
      stroke.points,
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

  if (showBackAccent && backAccentAmount > 0 && shadowOffset > 0) {
    const accent = new Graphics();
    drawAccentTexture(
      accent,
      stroke.points,
      outlineSize,
      backAccentAmount,
      backAccentSize,
      backAccentColor,
      seed ^ 0xbacc,
      0.42,
      1,
      0.45,
      1.5,
      sx,
      sy,
    );
    container.addChild(accent);
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
      stroke.points,
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
    stroke.points,
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
    stroke.points,
    brushSize,
    brushType,
    "#ffffff",
    pressureSensitivity,
    sensitivity,
  );
  const fill = createVerticalGradientField(bounds, gradientStart, gradientEnd);
  clearMaskedLayer(container, fill, fillMask);

  if (showInnerAccent && innerAccentAmount > 0) {
    const accent = new Graphics();
    drawAccentTexture(
      accent,
      stroke.points,
      brushSize,
      innerAccentAmount,
      innerAccentSize,
      innerAccentColor,
      seed ^ 0xacce17,
      0.01,
      0.28,
      0.3,
      0.95,
    );
    const mask = new Graphics();
    drawBrush(
      mask,
      stroke.points,
      brushSize,
      brushType,
      "#ffffff",
      pressureSensitivity,
      sensitivity,
    );
    clearMaskedLayer(container, accent, mask);
  }

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
    showInnerAccent,
    innerAccentAmount,
    innerAccentSize,
    innerAccentColor,
    showBackAccent,
    backAccentAmount,
    backAccentSize,
    backAccentColor,
    pressureSensitivity,
    sensitivity,
  } = config;

  const [sx, sy] = shadowCoords(config);
  const pad = Math.max(brushSize, outlineSize) / 2;
  const bounds = getDrawingBounds(strokes, pad);
  const dripProgress = options.dripProgress ?? 1;
  const includeDrips = options.includeDrips ?? true;

  if (includeDrips && showDrips) {
    const drips = new Graphics();
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      drawDrips(
        drips,
        stroke.points,
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

  if (showBackAccent && backAccentAmount > 0 && shadowOffset > 0) {
    const accent = new Graphics();

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      const seed = seedForStroke(stroke);
      drawAccentTexture(
        accent,
        stroke.points,
        outlineSize,
        backAccentAmount,
        backAccentSize,
        backAccentColor,
        seed ^ 0xbacc,
        0.42,
        1,
        0.45,
        1.5,
        sx,
        sy,
      );
    }

    container.addChild(accent);
  }

  const shadow = new Graphics();
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
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
        stroke.points,
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
    if (stroke.points.length < 2) continue;
    drawBrush(
      outline,
      stroke.points,
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
    if (stroke.points.length < 2) continue;
    drawBrush(
      fillMask,
      stroke.points,
      brushSize,
      brushType,
      "#ffffff",
      pressureSensitivity,
      sensitivity,
    );
  }
  const fill = createVerticalGradientField(bounds, gradientStart, gradientEnd);
  clearMaskedLayer(container, fill, fillMask);

  if (showInnerAccent && innerAccentAmount > 0) {
    const accent = new Graphics();
    const mask = new Graphics();

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      drawAccentTexture(
        accent,
        stroke.points,
        brushSize,
        innerAccentAmount,
        innerAccentSize,
        innerAccentColor,
        seedForStroke(stroke) ^ 0xacce17,
        0.01,
        0.28,
        0.3,
        0.95,
      );
      drawBrush(
        mask,
        stroke.points,
        brushSize,
        brushType,
        "#ffffff",
        pressureSensitivity,
        sensitivity,
      );
    }

    clearMaskedLayer(container, accent, mask);
  }

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
    if (stroke.points.length < 2) continue;
    container.addChild(
      createBurnerStrokeDisplay(
        stroke,
        config,
        getBoundsFromPoints(stroke.points, pad),
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
