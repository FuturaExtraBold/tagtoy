import { useRef, useEffect, useCallback } from 'react';
import { renderTag, renderThrowup, renderBurner } from './render.js';

export default function Canvas({ strokes, style, gradientMode, renderConfig, onStrokeComplete }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const currentPoints = useRef([]);
  const rafRef = useRef(null);

  // Always-current refs so pointer handlers never close over stale values
  const strokesRef = useRef(strokes);
  const styleRef = useRef(style);
  const gradientModeRef = useRef(gradientMode);
  const renderConfigRef = useRef(renderConfig);
  strokesRef.current = strokes;
  styleRef.current = style;
  gradientModeRef.current = gradientMode;
  renderConfigRef.current = renderConfig;

  const doRedraw = useCallback((committed, activePts, s, gm, cfg) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const all = activePts && activePts.length > 1
      ? [...committed, { points: activePts }]
      : committed;

    if (s === 'tag') {
      renderTag(ctx, all, cfg);
    } else if (s === 'throwup') {
      renderThrowup(ctx, all, cfg);
    } else {
      renderBurner(ctx, all, gm, cfg);
    }
  }, []);

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      doRedraw(
        strokesRef.current,
        currentPoints.current,
        styleRef.current,
        gradientModeRef.current,
        renderConfigRef.current,
      );
    });
  }, [doRedraw]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    doRedraw(strokesRef.current, currentPoints.current, styleRef.current, gradientModeRef.current, renderConfigRef.current);
  }, [doRedraw]);

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    doRedraw(strokes, currentPoints.current, style, gradientMode, renderConfig);
  }, [strokes, style, gradientMode, renderConfig, doRedraw]);

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure,
    };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    currentPoints.current = [getPoint(e)];
    canvasRef.current.setPointerCapture(e.pointerId);
    scheduleRedraw();
  };

  const onPointerMove = (e) => {
    if (!isDrawing.current) return;
    currentPoints.current = [...currentPoints.current, getPoint(e)];
    scheduleRedraw();
  };

  const finishStroke = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (currentPoints.current.length > 1) {
      onStrokeComplete({ points: [...currentPoints.current] });
    }
    currentPoints.current = [];
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishStroke}
      onPointerLeave={finishStroke}
      style={{ touchAction: 'none' }}
    />
  );
}
