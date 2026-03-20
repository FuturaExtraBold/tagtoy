export type Point = { x: number; y: number; pressure: number };
export type Stroke = { points: Point[] };
export type StyleMode = "tag" | "throwup" | "burner";
export type GradientMode = "overlay" | "combined";
export type BrushType = "round" | "square";
export type ShadowAngle = "horizontal" | "45" | "vertical";

export interface RenderConfig {
  brushType: BrushType;
  brushSize: number;
  shadowOffset: number;
  shadowColor: string;
  shadowAngle: ShadowAngle;
  shadowAttached: boolean;
  outlineSize: number;
  outlineColor: string;
  throwupColor: string;
  gradientStart: string;
  gradientEnd: string;
  showDrips: boolean;
  dripCount: number;
  showOverspray: boolean;
  oversprayAmount: number;
  showInnerAccent: boolean;
  innerAccentAmount: number;
  innerAccentSize: number;
  innerAccentColor: string;
  showBackAccent: boolean;
  backAccentAmount: number;
  backAccentSize: number;
  backAccentColor: string;
  pressureSensitivity: boolean;
  sensitivity: number;
}
