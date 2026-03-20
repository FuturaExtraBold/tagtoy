import { Application, Container, Graphics } from "pixi.js";
import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";

import {
  renderBurner,
  renderTag,
  renderThrowup,
} from "../renderer/pixiRenderer";
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

export function usePixiCanvas(
  containerRef: RefObject<HTMLDivElement | null>,
  config: PixiCanvasConfig,
): void {
  const configRef = useRef(config);
  useLayoutEffect(() => {
    configRef.current = config;
  });

  const appRef = useRef<Application | null>(null);
  const committedRef = useRef<Container | null>(null);
  const activeGraphicsRef = useRef<Graphics | null>(null);
  const isReadyRef = useRef(false);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const committedGraphicsListRef = useRef<Graphics[]>([]);

  // PixiJS init — PixiJS creates its own <canvas>, we append it to the container.
  // This avoids the StrictMode WebGL context-loss problem: each cycle gets its
  // own fresh canvas element, so app.destroy() on cycle N can't corrupt cycle N+1.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new Application();
    const committed = new Container();
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

      app.stage.addChild(committed);
      appRef.current = app;
      committedRef.current = committed;
      window.addEventListener("resize", handleResize);
      isReadyRef.current = true;
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
      committedRef.current = null;
      activeGraphicsRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild committed strokes after every render that changes strokes/config.
  useEffect(() => {
    if (!isReadyRef.current || !committedRef.current) return;

    const { strokes, style, gradientMode, renderConfig } = configRef.current;
    const committed = committedRef.current;

    committed.removeChildren();
    committedGraphicsListRef.current = [];

    if (strokes.length === 0) return;

    if (style === "burner" && gradientMode === "combined") {
      const g = new Graphics();
      renderBurner(g, strokes, gradientMode, renderConfig);
      committed.addChild(g);
      committedGraphicsListRef.current = [g];
    } else {
      for (const s of strokes) {
        const g = new Graphics();
        if (style === "tag") {
          renderTag(g, [s], renderConfig);
        } else if (style === "throwup") {
          renderThrowup(g, [s], renderConfig);
        } else {
          renderBurner(g, [s], gradientMode, renderConfig);
        }
        committed.addChild(g);
        committedGraphicsListRef.current.push(g);
      }
    }
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

      const active = new Graphics();
      activeGraphicsRef.current = active;
      appRef.current.stage.addChild(active);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current || !activeGraphicsRef.current) return;
      currentPointsRef.current = [...currentPointsRef.current, getPoint(e)];

      const pts = currentPointsRef.current;
      if (pts.length < 2) return;

      const { style, gradientMode, renderConfig } = configRef.current;
      const active = activeGraphicsRef.current;
      active.clear();

      const preview: Stroke = { points: pts };
      if (style === "tag") {
        renderTag(active, [preview], renderConfig);
      } else if (style === "throwup") {
        renderThrowup(active, [preview], renderConfig);
      } else {
        renderBurner(active, [preview], gradientMode, renderConfig);
      }
    };

    const finishStroke = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      if (activeGraphicsRef.current && appRef.current) {
        appRef.current.stage.removeChild(activeGraphicsRef.current);
        activeGraphicsRef.current.destroy();
        activeGraphicsRef.current = null;
      }

      if (currentPointsRef.current.length > 1) {
        configRef.current.onStrokeComplete({
          points: [...currentPointsRef.current],
        });
      }
      currentPointsRef.current = [];
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
  }, []);  
}
