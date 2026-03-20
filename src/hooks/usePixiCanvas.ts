import { Application, Container, RenderTexture, Sprite } from "pixi.js";
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

import { createStyleDisplay } from "../renderer/pixiRenderer";
import { getDrawingBounds } from "../renderer/renderHelpers";
import type {
  GradientMode,
  Point,
  RenderConfig,
  Stroke,
  StyleMode,
} from "../types/drawing";

interface PixiCanvasConfig {
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

function destroyChildren(container: Container): void {
  const children = container.removeChildren();
  for (const child of children) {
    child.destroy({ children: true });
  }
}

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

  if (Math.abs(next.pressure - current.pressure) >= MIN_PRESSURE_DELTA) {
    return true;
  }

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

  if (simplified.length > 2) {
    return simplified;
  }

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

function buildCommittedDisplay(
  style: StyleMode,
  strokes: Stroke[],
  gradientMode: GradientMode,
  renderConfig: RenderConfig,
  options: {
    includeDrips?: boolean;
    gradientBounds?: Bounds;
  } = {},
): Container {
  if (strokes.length === 0) {
    return new Container();
  }

  if (style === "burner" && gradientMode === "combined") {
    return createStyleDisplay(style, strokes, gradientMode, renderConfig, {
      includeDrips: options.includeDrips,
      gradientBounds: options.gradientBounds,
    });
  }

  const ordered = style === "throwup" ? [...strokes].reverse() : strokes;
  const container = new Container();

  for (const stroke of ordered) {
    if (stroke.renderPoints.length < 2) continue;
    container.addChild(
      createStyleDisplay(style, [stroke], gradientMode, renderConfig, {
        includeDrips: options.includeDrips,
        gradientBounds: options.gradientBounds,
      }),
    );
  }

  return container;
}

export function usePixiCanvas(
  containerRef: RefObject<HTMLDivElement | null>,
  config: PixiCanvasConfig,
): void {
  const configRef = useRef(config);

  useLayoutEffect(() => {
    configRef.current = config;
  }, [config]);

  const appRef = useRef<Application | null>(null);
  const baseLayerRef = useRef<Container | null>(null);
  const liveLayerRef = useRef<Container | null>(null);
  const previewLayerRef = useRef<Container | null>(null);
  const fxLayerRef = useRef<Container | null>(null);
  const baseTextureRef = useRef<RenderTexture | null>(null);
  const baseSpriteRef = useRef<Sprite | null>(null);
  const isReadyRef = useRef(false);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const animatingStrokesRef = useRef<AnimatingStroke[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const nextStrokeIdRef = useRef(1);
  const lastAnimationIdsRef = useRef("");
  const pendingCommitIdsRef = useRef<Set<number>>(new Set());

  const syncStageOrder = useCallback(() => {
    const app = appRef.current;
    const baseLayer = baseLayerRef.current;
    const liveLayer = liveLayerRef.current;
    const previewLayer = previewLayerRef.current;
    const fxLayer = fxLayerRef.current;

    if (!app || !baseLayer || !liveLayer || !previewLayer || !fxLayer) {
      return;
    }

    const { style } = configRef.current;

    app.stage.removeChildren();

    if (style === "throwup") {
      app.stage.addChild(previewLayer);
      app.stage.addChild(fxLayer);
      app.stage.addChild(baseLayer);
      app.stage.addChild(liveLayer);
      return;
    }

    app.stage.addChild(baseLayer);
    app.stage.addChild(liveLayer);
    app.stage.addChild(fxLayer);
    app.stage.addChild(previewLayer);
  }, []);

  const ensureBaseTexture = useCallback(() => {
    const app = appRef.current;
    const baseLayer = baseLayerRef.current;

    if (!app || !baseLayer) return null;

    const width = Math.max(1, Math.round(app.renderer.width));
    const height = Math.max(1, Math.round(app.renderer.height));

    if (!baseTextureRef.current) {
      baseTextureRef.current = RenderTexture.create({
        width,
        height,
        resolution: app.renderer.resolution,
        antialias: true,
      });
    } else if (
      baseTextureRef.current.width !== width ||
      baseTextureRef.current.height !== height
    ) {
      baseTextureRef.current.resize(width, height, app.renderer.resolution);
    }

    if (!baseSpriteRef.current) {
      baseSpriteRef.current = new Sprite(baseTextureRef.current);
      baseLayer.addChild(baseSpriteRef.current);
    }

    return baseTextureRef.current;
  }, []);

  const getGlobalGradientBounds = useCallback(
    (extraPoints?: Point[]): Bounds | undefined => {
      const { style, gradientMode, strokes, renderConfig } = configRef.current;

      if (style !== "burner" || gradientMode !== "combined") {
        return undefined;
      }

      const gradientStrokes =
        extraPoints && extraPoints.length > 1
          ? [...strokes, createStroke(-1, extraPoints)]
          : strokes;

      if (gradientStrokes.length === 0) {
        return undefined;
      }

      const pad =
        Math.max(renderConfig.brushSize, renderConfig.outlineSize) / 2;
      return getDrawingBounds(gradientStrokes, pad);
    },
    [],
  );

  const getActiveAnimations = useCallback(() => {
    const now = performance.now();
    const strokeIds = new Set(
      configRef.current.strokes.map((stroke) => stroke.id),
    );

    animatingStrokesRef.current = animatingStrokesRef.current.filter(
      ({ stroke, startedAt }) =>
        now - startedAt < DRIP_ANIMATION_MS &&
        (strokeIds.has(stroke.id) ||
          (pendingCommitIdsRef.current.has(stroke.id) &&
            now - startedAt < STROKE_COMMIT_GRACE_MS)),
    );

    return animatingStrokesRef.current;
  }, []);

  const rebuildBaseLayer = useCallback(() => {
    const app = appRef.current;
    const baseSprite = baseSpriteRef.current;

    if (!app) return;

    const baseTexture = ensureBaseTexture();
    if (!baseTexture) return;

    const { strokes, lockedStrokeCount, style, gradientMode, renderConfig } =
      configRef.current;
    const lockedStrokes = strokes.slice(0, lockedStrokeCount);
    const gradientBounds = getGlobalGradientBounds();
    const display = buildCommittedDisplay(
      style,
      lockedStrokes,
      gradientMode,
      renderConfig,
      { includeDrips: false, gradientBounds },
    );

    app.renderer.render({
      container: display,
      target: baseTexture,
      clear: true,
    });
    display.destroy({ children: true });

    if (baseSprite) {
      baseSprite.visible = lockedStrokes.length > 0;
    }
  }, [ensureBaseTexture, getGlobalGradientBounds]);

  const rebuildLiveLayer = useCallback(() => {
    const liveLayer = liveLayerRef.current;
    if (!liveLayer) return;

    destroyChildren(liveLayer);

    const { strokes, lockedStrokeCount, style, gradientMode, renderConfig } =
      configRef.current;
    const animatingIds = new Set(
      getActiveAnimations().map(({ stroke }) => stroke.id),
    );
    const liveStrokes = strokes
      .slice(lockedStrokeCount)
      .filter((stroke) => !animatingIds.has(stroke.id));

    if (liveStrokes.length === 0) return;

    liveLayer.addChild(
      buildCommittedDisplay(style, liveStrokes, gradientMode, renderConfig, {
        includeDrips: false,
        gradientBounds: getGlobalGradientBounds(),
      }),
    );
  }, [getActiveAnimations, getGlobalGradientBounds]);

  const rebuildPreviewLayer = useCallback(() => {
    const previewLayer = previewLayerRef.current;
    if (!previewLayer) return;

    destroyChildren(previewLayer);

    if (currentPointsRef.current.length < 2) return;

    const { style, gradientMode, renderConfig } = configRef.current;
    const previewStroke = createStroke(-1, currentPointsRef.current);

    previewLayer.addChild(
      createStyleDisplay(style, [previewStroke], gradientMode, renderConfig, {
        includeDrips: false,
        gradientBounds: getGlobalGradientBounds(currentPointsRef.current),
      }),
    );
  }, [getGlobalGradientBounds]);

  const rebuildFxLayer = useCallback(() => {
    const fxLayer = fxLayerRef.current;
    if (!fxLayer) return false;

    destroyChildren(fxLayer);

    const { style, gradientMode, renderConfig } = configRef.current;
    const animations = getActiveAnimations();

    if (animations.length === 0) {
      lastAnimationIdsRef.current = "";
      return false;
    }

    const orderedAnimations =
      style === "throwup" ? [...animations].reverse() : animations;
    const now = performance.now();

    for (const animation of orderedAnimations) {
      fxLayer.addChild(
        createStyleDisplay(
          style,
          [animation.stroke],
          gradientMode,
          renderConfig,
          {
            dripProgress: Math.min(
              1,
              (now - animation.startedAt) / DRIP_ANIMATION_MS,
            ),
            gradientBounds: getGlobalGradientBounds(),
          },
        ),
      );
    }

    lastAnimationIdsRef.current = animations
      .map(({ stroke }) => stroke.id)
      .join(",");

    return true;
  }, [getActiveAnimations, getGlobalGradientBounds]);

  const rebuildCommittedLayers = useCallback(() => {
    if (!isReadyRef.current) return;

    syncStageOrder();
    rebuildBaseLayer();
    rebuildLiveLayer();
  }, [rebuildBaseLayer, rebuildLiveLayer, syncStageOrder]);

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
      const hadAnimations = lastAnimationIdsRef.current.length > 0;
      const hasAnimations = rebuildFxLayer();

      if (hadAnimations && !hasAnimations) {
        rebuildLiveLayer();
      }

      if (hasAnimations) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
      }
    };

