import type { BrushType, Point } from "../../types/drawing";
import { seededRand } from "../renderHelpers";

// ── Smoothing ────────────────────────────────────────────────────────────────

function smooth(pts: Point[], iterations = 2): Point[] {
  let p = pts;
  for (let iter = 0; iter < iterations; iter++) {
    const out: Point[] = [p[0]];
    for (let i = 1; i < p.length - 1; i++) {
      out.push({
        x: (p[i - 1].x + p[i].x * 2 + p[i + 1].x) / 4,
        y: (p[i - 1].y + p[i].y * 2 + p[i + 1].y) / 4,
      });
    }
    out.push(p[p.length - 1]);
    p = out;
  }
  return p;
}

// ── Round join normals ────────────────────────────────────────────────────────
//
// Returns per-segment [startNormal, endNormal] pairs.
//
// At smooth joins (miter scale ≤ MITER_LIMIT): the miter bisector is used and
// adjacent quads share a single vertex, so there is no gap.
//
// At sharp joins (scale > MITER_LIMIT): each segment uses its own unit
// perpendicular normal (scale = 1) so no spike is produced. The resulting gap
// on the convex (outer) side is filled with a circular arc fan appended to
// `out`. This is the standard "round join" used by vector renderers.

const MITER_LIMIT = 1.05; // round join for any visible corner (~18°+)

function buildJoins(
  pts: Point[],
  r: number,
  out: number[],
): Array<[[number, number], [number, number]]> {
  const n = pts.length;
  const segs = n - 1;

  // Per-segment unit perpendiculars
  const perp: Array<[number, number]> = [];
  for (let i = 0; i < segs; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    const len = Math.hypot(dx, dy) || 1;
    perp.push([-dy / len, dx / len]);
  }

  // startN[i]: normal used at pts[i] as the start of segment i
  // endN[i]:   normal used at pts[i+1] as the end of segment i
  const startN: Array<[number, number]> = new Array(segs);
  const endN: Array<[number, number]> = new Array(segs);

  startN[0] = perp[0];
  endN[segs - 1] = perp[segs - 1];

  for (let i = 1; i < n - 1; i++) {
    const segBefore = i - 1;
    const segAfter = i;
    const [n1x, n1y] = perp[segBefore];
    const [n2x, n2y] = perp[segAfter];

    const mx = n1x + n2x;
    const my = n1y + n2y;
    const ml = Math.hypot(mx, my);

    if (ml < 0.001) {
      // Near-180° U-turn: each segment keeps its own perp
      endN[segBefore] = [n1x, n1y];
      startN[segAfter] = [n2x, n2y];
      continue;
    }

    const mux = mx / ml;
    const muy = my / ml;
    const dot = mux * n1x + muy * n1y;
    const scale = 1.0 / Math.max(0.25, Math.abs(dot));

    if (scale <= MITER_LIMIT) {
      // Smooth miter join: shared scaled normal, no gap
      const scaled: [number, number] = [mux * scale, muy * scale];
      endN[segBefore] = scaled;
      startN[segAfter] = scaled;
    } else {
      // Sharp corner: round join — each segment uses its own perp
      endN[segBefore] = [n1x, n1y];
      startN[segAfter] = [n2x, n2y];

      // Cross product of direction vectors determines which side has the gap
      const dx1 = pts[i].x - pts[i - 1].x;
      const dy1 = pts[i].y - pts[i - 1].y;
      const dx2 = pts[i + 1].x - pts[i].x;
      const dy2 = pts[i + 1].y - pts[i].y;
      const cross = dx1 * dy2 - dy1 * dx2;

      const p = pts[i];
      let a0: number, a1: number, arc: number;

      if (cross < 0) {
        // Right turn: gap on +normal (convex) side
        a0 = Math.atan2(n1y, n1x);
        a1 = Math.atan2(n2y, n2x);
        arc = a1 - a0;
        if (arc > 0) arc -= Math.PI * 2; // ensure CW sweep
      } else {
        // Left turn: gap on -normal (convex) side
        a0 = Math.atan2(-n1y, -n1x);
        a1 = Math.atan2(-n2y, -n2x);
        arc = a1 - a0;
        if (arc < 0) arc += Math.PI * 2; // ensure CCW sweep
      }

      // Fan triangles to fill the arc gap
      const steps = Math.max(2, Math.ceil(Math.abs(arc) / (Math.PI / 8)));
      for (let k = 0; k < steps; k++) {
        const fa = a0 + arc * (k / steps);
        const fb = a0 + arc * ((k + 1) / steps);
        out.push(
          p.x,
          p.y,
          p.x + Math.cos(fa) * r,
          p.y + Math.sin(fa) * r,
          p.x + Math.cos(fb) * r,
          p.y + Math.sin(fb) * r,
        );
      }
    }
  }

  return Array.from({ length: segs }, (_, i) => [startN[i], endN[i]]);
}

