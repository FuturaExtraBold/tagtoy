import type { RenderConfig, StyleMode } from "../types/drawing";

type StyleDefaults = {
  tag: Pick<
    RenderConfig,
    | "brushType"
    | "brushSize"
    | "showDrips"
    | "dripCount"
    | "tagColor"
    | "tagEffect"
    | "outlineSize"
    | "outlineColor"
    | "shadowOffset"
    | "shadowColor"
    | "shadowAngle"
  >;
  throwup: Omit<RenderConfig, "gradientStart" | "gradientEnd">;
  burner: Omit<RenderConfig, "throwupColor">;
  bubble: Omit<RenderConfig, "gradientStart" | "gradientEnd">;
};

export const STYLE_DEFAULTS: StyleDefaults = {
  tag: {
    brushType: "round",
    brushSize: 100,
    showDrips: false,
    dripCount: 3,
    tagColor: "#000000",
    tagEffect: "none",
    outlineSize: 0,
    outlineColor: "#ffffff",
    shadowOffset: 0,
    shadowColor: "#000000",
    shadowAngle: "45",
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
    shadowOffset: 80,
    shadowColor: "#000000",
    shadowAngle: "45",
    shadowAttached: true,
    outlineSize: 170,
    outlineColor: "#000000",
    gradientStart: "#ff0000",
    gradientEnd: "#ffff00",
    showDrips: true,
    dripCount: 20,
  },
  bubble: {
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
    tagColor: "#000000",
    tagEffect: "none",
  },
};

export function defaultsForStyle(style: StyleMode): Partial<RenderConfig> {
  return STYLE_DEFAULTS[style] as Partial<RenderConfig>;
}