    if (getActiveAnimations().length > 0) {
      animationFrameRef.current = window.requestAnimationFrame(tick);
    }
  }, [getActiveAnimations, rebuildFxLayer, rebuildLiveLayer]);

  const resizeRenderer = useCallback(() => {
    const app = appRef.current;
    const container = containerRef.current;

    if (!app || !container) return;

    const width = Math.max(
      1,
      Math.round(container.clientWidth || window.innerWidth),
    );
    const height = Math.max(
      1,
      Math.round(container.clientHeight || window.innerHeight),
    );

    app.renderer.resize(width, height);
    rebuildCommittedLayers();
    rebuildPreviewLayer();
    rebuildFxLayer();
  }, [
    containerRef,
    rebuildCommittedLayers,
    rebuildFxLayer,
    rebuildPreviewLayer,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const root = container;

    const app = new Application();
    const baseLayer = new Container();
    const liveLayer = new Container();
    const previewLayer = new Container();
    const fxLayer = new Container();
    let cleanupCalled = false;
    let canvas: HTMLCanvasElement | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let pointerListenersAttached = false;

    const getPoint = (event: PointerEvent): Point => {
      const rect = canvas!.getBoundingClientRect();

      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        pressure: event.pressure,
      };
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!canvas) return;

      event.preventDefault();
      isDrawingRef.current = true;
      currentPointsRef.current.length = 0;
      currentPointsRef.current.push(getPoint(event));
      canvas.setPointerCapture(event.pointerId);
      rebuildPreviewLayer();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isDrawingRef.current) return;

      appendPoint(currentPointsRef.current, getPoint(event));
      rebuildPreviewLayer();
    };

    const finishStroke = (event?: PointerEvent) => {
      if (!isDrawingRef.current) return;

      if (canvas && event) {
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // Pointer capture may already be released.
        }
      }

      isDrawingRef.current = false;
      const committedPoints = currentPointsRef.current.slice();
      currentPointsRef.current.length = 0;
      rebuildPreviewLayer();

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
        rebuildFxLayer();
        startAnimationLoop();
      }

      configRef.current.onStrokeComplete(stroke);
    };

    async function init() {
      await app.init({
        width: Math.max(1, root.clientWidth || window.innerWidth),
        height: Math.max(1, root.clientHeight || window.innerHeight),
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        backgroundColor: 0xffffff,
        antialias: true,
      });

      if (cleanupCalled || !root.isConnected) {
        app.destroy(true, { children: true });
        return;
      }

      canvas = app.canvas as HTMLCanvasElement;
      canvas.style.touchAction = "none";
      root.appendChild(canvas);

      appRef.current = app;
      baseLayerRef.current = baseLayer;
      liveLayerRef.current = liveLayer;
      previewLayerRef.current = previewLayer;
      fxLayerRef.current = fxLayer;

      syncStageOrder();
      ensureBaseTexture();
      isReadyRef.current = true;

      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", finishStroke);
      canvas.addEventListener("pointerleave", finishStroke);
      canvas.addEventListener("pointercancel", finishStroke);
      pointerListenersAttached = true;

      resizeObserver = new ResizeObserver(() => {
        resizeRenderer();
      });
      resizeObserver.observe(root);

      rebuildCommittedLayers();
      rebuildPreviewLayer();
      rebuildFxLayer();
      startAnimationLoop();
    }

    init().catch(console.error);

    const currentPoints = currentPointsRef.current;
    const pendingCommitIds = pendingCommitIdsRef.current;

    return () => {
      cleanupCalled = true;
      isReadyRef.current = false;
      stopAnimationLoop();
      currentPoints.length = 0;
      animatingStrokesRef.current = [];
      lastAnimationIdsRef.current = "";
      pendingCommitIds.clear();

      resizeObserver?.disconnect();

      if (canvas && pointerListenersAttached) {
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", finishStroke);
        canvas.removeEventListener("pointerleave", finishStroke);
        canvas.removeEventListener("pointercancel", finishStroke);
      }

      if (baseTextureRef.current) {
        baseTextureRef.current.destroy(true);
        baseTextureRef.current = null;
      }

      baseSpriteRef.current = null;
      baseLayerRef.current = null;
      liveLayerRef.current = null;
      previewLayerRef.current = null;
      fxLayerRef.current = null;
      appRef.current = null;

      if (canvas && root.contains(canvas)) {
        root.removeChild(canvas);
      }

      if (app.renderer) {
        app.destroy(true, { children: true });
      }
    };
  }, [
    containerRef,
    ensureBaseTexture,
    rebuildCommittedLayers,
    rebuildFxLayer,
    rebuildPreviewLayer,
    resizeRenderer,
    startAnimationLoop,
    stopAnimationLoop,
    syncStageOrder,
  ]);

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
      lastAnimationIdsRef.current = "";
      pendingCommitIdsRef.current.clear();
    }

    if (nextStrokeIdRef.current <= maxId) {
      nextStrokeIdRef.current = maxId + 1;
    }
  }, [config.strokes]);

  useEffect(() => {
    if (!isReadyRef.current) return;

    rebuildCommittedLayers();
    rebuildPreviewLayer();
    rebuildFxLayer();
    startAnimationLoop();
  }, [
    config.strokes,
    config.lockedStrokeCount,
    config.style,
    config.gradientMode,
    config.renderConfig,
    rebuildCommittedLayers,
    rebuildFxLayer,
    rebuildPreviewLayer,
    startAnimationLoop,
  ]);
}
