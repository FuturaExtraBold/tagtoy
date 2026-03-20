import { useMemo, useRef } from "react";

import { useCanvas } from "../contexts/CanvasContext";
import { useStyle } from "../contexts/StyleContext";
import { usePixiCanvas } from "../hooks/usePixiCanvas";
import type { RenderConfig } from "../types/drawing";

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { strokes, activeStyle, gradientMode, addStroke } = useCanvas();
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
      showOverspray: style.showOverspray,
      oversprayAmount: style.oversprayAmount,
      showInnerAccent: style.showInnerAccent,
      innerAccentAmount: style.innerAccentAmount,
      innerAccentSize: style.innerAccentSize,
      innerAccentColor: style.innerAccentColor,
      showBackAccent: style.showBackAccent,
      backAccentAmount: style.backAccentAmount,
      backAccentSize: style.backAccentSize,
      backAccentColor: style.backAccentColor,
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
      style.showOverspray,
      style.oversprayAmount,
      style.showInnerAccent,
      style.innerAccentAmount,
      style.innerAccentSize,
      style.innerAccentColor,
      style.showBackAccent,
      style.backAccentAmount,
      style.backAccentSize,
      style.backAccentColor,
      style.pressureSensitivity,
      style.sensitivity,
    ],
  );

  usePixiCanvas(canvasRef, {
    strokes,
    style: activeStyle,
    gradientMode,
    renderConfig,
    onStrokeComplete: addStroke,
  });

  return <div ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}
