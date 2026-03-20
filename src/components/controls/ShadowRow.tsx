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
    <div className="ctrl-row">
      <label style={{ flex: 1 }}>
        Shadow
        <input
          type="range"
          min={0}
          max={150}
          value={shadowOffset}
          onChange={(e) => setShadowOffset(Number(e.target.value))}
        />
        <span>{shadowOffset}px</span>
      </label>
      <input
        type="color"
        title="Shadow color"
        value={shadowColor}
        onChange={(e) => setShadowColor(e.target.value)}
      />
      <select
        value={shadowAngle}
        onChange={(e) => setShadowAngle(e.target.value as ShadowAngle)}
      >
        <option value="horizontal">→</option>
        <option value="45">↘</option>
        <option value="vertical">↓</option>
      </select>
      <label className="check-label" title="Attach shadow to stroke edges">
        <input
          type="checkbox"
          checked={shadowAttached}
          onChange={(e) => setShadowAttached(e.target.checked)}
        />
        Attached
      </label>
    </div>
  );
}