// ── Cap helper ────────────────────────────────────────────────────────────────

function semicap(
  out: number[],
  cx: number,
  cy: number,
  r: number,
  angle: number,
): void {
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a0 = angle - Math.PI / 2 + (i / N) * Math.PI;
    const a1 = angle - Math.PI / 2 + ((i + 1) / N) * Math.PI;
    out.push(
      cx,
      cy,
      cx + Math.cos(a0) * r,
      cy + Math.sin(a0) * r,
      cx + Math.cos(a1) * r,
      cy + Math.sin(a1) * r,
    );
  }
}

// ── Round brush (+ blob) ──────────────────────────────────────────────────────

export function tessellateRound(
  rawPoints: Point[],
  lineWidth: number,
): Float32Array {
  if (rawPoints.length < 2) return new Float32Array(0);
  const pts = rawPoints.length > 4 ? smooth(rawPoints) : rawPoints;
  const r = lineWidth / 2;
  const out: number[] = [];
  const joins = buildJoins(pts, r, out);

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i],
      p1 = pts[i + 1];
    const [nx0, ny0] = joins[i][0];
    const [nx1, ny1] = joins[i][1];
    out.push(
      p0.x + nx0 * r,
      p0.y + ny0 * r,
      p0.x - nx0 * r,
      p0.y - ny0 * r,
      p1.x + nx1 * r,
      p1.y + ny1 * r,
      p0.x - nx0 * r,
      p0.y - ny0 * r,
      p1.x - nx1 * r,
      p1.y - ny1 * r,
      p1.x + nx1 * r,
      p1.y + ny1 * r,
    );
  }

  // Semicircle caps at start and end
  const p0 = pts[0],
    p1 = pts[1];
  semicap(out, p0.x, p0.y, r, Math.atan2(p0.y - p1.y, p0.x - p1.x));
  const pn = pts[pts.length - 1],
    pn1 = pts[pts.length - 2];
  semicap(out, pn.x, pn.y, r, Math.atan2(pn.y - pn1.y, pn.x - pn1.x));

  return new Float32Array(out);
}

// ── Square brush ──────────────────────────────────────────────────────────────

export function tessellateSquare(
  rawPoints: Point[],
  lineWidth: number,
): Float32Array {
  if (rawPoints.length < 2) return new Float32Array(0);
  const pts = rawPoints.length > 4 ? smooth(rawPoints) : rawPoints;
  const r = lineWidth / 2;
  const out: number[] = [];
  const joins = buildJoins(pts, r, out);

  // Precompute direction for square cap extension at start/end
  const d0x = pts[1].x - pts[0].x,
    d0y = pts[1].y - pts[0].y;
  const l0 = Math.hypot(d0x, d0y) || 1;
  const dn = pts.length - 1;
  const dnx = pts[dn].x - pts[dn - 1].x,
    dny = pts[dn].y - pts[dn - 1].y;
  const ln = Math.hypot(dnx, dny) || 1;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i],
      p1 = pts[i + 1];
    const [nx0, ny0] = joins[i][0];
    const [nx1, ny1] = joins[i][1];

    // Extend first/last segment outward for square caps
    const extX0 = i === 0 ? -(d0x / l0) * r : 0;
    const extY0 = i === 0 ? -(d0y / l0) * r : 0;
    const extX1 = i === pts.length - 2 ? (dnx / ln) * r : 0;
    const extY1 = i === pts.length - 2 ? (dny / ln) * r : 0;

    out.push(
      p0.x + nx0 * r + extX0,
      p0.y + ny0 * r + extY0,
      p0.x - nx0 * r + extX0,
      p0.y - ny0 * r + extY0,
      p1.x + nx1 * r + extX1,
      p1.y + ny1 * r + extY1,
      p0.x - nx0 * r + extX0,
      p0.y - ny0 * r + extY0,
      p1.x - nx1 * r + extX1,
      p1.y - ny1 * r + extY1,
      p1.x + nx1 * r + extX1,
      p1.y + ny1 * r + extY1,
    );
  }

  return new Float32Array(out);
}

