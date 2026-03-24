import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

import {
  type AnimatingStroke,
  GpuRenderer,
} from "../renderer/webgpu/GpuRenderer";
import type {
  GradientMode,
  Point,
  RenderConfig,
  Stroke,
  StyleMode,
} from "../types/drawing";

interface DrawingCanvasConfig {
  strokes: Stroke[];
  lockedStrokeCount: number;
  style: StyleMode;
  gradientMode: GradientMode;
  renderConfig: RenderConfig;
  paintTexture: HTMLImageElement | null;
  onStrokeComplete: (stroke: Stroke) => void;
}

const DRIP_ANIMATION_MS = 650;
const MIN_POINT_DISTANCE = 1.5;
const MIN_TURN_RADIANS = (12 * Math.PI) / 180;

function angleDelta(a: number, b: number): number {
  const delta = Math.abs(a - b);
  return Math.min(delta, Math.PI * 2 - delta);
}

function shouldKeepPoint(
  previous: Point | null,
  current: Point,
  next: Point,
): boolean {
  const distance = Math.hypot(next.x - current.x, next.y - current.y);
  if (distance >= MIN_POINT_DISTANCE) return true;
  if (!previous) return false;
  const beforeAngle = Math.atan2(
    current.y - previous.y,
    current.x - previous.x,
  );
  const afterAngle = Math.atan2(next.y - current.y, next.x - current.x);
  return angleDelta(beforeAngle, afterAngle) >= MIN_TURN_RADIANS;
}

function appendPoint(points: Point[], next: Point): void {
  if (points.length === 0) {
    points.push(next);
    return;
  }
  if (points.length === 1) {
    if (
      Math.hypot(next.x - points[0].x, next.y - points[0].y) >=
      MIN_POINT_DISTANCE
    )
      points.push(next);
    return;
  }
  const previous = points[points.length - 2];
  const current = points[points.length - 1];
  if (shouldKeepPoint(previous, current, next)) {
    points.push(next);
  } else {
    points[points.length - 1] = next;
  }
}

function finalizeRenderPoints(points: Point[]): Point[] {
  if (points.length <= 2) return points.slice();
  const simplified: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const previous =
      simplified.length > 1 ? simplified[simplified.length - 2] : null;
    const current = simplified[simplified.length - 1];
    const next = points[i];
    if (shouldKeepPoint(previous, current, next)) simplified.push(next);
  }
  const last = points[points.length - 1];
  if (simplified[simplified.length - 1] !== last) simplified.push(last);
  if (simplified.length > 2) return simplified;
  return [points[0], points[points.length - 1]];
}

function createStroke(id: number, points: Point[]): Stroke {
  const rp = finalizeRenderPoints(points);
  return { id, points, renderPoints: rp.length > 1 ? rp : points.slice() };
}

