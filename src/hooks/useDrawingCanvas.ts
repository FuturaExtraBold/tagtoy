import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

import { renderStyleToCtx } from "../renderer/canvasRenderer";
import { getDrawingBounds } from "../renderer/renderHelpers";
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
  onStrokeComplete: (stroke: Stroke) => void;
}

type AnimatingStroke = {
  stroke: Stroke;
  startedAt: number;
};

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

const DRIP_ANIMATION_MS = 650;
const STROKE_COMMIT_GRACE_MS = 120;
const MIN_POINT_DISTANCE = 1.5;
const MIN_PRESSURE_DELTA = 0.03;
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
  if (Math.abs(next.pressure - current.pressure) >= MIN_PRESSURE_DELTA)
    return true;
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
    ) {
      points.push(next);
    }
    return;
  }
  const previous = points[points.length - 2];
  const current = points[points.length - 1];
  if (shouldKeepPoint(previous, current, next)) {
    points.push(next);
    return;
  }
  points[points.length - 1] = next;
}

function finalizeRenderPoints(points: Point[]): Point[] {
  if (points.length <= 2) return points.slice();
  const simplified: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const previous =
      simplified.length > 1 ? simplified[simplified.length - 2] : null;
    const current = simplified[simplified.length - 1];
    const next = points[i];
    if (shouldKeepPoint(previous, current, next)) {
      simplified.push(next);
    }
  }
  const last = points[points.length - 1];
  if (simplified[simplified.length - 1] !== last) {
    simplified.push(last);
  }
  if (simplified.length > 2) return simplified;
  return [points[0], points[points.length - 1]];
}

function createStroke(id: number, points: Point[]): Stroke {
  const renderPoints = finalizeRenderPoints(points);
  return {
    id,
    points,
    renderPoints: renderPoints.length > 1 ? renderPoints : points.slice(),
  };
}

