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
  const count = 3 + Math.floor(rand() * 4);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rand() * points.length);
    const p   = points[idx];
    const dripWidth  = lineWidth * (0.04 + rand() * 0.06);
    const dripLength = lineWidth * (0.18 + rand() * 0.55);
    ctx.lineWidth = Math.max(1, dripWidth);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + lineWidth / 2);
    ctx.lineTo(p.x, p.y + lineWidth / 2 + dripLength);
    ctx.stroke();
  }
}

// Module-level offscreen canvas (reused across frames)
const _tmp = { canvas: null, ctx: null };

function getTmpCtx(mainCtx) {
  const { width, height } = mainCtx.canvas;
  if (!_tmp.canvas) {
    _tmp.canvas = document.createElement('canvas');
    _tmp.ctx    = _tmp.canvas.getContext('2d');
  }
  if (_tmp.canvas.width !== width || _tmp.canvas.height !== height) {
    _tmp.canvas.width  = width;
    _tmp.canvas.height = height;
  }
  const tc = _tmp.ctx;
  tc.save();
  tc.setTransform(1, 0, 0, 1, 0, 0);
  tc.clearRect(0, 0, width, height);
  tc.restore();
  const t = mainCtx.getTransform();
  tc.setTransform(t.a, t.b, t.c, t.d, t.e, t.f);
  return tc;
}

// Draw fn onto an offscreen canvas, then composite to ctx with a CSS blur.
// fn receives the target context as its argument.
function withFeather(ctx, feather, fn) {
  if (feather <= 0) { fn(ctx); return; }
  const tc = getTmpCtx(ctx);
  fn(tc);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = `blur(${feather}px)`;
  ctx.drawImage(tc.canvas, 0, 0);
  ctx.restore();
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
  const { feather, brushSize, brushType } = config;
  for (const s of strokes) {
    if (s.points.length < 2) continue;
    withFeather(ctx, feather, (c) => {
      setColor(c, '#000');
      drawBrush(c, s.points, brushSize, brushType);
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

    // Shadow layer (drips only here)
    withFeather(ctx, feather, (c) => {
      if (shadowAttached && shadowOffset > 0) {
        drawExtrusion(c, s, outlineSize, brushType, sx, sy, shadowColor, drawBlobBrush);
        if (showDrips) drawDrips(c, s.points, outlineSize, shadowColor, seed);
      } else if (shadowOffset > 0) {
        c.save();
        c.translate(sx, sy);
        setColor(c, shadowColor);
        drawBlobBrush(c, s.points, outlineSize);
        if (showDrips) drawDrips(c, s.points, outlineSize, shadowColor, seed);
        c.restore();
      }
    });

    // Outline layer
    withFeather(ctx, feather, (c) => {
      setColor(c, outlineColor);
      drawBlobBrush(c, s.points, outlineSize);
    });

    // Fill layer
    withFeather(ctx, feather, (c) => {
      setColor(c, throwupColor);
      drawBlobBrush(c, s.points, brushSize);
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
    withFeather(ctx, feather, (c) => {
      if (shadowAttached && shadowOffset > 0) {
        drawExtrusion(c, s, outlineSize, brushType, sx, sy, shadowColor);
        if (showDrips) drawDrips(c, s.points, outlineSize, shadowColor, seed);
      } else if (shadowOffset > 0) {
        c.save();
        c.translate(sx, sy);
        setColor(c, shadowColor);
        drawBrush(c, s.points, outlineSize, brushType);
        if (showDrips) drawDrips(c, s.points, outlineSize, shadowColor, seed);
        c.restore();
      }
    });
  }

  function outline(s) {
    withFeather(ctx, feather, (c) => {
      setColor(c, outlineColor);
      drawBrush(c, s.points, outlineSize, brushType);
    });
  }

  function fill(s, bounds) {
    withFeather(ctx, feather, (c) => {
      setColor(c, makeGradient(c, bounds, gradientStart, gradientEnd));
      drawBrush(c, s.points, brushSize, brushType);
    });
  }

  if (gradientMode === 'overlay') {
    for (const s of strokes) {
      if (s.points.length < 2) continue;
      const seed = Math.round(s.points[0].x * 7 + s.points[0].y * 13);
      shadow(s, seed);
      outline(s);
      fill(s, getBoundsFromPoints(s.points, pad));
    }
  } else {
    const db = getDrawingBounds(strokes, pad);
    for (const s of strokes) { if (s.points.length < 2) continue; shadow(s, Math.round(s.points[0].x * 7 + s.points[0].y * 13)); }
    for (const s of strokes) { if (s.points.length < 2) continue; outline(s); }
    for (const s of strokes) { if (s.points.length < 2) continue; fill(s, db); }
  }
}
