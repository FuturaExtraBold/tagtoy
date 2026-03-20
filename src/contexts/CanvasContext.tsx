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
  lockedStrokeCount: number;
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
  const [strokeState, setStrokeState] = useState<{
    strokes: Stroke[];
    lockedStrokeCount: number;
  }>({ strokes: [], lockedStrokeCount: 0 });
  const [activeStyle, setActiveStyle] = useState<StyleMode>("tag");
  const [gradientMode, setGradientMode] = useState<GradientMode>("overlay");
  const [background, setBackground] = useState("");

  const addStroke = useCallback((s: Stroke) => {
    setStrokeState((prev) => {
      const undoableCount = prev.strokes.length - prev.lockedStrokeCount;

      return {
        strokes: [...prev.strokes, s],
        lockedStrokeCount:
          undoableCount >= 50
            ? prev.lockedStrokeCount + 1
            : prev.lockedStrokeCount,
      };
    });
  }, []);

  const undo = useCallback(() => {
    setStrokeState((prev) => {
      if (prev.strokes.length <= prev.lockedStrokeCount) {
        return prev;
      }

      return {
        strokes: prev.strokes.slice(0, -1),
        lockedStrokeCount: prev.lockedStrokeCount,
      };
    });
  }, []);

  const clear = useCallback(() => {
    setStrokeState({ strokes: [], lockedStrokeCount: 0 });
  }, []);

  return (
    <CanvasContext.Provider
      value={{
        strokes: strokeState.strokes,
        lockedStrokeCount: strokeState.lockedStrokeCount,
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
