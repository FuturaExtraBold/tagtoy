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
    <section className="ctrl-row">
      <div className="ctrl-row__header">
        <div>
          <p className="ctrl-row__title">Shadow</p>
          <p className="ctrl-row__note">
            Offset, direction, and color for the throw.
          </p>
        </div>
      </div>
      <label className="ctrl-slider">
        <div className="ctrl-slider__meta">
          <span className="ctrl-slider__label">Distance</span>
          <span className="ctrl-slider__value">{shadowOffset}px</span>
        </div>
        <input
          type="range"
          min={0}
          max={150}
          value={shadowOffset}
          onChange={(e) => setShadowOffset(Number(e.target.value))}
        />
      </label>
      <div className="ctrl-inline-row">
        <label className="ctrl-color-field">
          <span className="ctrl-mini-label">Color</span>
          <input
            className="color-chip"
            type="color"
            title="Shadow color"
            value={shadowColor}
            onChange={(e) => setShadowColor(e.target.value)}
          />
        </label>
        <label className="ctrl-field ctrl-field--compact">
          <span className="ctrl-field__label">Angle</span>
          <div className="select-wrap select-wrap--compact">
            <select
              aria-label="Shadow angle"
              value={shadowAngle}
              onChange={(e) => setShadowAngle(e.target.value as ShadowAngle)}
            >
              <option value="horizontal">Right</option>
              <option value="45">Down-right</option>
              <option value="vertical">Down</option>
            </select>
          </div>
        </label>
      </div>
      <label
        className="check-label check-label--wide"
        title="Attach shadow to stroke edges"
      >
        <input
          type="checkbox"
          checked={shadowAttached}
          onChange={(e) => setShadowAttached(e.target.checked)}
        />
        <span>Attach shadow to stroke edges</span>
      </label>
    </section>
  );
}
