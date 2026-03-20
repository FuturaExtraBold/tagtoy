/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

import type { GradientMode, Stroke, StyleMode } from "../types/drawing";

interface CanvasContextValue {
  strokes: Stroke[];
  activeStyle: StyleMode;
  gradientMode: GradientMode;
  background: string;
  addStroke: (s: Stroke) => void;
  undo: () => void;
  clear: () => void;
  setStyle: (m: StyleMode) => void;
  setGradientMode: (m: GradientMode) => void;
  setBackground: (b: string) => void;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeStyle, setActiveStyle] = useState<StyleMode>("tag");
  const [gradientMode, setGradientMode] = useState<GradientMode>("overlay");
  const [background, setBackground] = useState("");

  const addStroke = useCallback((s: Stroke) => {
    setStrokes((prev) => [...prev, s]);
  }, []);

  const undo = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  const clear = useCallback(() => {
    setStrokes([]);
  }, []);

  return (
    <CanvasContext.Provider
      value={{
        strokes,
        activeStyle,
        gradientMode,
        background,
        addStroke,
        undo,
        clear,
        setStyle: setActiveStyle,
        setGradientMode,
        setBackground,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas(): CanvasContextValue {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error("useCanvas must be used within CanvasProvider");
  return ctx;
}
