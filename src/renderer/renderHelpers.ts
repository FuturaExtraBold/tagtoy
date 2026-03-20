import type {
  Point,
  RenderConfig,
  ShadowAngle,
  Stroke,
} from "../types/drawing";

export function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function blendHex(a: string, b: string, t: number): string {
  const p = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = p(a);
  const [br, bg, bb] = p(b);
  return (
    "#" +
    [ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function getBoundsFromPoints(
  points: Point[],
  pad: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
}

export function getDrawingBounds(
  strokes: Stroke[],
  pad: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const s of strokes) {
    const b = getBoundsFromPoints(s.points, pad);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }
  return { minX, minY, maxX, maxY };
}

const SHADOW_ANGLES: Record<ShadowAngle, [number, number]> = {
  horizontal: [1, 0],
  "45": [Math.SQRT1_2, Math.SQRT1_2],
  vertical: [0, 1],
};

export function shadowCoords(
  config: Pick<RenderConfig, "shadowAngle" | "shadowOffset">,
): [number, number] {
  const [ax, ay] = SHADOW_ANGLES[config.shadowAngle];
  return [ax * config.shadowOffset, ay * config.shadowOffset];
}
