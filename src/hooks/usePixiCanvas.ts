import { Application, Container } from "pixi.js";
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

import { createStyleDisplay } from "../renderer/pixiRenderer";
import type {
  GradientMode,
  Point,
  RenderConfig,
  Stroke,
  StyleMode,
} from "../types/drawing";

interface PixiCanvasConfig {
  strokes: Stroke[];
  style: StyleMode;
  gradientMode: GradientMode;
  renderConfig: RenderConfig;
  onStrokeComplete: (stroke: Stroke) => void;
}

const DRIP_ANIMATION_MS = 650;

type AnimatingStroke = {
  stroke: Stroke;
  startedAt: number;
};

function destroyChildren(container: Container): void {
  const children = container.removeChildren();
  for (const child of children) {
    child.destroy({ children: true });
  }
}

export function usePixiCanvas(
  containerRef: RefObject<HTMLDivElement | null>,
  config: PixiCanvasConfig,
): void {
  const configRef = useRef(config);
  useLayoutEffect(() => {
    configRef.current = config;
  });

  const appRef = useRef<Application | null>(null);
  const transientUnderlayRef = useRef<Container | null>(null);
  const committedRef = useRef<Container | null>(null);
  const transientOverlayRef = useRef<Container | null>(null);
  const isReadyRef = useRef(false);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const animatingStrokesRef = useRef<AnimatingStroke[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const rebuildScene = useCallback(() => {
    if (
      !isReadyRef.current ||
      !transientUnderlayRef.current ||
      !committedRef.current ||
      !transientOverlayRef.current
    ) {
      return;
    }

    const { strokes, style, gradientMode, renderConfig } = configRef.current;
    const underlay = transientUnderlayRef.current;
    const committed = committedRef.current;
    const overlay = transientOverlayRef.current;
    const now = performance.now();

    destroyChildren(underlay);
    destroyChildren(committed);
    destroyChildren(overlay);

    animatingStrokesRef.current = animatingStrokesRef.current.filter(
      ({ stroke, startedAt }) =>
        strokes.includes(stroke) && now - startedAt < DRIP_ANIMATION_MS,
    );

    const animatingStrokeSet = new Set(
      animatingStrokesRef.current.map(({ stroke }) => stroke),
    );
    const settledStrokes = strokes.filter(
      (stroke) => !animatingStrokeSet.has(stroke),
    );

    if (settledStrokes.length > 0) {
      if (style === "burner" && gradientMode === "combined") {
        committed.addChild(
          createStyleDisplay(style, settledStrokes, gradientMode, renderConfig),
        );
      } else {
        const orderedSettledStrokes =
          style === "throwup" ? [...settledStrokes].reverse() : settledStrokes;

        for (const stroke of orderedSettledStrokes) {
          committed.addChild(
            createStyleDisplay(style, [stroke], gradientMode, renderConfig),
          );
        }
      }
    }

    if (style === "throwup") {
      if (currentPointsRef.current.length > 1) {
        underlay.addChild(
          createStyleDisplay(
            style,
            [{ points: [...currentPointsRef.current] }],
            gradientMode,
            renderConfig,
            { includeDrips: false },
          ),
        );
      }

      for (const animation of [...animatingStrokesRef.current].reverse()) {
        underlay.addChild(
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
            },
          ),
        );
      }
    } else {
      for (const animation of animatingStrokesRef.current) {
        overlay.addChild(
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
            },
          ),
        );
      }

      if (currentPointsRef.current.length > 1) {
        overlay.addChild(
          createStyleDisplay(
            style,
            [{ points: [...currentPointsRef.current] }],
            gradientMode,
            renderConfig,
            { includeDrips: false },
          ),
        );
      }
    }
  }, []);

  const startAnimationLoop = useCallback(() => {
    if (
      animationFrameRef.current !== null ||
      animatingStrokesRef.current.length === 0
    ) {
      return;
    }

    const tick = () => {
      animationFrameRef.current = null;
      rebuildScene();

      if (animatingStrokesRef.current.length > 0) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);
  }, [rebuildScene]);

  // PixiJS init — PixiJS creates its own <canvas>, we append it to the container.
  // This avoids the StrictMode WebGL context-loss problem: each cycle gets its
  // own fresh canvas element, so app.destroy() on cycle N can't corrupt cycle N+1.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new Application();
    const transientUnderlay = new Container();
    const committed = new Container();
    const transientOverlay = new Container();
    let initCompleted = false;
    let cleanupCalled = false;

    const handleResize = () => {
      app.renderer.resize(window.innerWidth, window.innerHeight);
    };

    async function init() {
      await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        backgroundAlpha: 0,
        antialias: true,
      });

      initCompleted = true;

      // Cleanup ran while we were awaiting — destroy now that renderer exists.
      if (cleanupCalled || !container!.isConnected) {
        app.destroy(true, { children: true });
        return;
      }

      const canvas = app.canvas as HTMLCanvasElement;
      canvas.style.touchAction = "none";
      container!.appendChild(canvas);

      app.stage.addChild(transientUnderlay);
      app.stage.addChild(committed);
      app.stage.addChild(transientOverlay);
      appRef.current = app;
      transientUnderlayRef.current = transientUnderlay;
      committedRef.current = committed;
      transientOverlayRef.current = transientOverlay;
      window.addEventListener("resize", handleResize);
      isReadyRef.current = true;
      rebuildScene();
    }

    init().catch(console.error);

    return () => {
      cleanupCalled = true;
      isReadyRef.current = false;
      window.removeEventListener("resize", handleResize);

      if (initCompleted) {
        // Renderer exists — safe to destroy.
        const canvas = app.canvas as HTMLCanvasElement;
        if (container!.contains(canvas)) container!.removeChild(canvas);
        app.destroy(true, { children: true });
      }
      // If init hasn't completed, the async init() will call destroy() when it resolves.

      appRef.current = null;
      transientUnderlayRef.current = null;
      committedRef.current = null;
      transientOverlayRef.current = null;
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [containerRef, rebuildScene]);

  // Rebuild committed strokes after every render that changes strokes/config.
  useEffect(() => {
    rebuildScene();
    startAnimationLoop();
  });

  // Pointer events — attached to the PixiJS-owned canvas once it exists.
  // We wait for isReadyRef via a polling effect so we don't miss the async init.
  useEffect(() => {
    let canvas: HTMLCanvasElement | null = null;

    const getPoint = (e: PointerEvent): Point => {
      const rect = canvas!.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pressure,
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!appRef.current) return;
      e.preventDefault();
      isDrawingRef.current = true;
      currentPointsRef.current = [getPoint(e)];
      canvas!.setPointerCapture(e.pointerId);
      rebuildScene();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      currentPointsRef.current = [...currentPointsRef.current, getPoint(e)];
      rebuildScene();
    };

    const finishStroke = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      const finishedPoints = [...currentPointsRef.current];
      currentPointsRef.current = [];

      if (finishedPoints.length > 1) {
        const stroke = { points: finishedPoints };
        const { renderConfig, style } = configRef.current;

        if (renderConfig.showDrips && style !== "tag") {
          animatingStrokesRef.current.push({
            stroke,
            startedAt: performance.now(),
          });
        }

        configRef.current.onStrokeComplete(stroke);
      }

      rebuildScene();
      startAnimationLoop();
    };

    // Poll until PixiJS finishes its async init and appends the canvas.
    const interval = setInterval(() => {
      if (!isReadyRef.current || !appRef.current) return;
      clearInterval(interval);

      canvas = appRef.current.canvas as HTMLCanvasElement;
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", finishStroke);
      canvas.addEventListener("pointerleave", finishStroke);
    }, 16);

    return () => {
      clearInterval(interval);
      if (canvas) {
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", finishStroke);
        canvas.removeEventListener("pointerleave", finishStroke);
      }
    };
  }, [rebuildScene, startAnimationLoop]);
}
