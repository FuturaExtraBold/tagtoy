/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type { GradientMode, Stroke, StyleMode } from "../types/drawing";

interface CanvasContextValue {
  strokes: Stroke[];
  lockedStrokeCount: number;
  activeStyle: StyleMode;
  gradientMode: GradientMode;
  background: string;
  blend: boolean;
  paintTexture: HTMLImageElement | null;
  addStroke: (s: Stroke) => void;
  undo: () => void;
  clear: () => void;
  exportImage: () => void;
  setStyle: (m: StyleMode) => void;
  setGradientMode: (m: GradientMode) => void;
  setBackground: (b: string) => void;
  setBlend: (b: boolean) => void;
  setPaintTexture: (img: HTMLImageElement | null) => void;
  registerCanvas: (el: HTMLCanvasElement | null) => void;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [strokeState, setStrokeState] = useState<{
    strokes: Stroke[];
    lockedStrokeCount: number;
  }>({ strokes: [], lockedStrokeCount: 0 });
  const [activeStyle, setActiveStyle] = useState<StyleMode>("tag");
  const [gradientMode, setGradientMode] = useState<GradientMode>("combined");
  const [background, setBackground] = useState("");
  const [blend, setBlend] = useState(false);
  const [paintTexture, setPaintTexture] = useState<HTMLImageElement | null>(
    null,
  );

  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundRef = useRef(background);
  const blendRef = useRef(blend);

  useEffect(() => {
    backgroundRef.current = background;
  }, [background]);
  useEffect(() => {
    blendRef.current = blend;
  }, [blend]);

  const registerCanvas = useCallback((el: HTMLCanvasElement | null) => {
    canvasElRef.current = el;
  }, []);

  const exportImage = useCallback(() => {
    const gpuCanvas = canvasElRef.current;
    if (!gpuCanvas) return;

    const w = gpuCanvas.width;
    const h = gpuCanvas.height;

    const offscreen = document.createElement("canvas");
    offscreen.width = w;
    offscreen.height = h;
    // Use display-p3 to match the browser's wide-color rendering of the WebGPU
    // canvas — prevents desaturation when compositing on P3 displays.
    const ctx =
      offscreen.getContext("2d", { colorSpace: "display-p3" }) ??
      offscreen.getContext("2d");
    if (!ctx) return;

    const composite = () => {
      // White base
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);

      if (blendRef.current) {
        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(gpuCanvas, 0, 0);
        ctx.globalCompositeOperation = "source-over";
      } else {
        ctx.drawImage(gpuCanvas, 0, 0);
      }

      offscreen.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "graf.png";
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };

    if (backgroundRef.current) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h);
        if (blendRef.current) {
          ctx.globalCompositeOperation = "multiply";
          ctx.drawImage(gpuCanvas, 0, 0);
          ctx.globalCompositeOperation = "source-over";
        } else {
          ctx.drawImage(gpuCanvas, 0, 0);
        }
        offscreen.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "graf.png";
          a.click();
          URL.revokeObjectURL(url);
        }, "image/png");
      };
      img.src = `/backgrounds/${backgroundRef.current}`;
    } else {
      composite();
    }
  }, []);

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
        blend,
        paintTexture,
        addStroke,
        undo,
        clear,
        exportImage,
        setStyle: setActiveStyle,
        setGradientMode,
        setBackground,
        setBlend,
        setPaintTexture,
        registerCanvas,
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
