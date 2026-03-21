import type { GradientMode, RenderConfig, StyleMode } from "../types/drawing";

type StyleDefaults = {
  tag: Pick<
    RenderConfig,
    "brushType" | "brushSize" | "showDrips" | "dripCount"
  >;
  throwup: Omit<
    RenderConfig,
    "gradientStart" | "gradientEnd" | "pressureSensitivity" | "sensitivity"
  >;
  burner: Omit<
    RenderConfig,
    "throwupColor" | "pressureSensitivity" | "sensitivity"
  >;
  wildstyle: Omit<
    RenderConfig,
    "throwupColor" | "pressureSensitivity" | "sensitivity"
  > & { gradientMode: GradientMode };
};

export const STYLE_DEFAULTS: StyleDefaults = {
  tag: {
    brushType: "round",
    brushSize: 100,
    showDrips: false,
    dripCount: 5,
  },
  throwup: {
    brushType: "round",
    brushSize: 120,
    shadowOffset: 40,
    shadowColor: "#000000",
    shadowAngle: "45",
    shadowAttached: false,
    outlineSize: 160,
    outlineColor: "#000000",
    throwupColor: "#ffffff",
    showDrips: false,
    dripCount: 5,
  },
  burner: {
    brushType: "round",
    brushSize: 100,
    shadowOffset: 50,
    shadowColor: "#1a1a1a",
    shadowAngle: "45",
    shadowAttached: false,
    outlineSize: 125,
    outlineColor: "#000000",
    gradientStart: "#d8d8d8",
    gradientEnd: "#2a2a2a",
    showDrips: false,
    dripCount: 5,
  },
  wildstyle: {
    brushType: "calligraphy",
    brushSize: 150,
    shadowOffset: 50,
    shadowColor: "#cc00ff",
    shadowAngle: "45",
    shadowAttached: true,
    outlineSize: 0,
    outlineColor: "#000000",
    gradientStart: "#0055ff",
    gradientEnd: "#00ff55",
    gradientMode: "combined",
    showDrips: false,
    dripCount: 5,
  },
};

export function defaultsForStyle(
  style: StyleMode,
): Partial<RenderConfig> & { gradientMode?: GradientMode } {
  return STYLE_DEFAULTS[style] as Partial<RenderConfig> & {
    gradientMode?: GradientMode;
  };
}
