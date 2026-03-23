import { useStyle } from "../../contexts/StyleContext";
import type { ShadowAngle } from "../../types/drawing";

export function ShadowRow() {
  const {
    shadowOffset,
    setShadowOffset,
    shadowColor,
    setShadowColor,
    shadowAngle,
    setShadowAngle,
    shadowAttached,
    setShadowAttached,
  } = useStyle();

  return (
    <>
      <label className="ctrl-menu-item ctrl-menu-item--slider">
        <div className="ctrl-menu-item__head">
          <span className="ctrl-menu-label">Shadow</span>
          <span className="ctrl-menu-value">{shadowOffset}px</span>
        </div>
        <input
          type="range"
          min={0}
          max={150}
          value={shadowOffset}
          onChange={(e) => setShadowOffset(Number(e.target.value))}
        />
      </label>
      <label className="ctrl-menu-item">
        <span className="ctrl-menu-label">Shadow color</span>
        <input
          className="color-chip"
          type="color"
          value={shadowColor}
          onChange={(e) => setShadowColor(e.target.value)}
        />
      </label>
      <label className="ctrl-menu-item">
        <span className="ctrl-menu-label">Shadow angle</span>
        <div className="select-wrap">
          <select
            value={shadowAngle}
            onChange={(e) => setShadowAngle(e.target.value as ShadowAngle)}
          >
            <option value="horizontal">Right</option>
            <option value="45">Down-right</option>
            <option value="vertical">Down</option>
          </select>
        </div>
      </label>
      <label className="ctrl-menu-item">
        <span className="ctrl-menu-label">Shadow attached</span>
        <input
          type="checkbox"
          checked={shadowAttached}
          onChange={(e) => setShadowAttached(e.target.checked)}
        />
      </label>
    </>
  );
}
