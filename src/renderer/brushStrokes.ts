import { Graphics } from "pixi.js";

import type { BrushType, Point } from "../types/drawing";
import { blendHex } from "./renderHelpers";

function smoothPoints(points: Point[], iterations = 2): Point[] {
  let pts = points;
  for (let iter = 0; iter < iterations; iter++) {
    const out: Point[] = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      out.push({
        x: (pts[i - 1].x + pts[i].x * 2 + pts[i + 1].x) / 4,
        y: (pts[i - 1].y + pts[i].y * 2 + pts[i + 1].y) / 4,
        pressure: pts[i].pressure,
      });
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

function np(
  p: Point,
  pressureSensitivity: boolean,
  sensitivity: number,
): number {
  if (!pressureSensitivity) return 1.0;
  const raw = Math.pow(Math.min(1, p.pressure || 0), 0.6);
  const minWidth = 1 - sensitivity / 10;
  return minWidth + (1 - minWidth) * raw;
}

function drawRound(
  g: Graphics,
  points: Point[],
  lineWidth: number,
  color: string | number,
  pressureSensitivity: boolean,
  sensitivity: number,
  offsetX = 0,
  offsetY = 0,
): void {
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i],
      p1 = points[i + 1];
    const pressure =
      (np(p0, pressureSensitivity, sensitivity) +
        np(p1, pressureSensitivity, sensitivity)) /
      2;
    const w = Math.max(1, lineWidth * pressure);
    const fromX = (i > 0 ? (points[i - 1].x + p0.x) / 2 : p0.x) + offsetX;
    const fromY = (i > 0 ? (points[i - 1].y + p0.y) / 2 : p0.y) + offsetY;
    const toX = (p0.x + p1.x) / 2 + offsetX;
    const toY = (p0.y + p1.y) / 2 + offsetY;
    g.moveTo(fromX, fromY)
      .quadraticCurveTo(p0.x + offsetX, p0.y + offsetY, toX, toY)
      .stroke({ width: w, color, cap: "round", join: "round" });
  }
}

function drawSquare(
  g: Graphics,
  points: Point[],
  lineWidth: number,
  color: string | number,
  pressureSensitivity: boolean,
  sensitivity: number,
  offsetX = 0,
  offsetY = 0,
): void {
  const avgPressure =
    points.reduce((s, p) => s + np(p, pressureSensitivity, sensitivity), 0) /
    points.length;
  const w = Math.max(1, lineWidth * avgPressure);
  g.moveTo(points[0].x + offsetX, points[0].y + offsetY);
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2 + offsetX;
    const my = (points[i].y + points[i + 1].y) / 2 + offsetY;
    g.quadraticCurveTo(points[i].x + offsetX, points[i].y + offsetY, mx, my);
  }
  g.lineTo(
    points[points.length - 1].x + offsetX,
    points[points.length - 1].y + offsetY,
  ).stroke({ width: w, color, cap: "square", join: "bevel" });
}

export function drawBlobBrush(
  g: Graphics,
  rawPoints: Point[],
  lineWidth: number,
  color: string | number,
  offsetX = 0,
  offsetY = 0,
): void {
  if (rawPoints.length < 2) return;
  const points = rawPoints.length > 4 ? smoothPoints(rawPoints) : rawPoints;
  g.moveTo(points[0].x + offsetX, points[0].y + offsetY);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i],
      p1 = points[i + 1];
    const toX = (p0.x + p1.x) / 2 + offsetX;
    const toY = (p0.y + p1.y) / 2 + offsetY;
    g.quadraticCurveTo(p0.x + offsetX, p0.y + offsetY, toX, toY);
  }
  g.lineTo(
    points[points.length - 1].x + offsetX,
    points[points.length - 1].y + offsetY,
  ).stroke({ width: lineWidth, color, cap: "round", join: "round" });
}

export function drawBrush(
  g: Graphics,
  rawPoints: Point[],
  lineWidth: number,
  brushType: BrushType,
  color: string | number,
  pressureSensitivity = false,
  sensitivity = 10,
  offsetX = 0,
  offsetY = 0,
): void {
  if (rawPoints.length < 2) return;
  const points = rawPoints.length > 4 ? smoothPoints(rawPoints) : rawPoints;
  if (brushType === "square") {
    drawSquare(
      g,
      points,
      lineWidth,
      color,
      pressureSensitivity,
      sensitivity,
      offsetX,
      offsetY,
    );
  } else {
    drawRound(
      g,
      points,
      lineWidth,
      color,
      pressureSensitivity,
      sensitivity,
      offsetX,
      offsetY,
    );
  }
}

/**
 * Draw a brush stroke where each segment's color is sampled from a vertical
 * linear gradient. Replicates Canvas 2D `strokeStyle = gradient` behaviour:
 * the gradient is evaluated at each segment's screen-Y position, giving a
 * stable top-to-bottom colour regardless of stroke path direction.
 */
export function drawGradientBrush(
  g: Graphics,
  rawPoints: Point[],
  lineWidth: number,
  brushType: BrushType,
  boundsMinY: number,
  boundsMaxY: number,
  startColor: string,
  endColor: string,
  pressureSensitivity = false,
  sensitivity = 10,
): void {
  if (rawPoints.length < 2) return;
  const points = rawPoints.length > 4 ? smoothPoints(rawPoints) : rawPoints;
  const span = boundsMaxY - boundsMinY;

  const sample = (y: number): string => {
    const t = span > 0 ? Math.max(0, Math.min(1, (y - boundsMinY) / span)) : 0;
    return blendHex(startColor, endColor, t);
  };

  if (brushType === "square") {
    // Square draws one continuous path — use the average Y for a single colour.
    const avgY = points.reduce((s, p) => s + p.y, 0) / points.length;
    drawSquare(
      g,
      points,
      lineWidth,
      sample(avgY),
      pressureSensitivity,
      sensitivity,
    );
  } else {
    // Round draws per-segment — each segment gets its own gradient sample.
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i],
        p1 = points[i + 1];
      const midY = (p0.y + p1.y) / 2;
      const color = sample(midY);
      const pressure =
        (np(p0, pressureSensitivity, sensitivity) +
          np(p1, pressureSensitivity, sensitivity)) /
        2;
      const w = Math.max(1, lineWidth * pressure);
      const fromX = i > 0 ? (points[i - 1].x + p0.x) / 2 : p0.x;
      const fromY = i > 0 ? (points[i - 1].y + p0.y) / 2 : p0.y;
      const toX = (p0.x + p1.x) / 2;
      const toY = (p0.y + p1.y) / 2;
      g.moveTo(fromX, fromY)
        .quadraticCurveTo(p0.x, p0.y, toX, toY)
        .stroke({ width: w, color, cap: "round", join: "round" });
    }
  }
}
