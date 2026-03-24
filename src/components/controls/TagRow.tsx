import { useStyle } from "../../contexts/StyleContext";
import type { TagEffect } from "../../types/drawing";

export function TagRow() {
  const {
    tagColor,
    setTagColor,
    tagEffect,
    setTagEffect,
    gradientStart,
    setGradientStart,
    gradientEnd,
    setGradientEnd,
  } = useStyle();

  return (
    <>
      <label className="ctrl-menu-item">
        <span className="ctrl-menu-label">Effect</span>
        <div className="select-wrap">
          <select
            value={tagEffect}
            onChange={(e) => setTagEffect(e.target.value as TagEffect)}
          >
            <option value="none">None</option>
            <option value="bleed">Bleed</option>
            <option value="glow">Glow</option>
            <option value="chrome">Chrome</option>
          </select>
        </div>
      </label>
      {tagEffect !== "chrome" && (
        <label className="ctrl-menu-item">
          <span className="ctrl-menu-label">Color</span>
          <input
            className="color-chip"
            type="color"
            value={tagColor}
            onChange={(e) => setTagColor(e.target.value)}
          />
        </label>
      )}
      {tagEffect === "chrome" && (
        <>
          <label className="ctrl-menu-item">
            <span className="ctrl-menu-label">Chrome top</span>
            <input
              className="color-chip"
              type="color"
              value={gradientStart}
              onChange={(e) => setGradientStart(e.target.value)}
            />
          </label>
          <label className="ctrl-menu-item">
            <span className="ctrl-menu-label">Chrome bottom</span>
            <input
              className="color-chip"
              type="color"
              value={gradientEnd}
              onChange={(e) => setGradientEnd(e.target.value)}
            />
          </label>
        </>
      )}
    </>
  );
}
