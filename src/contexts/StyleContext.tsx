/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

import { STYLE_DEFAULTS } from "../config/styleDefaults";
import type { BrushType, RenderConfig, ShadowAngle } from "../types/drawing";

interface StyleContextValue extends RenderConfig {
  setBrushType: (v: BrushType) => void;
  handleBrushSize: (v: number) => void;
  setShadowOffset: (v: number) => void;
  setShadowColor: (v: string) => void;
  setShadowAngle: (v: ShadowAngle) => void;
  setShadowAttached: (v: boolean) => void;
  setOutlineSize: (v: number) => void;
  setOutlineColor: (v: string) => void;
  setThrowupColor: (v: string) => void;
  setGradientStart: (v: string) => void;
  setGradientEnd: (v: string) => void;
  setShowDrips: (v: boolean) => void;
  setDripCount: (v: number) => void;
  setPressureSensitivity: (v: boolean) => void;
  setSensitivity: (v: number) => void;
}

const StyleContext = createContext<StyleContextValue | null>(null);

const { tag: TAG, throwup: THROWUP, burner: BURNER } = STYLE_DEFAULTS;

export function StyleProvider({ children }: { children: ReactNode }) {
  const [brushType, setBrushType] = useState<BrushType>(TAG.brushType);
  const [brushSize, setBrushSize] = useState(TAG.brushSize);
  const [shadowOffset, setShadowOffset] = useState(0);
  const [shadowColor, setShadowColor] = useState("#000000");
  const [shadowAngle, setShadowAngle] = useState<ShadowAngle>("45");
  const [shadowAttached, setShadowAttached] = useState(false);
  const [outlineSize, setOutlineSize] = useState(THROWUP.outlineSize);
  const [outlineColor, setOutlineColor] = useState(THROWUP.outlineColor);
  const [throwupColor, setThrowupColor] = useState(THROWUP.throwupColor);
  const [gradientStart, setGradientStart] = useState(BURNER.gradientStart);
  const [gradientEnd, setGradientEnd] = useState(BURNER.gradientEnd);
  const [showDrips, setShowDrips] = useState(TAG.showDrips);
  const [dripCount, setDripCount] = useState(TAG.dripCount);
  const [pressureSensitivity, setPressureSensitivity] = useState(false);
  const [sensitivity, setSensitivity] = useState(7);

  const handleBrushSize = useCallback((v: number) => {
    setBrushSize(v);
    setOutlineSize((s) => (s === 0 ? 0 : Math.max(v, Math.min(s, v * 2))));
  }, []);

  return (
    <StyleContext.Provider
      value={{
        brushType,
        setBrushType,
        brushSize,
        handleBrushSize,
        shadowOffset,
        setShadowOffset,
        shadowColor,
        setShadowColor,
        shadowAngle,
        setShadowAngle,
        shadowAttached,
        setShadowAttached,
        outlineSize,
        setOutlineSize,
        outlineColor,
        setOutlineColor,
        throwupColor,
        setThrowupColor,
        gradientStart,
        setGradientStart,
        gradientEnd,
        setGradientEnd,
        showDrips,
        setShowDrips,
        dripCount,
        setDripCount,
        pressureSensitivity,
        setPressureSensitivity,
        sensitivity,
        setSensitivity,
      }}
    >
      {children}
    </StyleContext.Provider>
  );
}

export function useStyle(): StyleContextValue {
  const ctx = useContext(StyleContext);
  if (!ctx) throw new Error("useStyle must be used within StyleProvider");
  return ctx;
}
