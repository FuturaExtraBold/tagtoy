import { defaultsForStyle } from "../../config/styleDefaults";
import { useCanvas } from "../../contexts/CanvasContext";
import { useStyle } from "../../contexts/StyleContext";
import type { StyleMode } from "../../types/drawing";

export function StyleRow() {
  const { activeStyle, background, blend, setStyle, setBackground, setBlend } =
    useCanvas();
  const style = useStyle();

  const handleStyleChange = (next: StyleMode) => {
    const defaults = defaultsForStyle(next);
    if (defaults.brushType !== undefined)
      style.setBrushType(defaults.brushType);
    if (defaults.brushSize !== undefined)
      style.handleBrushSize(defaults.brushSize);
    if (defaults.shadowOffset !== undefined)
      style.setShadowOffset(defaults.shadowOffset);
    if (defaults.shadowColor !== undefined)
      style.setShadowColor(defaults.shadowColor);
    if (defaults.shadowAngle !== undefined)
      style.setShadowAngle(defaults.shadowAngle);
    if (defaults.shadowAttached !== undefined)
      style.setShadowAttached(!!defaults.shadowAttached);
    if (defaults.outlineSize !== undefined)
      style.setOutlineSize(defaults.outlineSize);
    if (defaults.outlineColor !== undefined)
      style.setOutlineColor(defaults.outlineColor);
    if (defaults.gradientStart !== undefined)
      style.setGradientStart(defaults.gradientStart);
    if (defaults.gradientEnd !== undefined)
      style.setGradientEnd(defaults.gradientEnd);
    if (defaults.showDrips !== undefined)
      style.setShowDrips(defaults.showDrips);
    if (defaults.dripCount !== undefined)
      style.setDripCount(defaults.dripCount);
    if (defaults.throwupColor !== undefined)
      style.setThrowupColor(defaults.throwupColor);
    if (defaults.tagColor !== undefined) style.setTagColor(defaults.tagColor);
    if (defaults.oversprayAmount !== undefined)
      style.setOversprayAmount(defaults.oversprayAmount);
    if (next === "tag") setBackground("toys.jpg");
    if (next === "throwup") { setBackground("concrete.jpg"); setBlend(false); }
    if (next === "burner") { setBackground("bricks.jpg"); setBlend(true); }
    setStyle(next);
  };

  return (
    <>
      <label className="ctrl-menu-item">
        <span className="ctrl-menu-label">Style</span>
        <div className="select-wrap">
          <select
            value={activeStyle}
            onChange={(e) => handleStyleChange(e.target.value as StyleMode)}
          >
            <option value="tag">Tag</option>
            <option value="throwup">Throwup</option>
            <option value="burner">Burner</option>
          </select>
        </div>
      </label>
      <label className="ctrl-menu-item">
        <span className="ctrl-menu-label">Background</span>
        <div className="select-wrap">
          <select
            value={background}
            onChange={(e) => setBackground(e.target.value)}
          >
            <option value="">White</option>
            <option value="bricks.jpg">Bricks</option>
            <option value="concrete.jpg">Concrete</option>
            <option value="stucco.jpg">Stucco</option>
            <option value="toys.jpg">Toys</option>
            <option value="bodega.jpg">Bodega</option>
          </select>
        </div>
      </label>
      <label className="ctrl-menu-item">
        <span className="ctrl-menu-label">Blend</span>
        <input
          type="checkbox"
          checked={blend}
          onChange={(e) => setBlend(e.target.checked)}
        />
      </label>
    </>
  );
}
