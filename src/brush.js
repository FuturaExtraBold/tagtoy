function smoothPoints(points, iterations = 2) {
  let pts = points;
  for (let iter = 0; iter < iterations; iter++) {
    const out = [pts[0]];
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

function np(p) {
  return Math.min(1, (p.pressure ?? 0.5) * 2);
}

// ─── Round ─────────────────────────────────────────────────────────────────

function drawRound(ctx, points, lineWidth) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p1 = points[i + 1];
    const pressure = (np(p0) + np(p1)) / 2;
    ctx.lineWidth = Math.max(1, lineWidth * pressure);
    const fromX = i > 0 ? (points[i - 1].x + p0.x) / 2 : p0.x;
    const fromY = i > 0 ? (points[i - 1].y + p0.y) / 2 : p0.y;
    const toX = (p0.x + p1.x) / 2;
    const toY = (p0.y + p1.y) / 2;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.quadraticCurveTo(p0.x, p0.y, toX, toY);
    ctx.stroke();
  }
}

// ─── Square ────────────────────────────────────────────────────────────────
// Single smooth path to avoid per-segment square-cap overlaps at corners.

function drawSquare(ctx, points, lineWidth) {
  const avgPressure = points.reduce((s, p) => s + np(p), 0) / points.length;
  ctx.lineWidth = Math.max(1, lineWidth * avgPressure);
  ctx.lineCap = 'square';
  ctx.lineJoin = 'bevel';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();
}

// ─── Blob Brush (uniform width, single path) ────────────────────────────────

export function drawBlobBrush(ctx, rawPoints, lineWidth) {
  if (rawPoints.length < 2) return;
  const points = rawPoints.length > 4 ? smoothPoints(rawPoints) : rawPoints;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p1 = points[i + 1];
    const toX = (p0.x + p1.x) / 2;
    const toY = (p0.y + p1.y) / 2;
    ctx.quadraticCurveTo(p0.x, p0.y, toX, toY);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();
}

// ─── Public API ────────────────────────────────────────────────────────────

export function drawBrush(ctx, rawPoints, lineWidth, brushType) {
  if (rawPoints.length < 2) return;
  const points = rawPoints.length > 4 ? smoothPoints(rawPoints) : rawPoints;
  if (brushType === 'square') {
    drawSquare(ctx, points, lineWidth);
  } else {
    drawRound(ctx, points, lineWidth);
  }
}
