import { useStyle } from "../../contexts/StyleContext";

export function PressureRow() {
  const {
    pressureSensitivity,
    setPressureSensitivity,
    sensitivity,
    setSensitivity,
  } = useStyle();

  return (
    <section className="ctrl-row">
      <div className="ctrl-row__header">
        <div>
          <p className="ctrl-row__title">Pressure</p>
          <p className="ctrl-row__note">
            Use stylus pressure to widen and taper strokes.
          </p>
        </div>
      </div>
      <label className="check-label check-label--wide">
        <input
          type="checkbox"
          checked={pressureSensitivity}
          onChange={(e) => setPressureSensitivity(e.target.checked)}
        />
        <span>Enable pressure sensitivity</span>
      </label>
      {pressureSensitivity && (
        <label className="ctrl-slider">
          <div className="ctrl-slider__meta">
            <span className="ctrl-slider__label">Sensitivity</span>
            <span className="ctrl-slider__value">{sensitivity}</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
          />
        </label>
      )}
    </section>
  );
}