export function useDrawingCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  config: DrawingCanvasConfig,
): void {
  const configRef = useRef(config);
  useLayoutEffect(() => {
    configRef.current = config;
  }, [config]);

  const baseOffscreenRef = useRef<OffscreenCanvas | null>(null);
  const gradientOffscreenRef = useRef<OffscreenCanvas | null>(null);
  const logicalSizeRef = useRef({ width: 1, height: 1 });
  const isReadyRef = useRef(false);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const animatingStrokesRef = useRef<AnimatingStroke[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const nextStrokeIdRef = useRef(1);
  const pendingCommitIdsRef = useRef<Set<number>>(new Set());

  const getGlobalGradientBounds = useCallback(
    (extraPoints?: Point[]): Bounds | undefined => {
      const { style, gradientMode, strokes, renderConfig } = configRef.current;
      if (
        (style !== "burner" && style !== "wildstyle") ||
        gradientMode !== "combined"
      )
        return undefined;
      const gradientStrokes =
        extraPoints && extraPoints.length > 1
          ? [...strokes, createStroke(-1, extraPoints)]
          : strokes;
      if (gradientStrokes.length === 0) return undefined;
      const pad =
        Math.max(renderConfig.brushSize, renderConfig.outlineSize) / 2;
      return getDrawingBounds(gradientStrokes, pad);
    },
    [],
  );

  const getActiveAnimations = useCallback(() => {
    const now = performance.now();
    const strokeIds = new Set(configRef.current.strokes.map((s) => s.id));
    animatingStrokesRef.current = animatingStrokesRef.current.filter(
      ({ stroke, startedAt }) =>
        now - startedAt < DRIP_ANIMATION_MS &&
        (strokeIds.has(stroke.id) ||
          (pendingCommitIdsRef.current.has(stroke.id) &&
            now - startedAt < STROKE_COMMIT_GRACE_MS)),
    );
    return animatingStrokesRef.current;
  }, []);

  const rebuildBaseOffscreen = useCallback(() => {
    const size = logicalSizeRef.current;
    const off = new OffscreenCanvas(size.width, size.height);
    const offCtx = off.getContext("2d")!;

    const { strokes, lockedStrokeCount, style, gradientMode, renderConfig } =
      configRef.current;
    const lockedStrokes = strokes.slice(0, lockedStrokeCount);

    if (lockedStrokes.length > 0) {
      const gradientBounds = getGlobalGradientBounds();
      const ordered =
        style === "throwup" ? [...lockedStrokes].reverse() : lockedStrokes;
      renderStyleToCtx(offCtx, style, ordered, gradientMode, renderConfig, {
        includeDrips: true,
        gradientBounds,
        canvasSize: size,
      });
    }

    baseOffscreenRef.current = off;
  }, [getGlobalGradientBounds]);

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = logicalSizeRef.current;
    const { strokes, lockedStrokeCount, style, gradientMode, renderConfig } =
      configRef.current;
    const canvasSize = { width, height };

    ctx.clearRect(0, 0, width, height);

    const animating = getActiveAnimations();
    const animatingIds = new Set(animating.map(({ stroke }) => stroke.id));
    const liveStrokes = strokes
      .slice(lockedStrokeCount)
      .filter((s) => !animatingIds.has(s.id));
    const isDrawing = currentPointsRef.current.length >= 2;
    const gradientBounds = getGlobalGradientBounds(
      isDrawing ? currentPointsRef.current : undefined,
    );
    const now = performance.now();
    const offscreen = gradientOffscreenRef.current ?? undefined;

    const orderedLive =
      style === "throwup" ? [...liveStrokes].reverse() : liveStrokes;
    const orderedAnimating =
      style === "throwup" ? [...animating].reverse() : animating;

    const drawBase = () => {
      if (baseOffscreenRef.current)
        ctx.drawImage(baseOffscreenRef.current, 0, 0);
    };

    const drawLive = () => {
      if (orderedLive.length === 0) return;
      renderStyleToCtx(ctx, style, orderedLive, gradientMode, renderConfig, {
        includeDrips: true,
        gradientBounds,
        canvasSize,
        offscreen,
      });
    };

    const drawFx = () => {
      if (orderedAnimating.length === 0) return;
      for (const anim of orderedAnimating) {
        renderStyleToCtx(
          ctx,
          style,
          [anim.stroke],
          gradientMode,
          renderConfig,
          {
            dripProgress: Math.min(
              1,
              (now - anim.startedAt) / DRIP_ANIMATION_MS,
            ),
            gradientBounds,
            canvasSize,
            offscreen,
          },
        );
      }
    };

    const drawPreview = () => {
      if (!isDrawing) return;
      const previewStroke = createStroke(-1, currentPointsRef.current);
      renderStyleToCtx(
        ctx,
        style,
        [previewStroke],
        gradientMode,
        renderConfig,
        {
          includeDrips: false,
          gradientBounds,
          canvasSize,
          offscreen,
        },
      );
    };

    if (style === "throwup") {
      drawPreview();
      drawFx();
      drawBase();
      drawLive();
    } else {
      drawBase();
      drawLive();
      drawFx();
      drawPreview();
    }
  }, [canvasRef, getActiveAnimations, getGlobalGradientBounds]);

  const stopAnimationLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const startAnimationLoop = useCallback(() => {
    if (animationFrameRef.current !== null) return;
    const tick = () => {
      animationFrameRef.current = null;
      renderFrame();
      if (getActiveAnimations().length > 0) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
      }
    };
    if (getActiveAnimations().length > 0) {
      animationFrameRef.current = window.requestAnimationFrame(tick);
    }
  }, [getActiveAnimations, renderFrame]);

  // Mount: attach canvas event listeners and resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPoint = (event: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        pressure: event.pressure,
      };
    };

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      isDrawingRef.current = true;
      currentPointsRef.current.length = 0;
      currentPointsRef.current.push(getPoint(event));
      canvas.setPointerCapture(event.pointerId);
      renderFrame();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isDrawingRef.current) return;
      appendPoint(currentPointsRef.current, getPoint(event));
      renderFrame();
    };

    const finishStroke = (event?: PointerEvent) => {
      if (!isDrawingRef.current) return;
      if (event) {
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // already released
        }
      }
      isDrawingRef.current = false;
      const committedPoints = currentPointsRef.current.slice();
      currentPointsRef.current.length = 0;
      renderFrame();

      if (committedPoints.length < 2) return;

      const stroke = createStroke(nextStrokeIdRef.current, committedPoints);
      nextStrokeIdRef.current += 1;

      const { renderConfig, style } = configRef.current;
      if (renderConfig.showDrips && style !== "tag") {
        pendingCommitIdsRef.current.add(stroke.id);
        animatingStrokesRef.current.push({
          stroke,
          startedAt: performance.now(),
        });
        renderFrame();
        startAnimationLoop();
      }

      configRef.current.onStrokeComplete(stroke);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      canvas.width = w;
      canvas.height = h;
      logicalSizeRef.current = { width: w, height: h };
      gradientOffscreenRef.current = new OffscreenCanvas(w, h);
      rebuildBaseOffscreen();
      renderFrame();
    };

    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", finishStroke);
    canvas.addEventListener("pointerleave", finishStroke);
    canvas.addEventListener("pointercancel", finishStroke);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    isReadyRef.current = true;

    const currentPoints = currentPointsRef.current;
    const pendingCommitIds = pendingCommitIdsRef.current;

    return () => {
      isReadyRef.current = false;
      stopAnimationLoop();
      currentPoints.length = 0;
      animatingStrokesRef.current = [];
      pendingCommitIds.clear();
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", finishStroke);
      canvas.removeEventListener("pointerleave", finishStroke);
      canvas.removeEventListener("pointercancel", finishStroke);
      baseOffscreenRef.current = null;
      gradientOffscreenRef.current = null;
    };
  }, [
    canvasRef,
    rebuildBaseOffscreen,
    renderFrame,
    startAnimationLoop,
    stopAnimationLoop,
  ]);

  // Sync stroke IDs
  useEffect(() => {
    const maxId = config.strokes.reduce(
      (highest, stroke) => Math.max(highest, stroke.id),
      0,
    );
    for (const stroke of config.strokes) {
      pendingCommitIdsRef.current.delete(stroke.id);
    }
    if (config.strokes.length === 0) {
      animatingStrokesRef.current = [];
      pendingCommitIdsRef.current.clear();
    }
    if (nextStrokeIdRef.current <= maxId) {
      nextStrokeIdRef.current = maxId + 1;
    }
  }, [config.strokes]);

  // Re-render when config changes
  useEffect(() => {
    if (!isReadyRef.current) return;
    rebuildBaseOffscreen();
    renderFrame();
    startAnimationLoop();
  }, [
    config.strokes,
    config.lockedStrokeCount,
    config.style,
    config.gradientMode,
    config.renderConfig,
    rebuildBaseOffscreen,
    renderFrame,
    startAnimationLoop,
  ]);
}
