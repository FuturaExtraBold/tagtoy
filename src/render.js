import { drawBrush, drawBlobBrush } from './brush.js';

function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawDrips(ctx, points, lineWidth, color, seed) {
  if (points.length < 2) return;
  const rand = seededRand(seed);
  const count = 2 + Math.floor(rand() * 3);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rand() * points.length);
    const p = points[idx];
    const dripWidth  = lineWidth * (0.05 + rand() * 0.08);
    const dripLength = lineWidth * (0.3  + rand() * 1.0);
    ctx.lineWidth = Math.max(1, dripWidth);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + lineWidth / 2);
    ctx.lineTo(p.x, p.y + lineWidth / 2 + dripLength);
    ctx.stroke();
  }
}

function withFeather(ctx, feather, fn) {
  if (feather > 0) ctx.filter = `blur(${feather}px)`;
  fn();
  if (feather > 0) ctx.filter = 'none';
}

const SHADOW_ANGLES = {
  horizontal: [1, 0],
  '45':       [Math.SQRT1_2, Math.SQRT1_2],
  vertical:   [0, 1],
};

function getBoundsFromPoints(points, pad) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

function getDrawingBounds(strokes, pad) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) {
    const b = getBoundsFromPoints(s.points, pad);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }
  return { minX, minY, maxX, maxY };
}

function blendHex(a, b, t) {
  const p = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [ar,ag,ab] = p(a), [br,bg,bb] = p(b);
  return '#' + [ar+(br-ar)*t, ag+(bg-ag)*t, ab+(bb-ab)*t]
    .map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
}

function makeGradient(ctx, bounds, startColor, endColor) {
  const { minX, minY, maxX, maxY } = bounds;
  const grad = ctx.createLinearGradient(minX, minY, minX, maxY);
  grad.addColorStop(0,   startColor);
  grad.addColorStop(0.5, blendHex(startColor, endColor, 0.5));
  grad.addColorStop(1,   endColor);
  return grad;
}

function setColor(ctx, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
}

function shadowCoords(config) {
  const [ax, ay] = SHADOW_ANGLES[config.shadowAngle] ?? SHADOW_ANGLES['45'];
  return [ax * config.shadowOffset, ay * config.shadowOffset];
}

/**
 * Draw the stroke at every position along the extrusion vector (0,0)→(sx,sy),
 * sweeping out a solid filled region that connects front and back faces.
 * Step size is 40% of lineWidth so consecutive brush shapes always overlap.
 */
function drawExtrusion(ctx, s, lineWidth, brushType, sx, sy, shadowColor, drawFn = drawBrush) {
  const dist = Math.hypot(sx, sy);
  if (dist < 1) return;
  const stepSize = Math.max(1, lineWidth * 0.4);
  const steps = Math.ceil(dist / stepSize);
  setColor(ctx, shadowColor);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    ctx.save();
    ctx.translate(sx * t, sy * t);
    drawFn(ctx, s.points, lineWidth, brushType);
    ctx.restore();
  }
}

// ─── Tag: flat black, no effects ───────────────────────────────────────────

export function renderTag(ctx, strokes, config) {
  const { feather, showDrips, brushSize, brushType } = config;
  setColor(ctx, '#000');
  for (const s of strokes) {
    if (s.points.length < 2) continue;
    const seed = Math.round(s.points[0].x * 7 + s.points[0].y * 13);
    withFeather(ctx, feather, () => {
      drawBrush(ctx, s.points, brushSize, brushType);
      if (showDrips) drawDrips(ctx, s.points, brushSize, '#000000', seed);
    });
  }
}

// ─── Throwup: solid fill + outline + shadow ─────────────────────────────────
// Like bubble letters — one flat fill color, black outline, optional shadow.

