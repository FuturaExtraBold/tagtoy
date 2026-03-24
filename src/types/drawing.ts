export type Point = { x: number; y: number };
export type Stroke = {
  id: number;
  points: Point[];
  renderPoints: Point[];
};
export type StyleMode = "tag" | "throwup" | "burner" | "bubble";
export type GradientMode = "overlay" | "combined";
export type BrushType = "round" | "square";
export type ShadowAngle = "horizontal" | "45" | "vertical";
export type TagEffect = "none" | "bleed" | "glow" | "chrome";

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
  tagColor: string;
  tagEffect: TagEffect;
}
