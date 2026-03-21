import { defaultsForStyle } from "../../config/styleDefaults";
import { useCanvas } from "../../contexts/CanvasContext";
import { useStyle } from "../../contexts/StyleContext";
import type { StyleMode } from "../../types/drawing";

export function StyleRow() {
  const { activeStyle, background, setStyle, setGradientMode, setBackground } =
    useCanvas();
  const style = useStyle();

  const handleStyleChange = (next: StyleMode) => {
    const defaults = defaultsForStyle(next);
    if (defaults.brushType) style.setBrushType(defaults.brushType);
    if (defaults.brushSize) style.handleBrushSize(defaults.brushSize);
    if (defaults.shadowOffset !== undefined)
      style.setShadowOffset(defaults.shadowOffset);
    if (defaults.shadowColor) style.setShadowColor(defaults.shadowColor);
    if (defaults.shadowAngle) style.setShadowAngle(defaults.shadowAngle);
    if (defaults.shadowAttached !== undefined)
      style.setShadowAttached(!!defaults.shadowAttached);
    if (defaults.outlineSize !== undefined)
      style.setOutlineSize(defaults.outlineSize);
    if (defaults.outlineColor) style.setOutlineColor(defaults.outlineColor);
    if (defaults.gradientStart) style.setGradientStart(defaults.gradientStart);
    if (defaults.gradientEnd) style.setGradientEnd(defaults.gradientEnd);
    if (defaults.gradientMode) setGradientMode(defaults.gradientMode);
    setStyle(next);
  };

  return (
    <div className="controls__primary">
      <label className="ctrl-field">
        <span className="ctrl-field__label">Style</span>
        <div className="select-wrap">
          <select
            aria-label="Style"
            value={activeStyle}
            onChange={(e) => handleStyleChange(e.target.value as StyleMode)}
          >
            <option value="tag">Tag</option>
            <option value="throwup">Throwup</option>
            <option value="burner">Burner</option>
            <option value="wildstyle">Wild Style</option>
          </select>
        </div>
      </label>
      <label className="ctrl-field">
        <span className="ctrl-field__label">Background</span>
        <div className="select-wrap">
          <select
            aria-label="Background"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
          >
            <option value="">White</option>
            <option value="bricks-white.jpg">Bricks</option>
            <option value="concrete-light.jpg">Concrete</option>
          </select>
        </div>
      </label>
    </div>
  );
}