export function renderThrowup(ctx, strokes, config) {
  if (!strokes.length) return;
  const { brushSize, shadowOffset, shadowColor, shadowAttached,
          outlineSize, outlineColor, throwupColor, brushType,
          feather, showDrips } = config;
  const [sx, sy] = shadowCoords(config);

  const reversed = [...strokes].reverse();
  for (const s of reversed) {
    if (s.points.length < 2) continue;
    const seed = Math.round(s.points[0].x * 7 + s.points[0].y * 13);

    // Shadow layer
    withFeather(ctx, feather, () => {
      if (shadowAttached && shadowOffset > 0) {
        drawExtrusion(ctx, s, outlineSize, brushType, sx, sy, shadowColor, drawBlobBrush);
        if (showDrips) drawDrips(ctx, s.points, outlineSize, shadowColor, seed);
      } else if (shadowOffset > 0) {
        ctx.save();
        ctx.translate(sx, sy);
        setColor(ctx, shadowColor);
        drawBlobBrush(ctx, s.points, outlineSize);
        if (showDrips) drawDrips(ctx, s.points, outlineSize, shadowColor, seed);
        ctx.restore();
      }
    });

    // Outline layer
    withFeather(ctx, feather, () => {
      setColor(ctx, outlineColor);
      drawBlobBrush(ctx, s.points, outlineSize);
      if (showDrips) drawDrips(ctx, s.points, outlineSize, outlineColor, seed + 1);
    });

    // Fill layer
    withFeather(ctx, feather, () => {
      setColor(ctx, throwupColor);
      drawBlobBrush(ctx, s.points, brushSize);
      if (showDrips) drawDrips(ctx, s.points, brushSize, throwupColor, seed + 2);
    });
  }
}

// ─── Burner: gradient fill + outline + shadow ──────────────────────────────

export function renderBurner(ctx, strokes, gradientMode, config) {
  if (!strokes.length) return;

  const { brushSize, shadowOffset, shadowColor, shadowAttached,
          outlineSize, outlineColor, gradientStart, gradientEnd, brushType,
          feather, showDrips } = config;
  const [sx, sy] = shadowCoords(config);
  const pad = Math.max(brushSize, outlineSize) / 2;

  function shadow(s, seed) {
    withFeather(ctx, feather, () => {
      if (shadowAttached && shadowOffset > 0) {
        drawExtrusion(ctx, s, outlineSize, brushType, sx, sy, shadowColor);
        if (showDrips) drawDrips(ctx, s.points, outlineSize, shadowColor, seed);
      } else if (shadowOffset > 0) {
        ctx.save();
        ctx.translate(sx, sy);
        setColor(ctx, shadowColor);
        drawBrush(ctx, s.points, outlineSize, brushType);
        if (showDrips) drawDrips(ctx, s.points, outlineSize, shadowColor, seed);
        ctx.restore();
      }
    });
  }

  function outline(s, seed) {
    withFeather(ctx, feather, () => {
      setColor(ctx, outlineColor);
      drawBrush(ctx, s.points, outlineSize, brushType);
      if (showDrips) drawDrips(ctx, s.points, outlineSize, outlineColor, seed + 1);
    });
  }

  function fill(s, bounds, seed) {
    withFeather(ctx, feather, () => {
      setColor(ctx, makeGradient(ctx, bounds, gradientStart, gradientEnd));
      drawBrush(ctx, s.points, brushSize, brushType);
      if (showDrips) drawDrips(ctx, s.points, brushSize, gradientStart, seed + 2);
    });
  }

  if (gradientMode === 'overlay') {
    for (const s of strokes) {
      if (s.points.length < 2) continue;
      const seed = Math.round(s.points[0].x * 7 + s.points[0].y * 13);
      shadow(s, seed);
      outline(s, seed);
      fill(s, getBoundsFromPoints(s.points, pad), seed);
    }
  } else {
    const db = getDrawingBounds(strokes, pad);
    for (const s of strokes) { if (s.points.length < 2) continue; shadow(s, Math.round(s.points[0].x * 7 + s.points[0].y * 13)); }
    for (const s of strokes) { if (s.points.length < 2) continue; outline(s, Math.round(s.points[0].x * 7 + s.points[0].y * 13)); }
    for (const s of strokes) { if (s.points.length < 2) continue; fill(s, db, Math.round(s.points[0].x * 7 + s.points[0].y * 13)); }
  }
}
