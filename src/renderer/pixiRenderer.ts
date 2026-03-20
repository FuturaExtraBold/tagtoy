import { Graphics } from "pixi.js";

import type { GradientMode, RenderConfig, Stroke } from "../types/drawing";
import { drawBlobBrush, drawBrush, drawGradientBrush } from "./brushStrokes";
import {
  getBoundsFromPoints,
  getDrawingBounds,
  seededRand,
  shadowCoords,
} from "./renderHelpers";

function drawDrips(
  g: Graphics,
  points: Stroke["points"],
  lineWidth: number,
  color: string,
  seed: number,
  dripCount: number,
  offsetX = 0,
  offsetY = 0,
): void {
  if (points.length < 2) return;
  const rand = seededRand(seed);
  for (let i = 0; i < dripCount; i++) {
    const idx = Math.floor(rand() * points.length);
    const p = points[idx];
    const dripWidth = Math.max(1, lineWidth * (0.04 + rand() * 0.06));
    const dripLength = lineWidth * (0.18 + rand() * 0.55);
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
  s: Stroke,
  lineWidth: number,
  brushType: RenderConfig["brushType"],
  sx: number,
  sy: number,
  shadowColor: string,
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
      drawBlobBrush(g, s.points, lineWidth, shadowColor, sx * t, sy * t);
    } else {
      drawBrush(
        g,
        s.points,
        lineWidth,
        brushType,
        shadowColor,
        pressureSensitivity,
        sensitivity,
        sx * t,
        sy * t,
      );
    }
  }
}

export function renderTag(
  g: Graphics,
  strokes: Stroke[],
  config: RenderConfig,
): void {
  const {
    brushSize,
    brushType,
    showOverspray,
    oversprayAmount,
    pressureSensitivity,
    sensitivity,
  } = config;
  for (const s of strokes) {
    if (s.points.length < 2) continue;
    const seed = Math.round(s.points[0].x * 7 + s.points[0].y * 13);
    drawBrush(
      g,
      s.points,
      brushSize,
      brushType,
      "#000000",
      pressureSensitivity,
      sensitivity,
    );
    if (showOverspray)
      drawOverspray(g, s.points, brushSize, oversprayAmount, seed);
  }
}

export function renderThrowup(
  g: Graphics,
  strokes: Stroke[],
  config: RenderConfig,
): void {
  if (!strokes.length) return;
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
    showOverspray,
    oversprayAmount,
    pressureSensitivity,
    sensitivity,
  } = config;
  const [sx, sy] = shadowCoords(config);

  const reversed = [...strokes].reverse();
  for (const s of reversed) {
    if (s.points.length < 2) continue;
    const seed = Math.round(s.points[0].x * 7 + s.points[0].y * 13);

    if (showDrips) {
      drawDrips(g, s.points, outlineSize, shadowColor, seed, dripCount, sx, sy);
    }

    if (shadowAttached && shadowOffset > 0) {
      drawExtrusion(
        g,
        s,
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
      drawBlobBrush(g, s.points, outlineSize, shadowColor, sx, sy);
    }

    drawBlobBrush(g, s.points, outlineSize, outlineColor);
    if (showOverspray)
      drawOverspray(g, s.points, outlineSize, oversprayAmount, seed);

    drawBlobBrush(g, s.points, brushSize, throwupColor);
    if (showOverspray)
      drawOverspray(g, s.points, brushSize, oversprayAmount, seed + 100);
  }
}

export function renderBurner(
  g: Graphics,
  strokes: Stroke[],
  gradientMode: GradientMode,
  config: RenderConfig,
): void {
  if (!strokes.length) return;
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
    showOverspray,
    oversprayAmount,
    pressureSensitivity,
    sensitivity,
  } = config;
  const [sx, sy] = shadowCoords(config);
  const pad = Math.max(brushSize, outlineSize) / 2;

  const shadow = (s: Stroke) => {
    if (shadowAttached && shadowOffset > 0) {
      drawExtrusion(
        g,
        s,
        outlineSize,
        brushType,
        sx,
        sy,
        shadowColor,
        pressureSensitivity,
        sensitivity,
        false,
      );
    } else if (shadowOffset > 0) {
      drawBrush(
        g,
        s.points,
        outlineSize,
        brushType,
        shadowColor,
        pressureSensitivity,
        sensitivity,
        sx,
        sy,
      );
    }
  };

  const outline = (s: Stroke, seed: number) => {
    drawBrush(
      g,
      s.points,
      outlineSize,
      brushType,
      outlineColor,
      pressureSensitivity,
      sensitivity,
    );
    if (showOverspray)
      drawOverspray(g, s.points, outlineSize, oversprayAmount, seed);
  };

  const fill = (
    s: Stroke,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    seed: number,
  ) => {
    drawGradientBrush(
      g,
      s.points,
      brushSize,
      brushType,
      bounds.minY,
      bounds.maxY,
      gradientStart,
      gradientEnd,
      pressureSensitivity,
      sensitivity,
    );
    if (showOverspray)
      drawOverspray(g, s.points, brushSize, oversprayAmount, seed + 100);
  };

  const drips = (s: Stroke, seed: number) => {
    if (!showDrips) return;
    drawDrips(g, s.points, outlineSize, shadowColor, seed, dripCount, sx, sy);
  };

  if (gradientMode === "overlay") {
    for (const s of strokes) {
      if (s.points.length < 2) continue;
      const seed = Math.round(s.points[0].x * 7 + s.points[0].y * 13);
      drips(s, seed);
      shadow(s);
      outline(s, seed);
      fill(s, getBoundsFromPoints(s.points, pad), seed);
    }
  } else {
    const db = getDrawingBounds(strokes, pad);
    for (const s of strokes) {
      if (s.points.length < 2) continue;
      drips(s, Math.round(s.points[0].x * 7 + s.points[0].y * 13));
    }
    for (const s of strokes) {
      if (s.points.length < 2) continue;
      shadow(s);
    }
    for (const s of strokes) {
      if (s.points.length < 2) continue;
      outline(s, Math.round(s.points[0].x * 7 + s.points[0].y * 13));
    }
    for (const s of strokes) {
      if (s.points.length < 2) continue;
      fill(s, db, Math.round(s.points[0].x * 7 + s.points[0].y * 13));
    }
  }
}
