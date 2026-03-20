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
  setShowOverspray: (v: boolean) => void;
  setOversprayAmount: (v: number) => void;
  setShowInnerAccent: (v: boolean) => void;
  setInnerAccentAmount: (v: number) => void;
  setInnerAccentSize: (v: number) => void;
  setInnerAccentColor: (v: string) => void;
  setShowBackAccent: (v: boolean) => void;
  setBackAccentAmount: (v: number) => void;
  setBackAccentSize: (v: number) => void;
  setBackAccentColor: (v: string) => void;
  setPressureSensitivity: (v: boolean) => void;
  setSensitivity: (v: number) => void;
}

const StyleContext = createContext<StyleContextValue | null>(null);

const { tag: TAG, throwup: THROWUP, burner: BURNER } = STYLE_DEFAULTS;

export function StyleProvider({ children }: { children: ReactNode }) {
  const [brushType, setBrushType] = useState<BrushType>(TAG.brushType);
  const [brushSize, setBrushSize] = useState(TAG.brushSize);
  const [shadowOffset, setShadowOffset] = useState(THROWUP.shadowOffset);
  const [shadowColor, setShadowColor] = useState(THROWUP.shadowColor);
  const [shadowAngle, setShadowAngle] = useState<ShadowAngle>(
    THROWUP.shadowAngle,
  );
  const [shadowAttached, setShadowAttached] = useState(THROWUP.shadowAttached);
  const [outlineSize, setOutlineSize] = useState(THROWUP.outlineSize);
  const [outlineColor, setOutlineColor] = useState(THROWUP.outlineColor);
  const [throwupColor, setThrowupColor] = useState(THROWUP.throwupColor);
  const [gradientStart, setGradientStart] = useState(BURNER.gradientStart);
  const [gradientEnd, setGradientEnd] = useState(BURNER.gradientEnd);
  const [showDrips, setShowDrips] = useState(TAG.showDrips);
  const [dripCount, setDripCount] = useState(TAG.dripCount);
  const [pressureSensitivity, setPressureSensitivity] = useState(false);
  const [sensitivity, setSensitivity] = useState(7);
  const [showOverspray, setShowOverspray] = useState(TAG.showOverspray);
  const [oversprayAmount, setOversprayAmount] = useState(TAG.oversprayAmount);
  const [showInnerAccent, setShowInnerAccent] = useState(
    THROWUP.showInnerAccent,
  );
  const [innerAccentAmount, setInnerAccentAmount] = useState(
    THROWUP.innerAccentAmount,
  );
  const [innerAccentSize, setInnerAccentSize] = useState(
    THROWUP.innerAccentSize,
  );
  const [innerAccentColor, setInnerAccentColor] = useState(
    THROWUP.innerAccentColor,
  );
  const [showBackAccent, setShowBackAccent] = useState(THROWUP.showBackAccent);
  const [backAccentAmount, setBackAccentAmount] = useState(
    THROWUP.backAccentAmount,
  );
  const [backAccentSize, setBackAccentSize] = useState(
    THROWUP.backAccentSize,
  );
  const [backAccentColor, setBackAccentColor] = useState(
    THROWUP.backAccentColor,
  );

  const handleBrushSize = useCallback((v: number) => {
    setBrushSize(v);
    setOutlineSize((s) => Math.max(v, Math.min(s, v * 2)));
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
        showOverspray,
        setShowOverspray,
        oversprayAmount,
        setOversprayAmount,
        showInnerAccent,
        setShowInnerAccent,
        innerAccentAmount,
        setInnerAccentAmount,
        innerAccentSize,
        setInnerAccentSize,
        innerAccentColor,
        setInnerAccentColor,
        showBackAccent,
        setShowBackAccent,
        backAccentAmount,
        setBackAccentAmount,
        backAccentSize,
        setBackAccentSize,
        backAccentColor,
        setBackAccentColor,
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