export function useDrawingCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  config: DrawingCanvasConfig,
): void {
  const configRef = useRef(config);
  useLayoutEffect(() => {
    configRef.current = config;
  }, [config]);

  const rendererRef = useRef<GpuRenderer | null>(null);
  const isReadyRef = useRef(false);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const animatingRef = useRef<AnimatingStroke[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const nextIdRef = useRef(1);
  const pendingCommitIds = useRef<Set<number>>(new Set());

  // ── Render frame ──────────────────────────────────────────────────────────

  const renderFrame = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer || !isReadyRef.current) return;

    const { strokes, style, gradientMode, renderConfig } = configRef.current;
    const now = performance.now();

    // Prune finished animations
    const strokeIds = new Set(strokes.map((s) => s.id));
    animatingRef.current = animatingRef.current.filter(
      ({ stroke, progress }) => {
        if (progress >= 1) return false;
        return (
          strokeIds.has(stroke.id) || pendingCommitIds.current.has(stroke.id)
        );
      },
    );

    // Update progress
    animatingRef.current = animatingRef.current.map((a) => ({
      ...a,
      progress: Math.min(1, (now - (a as any)._startedAt) / DRIP_ANIMATION_MS),
    }));

    renderer.render(
      strokes,
      currentPointsRef.current,
      style,
      gradientMode,
      renderConfig,
      animatingRef.current,
    );
  }, []);

  const stopLoop = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const startLoop = useCallback(() => {
    if (animFrameRef.current !== null) return;
    const tick = () => {
      animFrameRef.current = null;
      renderFrame();
      if (animatingRef.current.some((a) => a.progress < 1)) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };
    if (animatingRef.current.some((a) => a.progress < 1)) {
      animFrameRef.current = requestAnimationFrame(tick);
    }
  }, [renderFrame]);

  // ── Mount: init WebGPU + events ───────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let destroyed = false;
    let cleanupEvents: (() => void) | null = null;

    GpuRenderer.create(canvas).then((renderer) => {
      if (destroyed) {
        renderer.destroy();
        return;
      }
      rendererRef.current = renderer;

      const getPoint = (e: PointerEvent): Point => {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };

      const onDown = (e: PointerEvent) => {
        e.preventDefault();
        isDrawingRef.current = true;
        currentPointsRef.current.length = 0;
        currentPointsRef.current.push(getPoint(e));
        canvas.setPointerCapture(e.pointerId);
        renderFrame();
      };

      const onMove = (e: PointerEvent) => {
        if (!isDrawingRef.current) return;
        appendPoint(currentPointsRef.current, getPoint(e));
        renderFrame();
      };

      const onUp = (e?: PointerEvent) => {
        if (!isDrawingRef.current) return;
        if (e) {
          try {
            canvas.releasePointerCapture(e.pointerId);
          } catch {
            /* ok */
          }
        }
        isDrawingRef.current = false;
        const committed = currentPointsRef.current.slice();
        currentPointsRef.current.length = 0;
        renderFrame();

        if (committed.length < 2) return;
        const stroke = createStroke(nextIdRef.current++, committed);

        const { renderConfig, style } = configRef.current;
        if (renderConfig.showDrips && style !== "tag") {
          pendingCommitIds.current.add(stroke.id);
          animatingRef.current.push({
            stroke,
            progress: 0,
            _startedAt: performance.now(),
          } as AnimatingStroke & { _startedAt: number });
          renderFrame();
          startLoop();
        }

        configRef.current.onStrokeComplete(stroke);
      };

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, Math.round(rect.width));
        const h = Math.max(1, Math.round(rect.height));
        canvas.width = w;
        canvas.height = h;
        renderer.resize(w, h);
        renderFrame();
      };

      canvas.style.touchAction = "none";
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointerleave", onUp);
      canvas.addEventListener("pointercancel", onUp);

      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
      resize();
      isReadyRef.current = true;

      cleanupEvents = () => {
        isReadyRef.current = false;
        ro.disconnect();
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointerleave", onUp);
        canvas.removeEventListener("pointercancel", onUp);
      };
    });

    const currentPoints = currentPointsRef.current;
    const pendingIds = pendingCommitIds.current;

    return () => {
      destroyed = true;
      isReadyRef.current = false;
      stopLoop();
      cleanupEvents?.();
      currentPoints.length = 0;
      animatingRef.current = [];
      pendingIds.clear();
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [canvasRef, renderFrame, startLoop, stopLoop]);

  // ── Sync stroke IDs ──────────────────────────────────────────────────────

  useEffect(() => {
    const maxId = config.strokes.reduce((m, s) => Math.max(m, s.id), 0);
    for (const s of config.strokes) pendingCommitIds.current.delete(s.id);
    if (config.strokes.length === 0) {
      animatingRef.current = [];
      pendingCommitIds.current.clear();
    }
    if (nextIdRef.current <= maxId) nextIdRef.current = maxId + 1;
  }, [config.strokes]);

  // ── Re-render on config change ───────────────────────────────────────────

  useEffect(() => {
    if (!isReadyRef.current) return;
    renderFrame();
    startLoop();
  }, [
    config.strokes,
    config.lockedStrokeCount,
    config.style,
    config.gradientMode,
    config.renderConfig,
    renderFrame,
    startLoop,
  ]);

  // ── Sync paint texture ────────────────────────────────────────────────────

  useEffect(() => {
    rendererRef.current?.setPaintTexture(config.paintTexture);
    if (isReadyRef.current) renderFrame();
  }, [config.paintTexture, renderFrame]);
}
