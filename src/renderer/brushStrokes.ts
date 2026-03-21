import type { BrushType, Point } from "../types/drawing";

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

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
  ctx: Ctx2D,
  points: Point[],
  lineWidth: number,
  color: string | CanvasGradient,
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
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.quadraticCurveTo(p0.x + offsetX, p0.y + offsetY, toX, toY);
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

function drawSquare(
  ctx: Ctx2D,
  points: Point[],
  lineWidth: number,
  color: string | CanvasGradient,
  pressureSensitivity: boolean,
  sensitivity: number,
  offsetX = 0,
  offsetY = 0,
): void {
  const avgPressure =
    points.reduce((s, p) => s + np(p, pressureSensitivity, sensitivity), 0) /
    points.length;
  const w = Math.max(1, lineWidth * avgPressure);
  ctx.beginPath();
  ctx.moveTo(points[0].x + offsetX, points[0].y + offsetY);
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2 + offsetX;
    const my = (points[i].y + points[i + 1].y) / 2 + offsetY;
    ctx.quadraticCurveTo(points[i].x + offsetX, points[i].y + offsetY, mx, my);
  }
  ctx.lineTo(
    points[points.length - 1].x + offsetX,
    points[points.length - 1].y + offsetY,
  );
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "square";
  ctx.lineJoin = "bevel";
  ctx.stroke();
}

const NIB_ANGLE = Math.PI / 4; // 45°
const NIB_DX = Math.cos(NIB_ANGLE);
const NIB_DY = Math.sin(NIB_ANGLE);

function drawChisel(
  ctx: Ctx2D,
  points: Point[],
  lineWidth: number,
  color: string | CanvasGradient,
  pressureSensitivity: boolean,
  sensitivity: number,
  offsetX = 0,
  offsetY = 0,
): void {
  // Draw one filled quad per segment. Adjacent quads share their nib edge at
  // each shared vertex, so there are no gaps at direction changes — the
  // single-polygon approach can become self-intersecting and leave holes.
  ctx.fillStyle = color;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const h0 = Math.max(
      0.5,
      (lineWidth * 0.72 * np(p0, pressureSensitivity, sensitivity)) / 2,
    );
    const h1 = Math.max(
      0.5,
      (lineWidth * 0.72 * np(p1, pressureSensitivity, sensitivity)) / 2,
    );
    ctx.beginPath();
    ctx.moveTo(p0.x + offsetX + NIB_DX * h0, p0.y + offsetY + NIB_DY * h0);
    ctx.lineTo(p1.x + offsetX + NIB_DX * h1, p1.y + offsetY + NIB_DY * h1);
    ctx.lineTo(p1.x + offsetX - NIB_DX * h1, p1.y + offsetY - NIB_DY * h1);
    ctx.lineTo(p0.x + offsetX - NIB_DX * h0, p0.y + offsetY - NIB_DY * h0);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawBlobBrush(
  ctx: Ctx2D,
  rawPoints: Point[],
  lineWidth: number,
  color: string | CanvasGradient,
  offsetX = 0,
  offsetY = 0,
): void {
  if (rawPoints.length < 2) return;
  const points = rawPoints.length > 4 ? smoothPoints(rawPoints) : rawPoints;
  ctx.beginPath();
  ctx.moveTo(points[0].x + offsetX, points[0].y + offsetY);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i],
      p1 = points[i + 1];
    const toX = (p0.x + p1.x) / 2 + offsetX;
    const toY = (p0.y + p1.y) / 2 + offsetY;
    ctx.quadraticCurveTo(p0.x + offsetX, p0.y + offsetY, toX, toY);
  }
  ctx.lineTo(
    points[points.length - 1].x + offsetX,
    points[points.length - 1].y + offsetY,
  );
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

export function drawBrush(
  ctx: Ctx2D,
  rawPoints: Point[],
  lineWidth: number,
  brushType: BrushType,
  color: string | CanvasGradient,
  pressureSensitivity = false,
  sensitivity = 10,
  offsetX = 0,
  offsetY = 0,
): void {
  if (rawPoints.length < 2) return;
  const points = rawPoints.length > 4 ? smoothPoints(rawPoints) : rawPoints;
  if (brushType === "square") {
    drawSquare(
      ctx,
      points,
      lineWidth,
      color,
      pressureSensitivity,
      sensitivity,
      offsetX,
      offsetY,
    );
  } else if (brushType === "calligraphy") {
    drawChisel(
      ctx,
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
      ctx,
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
