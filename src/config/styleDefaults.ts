import type { RenderConfig, StyleMode } from "../types/drawing";

type StyleDefaults = {
  tag: Pick<
    RenderConfig,
    | "brushType"
    | "brushSize"
    | "showDrips"
    | "dripCount"
    | "showOverspray"
    | "oversprayAmount"
    | "showInnerAccent"
    | "innerAccentAmount"
    | "innerAccentSize"
    | "innerAccentColor"
    | "showBackAccent"
    | "backAccentAmount"
    | "backAccentSize"
    | "backAccentColor"
  >;
  throwup: Omit<
    RenderConfig,
    "gradientStart" | "gradientEnd" | "pressureSensitivity" | "sensitivity"
  >;
  burner: Omit<
    RenderConfig,
    "throwupColor" | "pressureSensitivity" | "sensitivity"
  >;
};

export const STYLE_DEFAULTS: StyleDefaults = {
  tag: {
    brushType: "round",
    brushSize: 100,
    showDrips: false,
    dripCount: 5,
    showOverspray: true,
    oversprayAmount: 1,
    showInnerAccent: false,
    innerAccentAmount: 1,
    innerAccentSize: 1,
    innerAccentColor: "#000000",
    showBackAccent: false,
    backAccentAmount: 1,
    backAccentSize: 1,
    backAccentColor: "#000000",
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
    showOverspray: true,
    oversprayAmount: 1,
    showInnerAccent: false,
    innerAccentAmount: 1,
    innerAccentSize: 1,
    innerAccentColor: "#000000",
    showBackAccent: false,
    backAccentAmount: 1,
    backAccentSize: 1,
    backAccentColor: "#000000",
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
    showOverspray: true,
    oversprayAmount: 1,
    showInnerAccent: false,
    innerAccentAmount: 1,
    innerAccentSize: 1,
    innerAccentColor: "#000000",
    showBackAccent: false,
    backAccentAmount: 1,
    backAccentSize: 1,
    backAccentColor: "#1a1a1a",
  },
};

export function defaultsForStyle(style: StyleMode): Partial<RenderConfig> {
  return STYLE_DEFAULTS[style] as Partial<RenderConfig>;
}
