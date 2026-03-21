import { useMemo, useRef } from "react";

import { useCanvas } from "../contexts/CanvasContext";
import { useStyle } from "../contexts/StyleContext";
import { useDrawingCanvas } from "../hooks/useDrawingCanvas";
import type { RenderConfig } from "../types/drawing";

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { strokes, lockedStrokeCount, activeStyle, gradientMode, addStroke } =
    useCanvas();
  const style = useStyle();

  const renderConfig: RenderConfig = useMemo(
    () => ({
      brushType: style.brushType,
      brushSize: style.brushSize,
      shadowOffset: style.shadowOffset,
      shadowColor: style.shadowColor,
      shadowAngle: style.shadowAngle,
      shadowAttached: style.shadowAttached,
      outlineSize: style.outlineSize,
      outlineColor: style.outlineColor,
      throwupColor: style.throwupColor,
      gradientStart: style.gradientStart,
      gradientEnd: style.gradientEnd,
      showDrips: style.showDrips,
      dripCount: style.dripCount,
      pressureSensitivity: style.pressureSensitivity,
      sensitivity: style.sensitivity,
    }),
    [
      style.brushType,
      style.brushSize,
      style.shadowOffset,
      style.shadowColor,
      style.shadowAngle,
      style.shadowAttached,
      style.outlineSize,
      style.outlineColor,
      style.throwupColor,
      style.gradientStart,
      style.gradientEnd,
      style.showDrips,
      style.dripCount,
      style.pressureSensitivity,
      style.sensitivity,
    ],
  );

  useDrawingCanvas(canvasRef, {
    strokes,
    lockedStrokeCount,
    style: activeStyle,
    gradientMode,
    renderConfig,
    onStrokeComplete: addStroke,
  });

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