// ── Bubble brush (sine-envelope variable width) ───────────────────────────────

export function tessellateBubble(
  rawPoints: Point[],
  lineWidth: number,
): Float32Array {
  if (rawPoints.length < 2) return new Float32Array(0);
  const pts = rawPoints.length > 4 ? smooth(rawPoints) : rawPoints;
  const n = pts.length;
  const rMax = lineWidth / 2;
  const rMin = rMax * 0.04;
  const out: number[] = [];

  // Per-point radius following a sine envelope
  const radii: number[] = pts.map((_, i) => {
    const t = i / (n - 1);
    return rMin + (rMax - rMin) * Math.sin(Math.PI * t);
  });

  // buildJoins uses rMax for arc fans — minor approximation at tapered ends
  const joins = buildJoins(pts, rMax, out);

  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i],
      p1 = pts[i + 1];
    const [nx0, ny0] = joins[i][0];
    const [nx1, ny1] = joins[i][1];
    const r0 = radii[i];
    const r1 = radii[i + 1];
    out.push(
      p0.x + nx0 * r0,
      p0.y + ny0 * r0,
      p0.x - nx0 * r0,
      p0.y - ny0 * r0,
      p1.x + nx1 * r1,
      p1.y + ny1 * r1,
      p0.x - nx0 * r0,
      p0.y - ny0 * r0,
      p1.x - nx1 * r1,
      p1.y - ny1 * r1,
      p1.x + nx1 * r1,
      p1.y + ny1 * r1,
    );
  }

  // Small caps at the tapered ends
  const p0 = pts[0],
    p1 = pts[1];
  semicap(out, p0.x, p0.y, rMin, Math.atan2(p0.y - p1.y, p0.x - p1.x));
  const pn = pts[n - 1],
    pn1 = pts[n - 2];
  semicap(out, pn.x, pn.y, rMin, Math.atan2(pn.y - pn1.y, pn.x - pn1.x));

  return new Float32Array(out);
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

export function tessellateStroke(
  rawPoints: Point[],
  lineWidth: number,
  brushType: BrushType,
): Float32Array {
  if (brushType === "square") return tessellateSquare(rawPoints, lineWidth);
  return tessellateRound(rawPoints, lineWidth);
}

// ── Drips ─────────────────────────────────────────────────────────────────────

export function tessellateDrips(
  points: Point[],
  lineWidth: number,
  seed: number,
  dripCount: number,
  progress: number,
  offsetX = 0,
  offsetY = 0,
): Float32Array {
  if (points.length < 2 || progress <= 0) return new Float32Array(0);
  const rand = seededRand(seed);
  const eased = 1 - Math.pow(1 - Math.max(0, Math.min(1, progress)), 3);
  const active = Math.max(1, Math.ceil(dripCount * eased));
  const out: number[] = [];

  for (let i = 0; i < active; i++) {
    const p = points[Math.floor(rand() * points.length)];
    const hw = Math.max(2, lineWidth * (0.018 + rand() * 0.014));
    const len = lineWidth * (0.2 + rand() * 0.5) * eased;

    const x = p.x + offsetX;
    // Start inside the stroke so the drip looks attached
    const y0 = p.y + lineWidth * 0.35 + offsetY;
    const y1 = y0 + len;

    // Rectangle body
    out.push(
      x - hw,
      y0,
      x + hw,
      y0,
      x + hw,
      y1,
      x - hw,
      y0,
      x + hw,
      y1,
      x - hw,
      y1,
    );

    // Round bottom cap (semicircle pointing down)
    const CN = 8;
    for (let k = 0; k < CN; k++) {
      const a0 = (k / CN) * Math.PI;
      const a1 = ((k + 1) / CN) * Math.PI;
      out.push(
        x,
        y1,
        x + Math.cos(a0) * hw,
        y1 + Math.sin(a0) * hw,
        x + Math.cos(a1) * hw,
        y1 + Math.sin(a1) * hw,
      );
    }
  }

  return new Float32Array(out);
}

// ── Concat helper ─────────────────────────────────────────────────────────────

export function concatF32(arrays: Float32Array[]): Float32Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}
