import { useCanvas } from "../../contexts/CanvasContext";
import { useStyle } from "../../contexts/StyleContext";

export function AccentRow() {
  const { activeStyle } = useCanvas();
  const {
    showInnerAccent,
    setShowInnerAccent,
    innerAccentAmount,
    setInnerAccentAmount,
    innerAccentSize,
    setInnerAccentSize,
    innerAccentColor,
    setInnerAccentColor,
    showBackAccent,
    setShowBackAccent,
    backAccentAmount,
    setBackAccentAmount,
    backAccentSize,
    setBackAccentSize,
    backAccentColor,
    setBackAccentColor,
  } = useStyle();

  if (activeStyle === "tag") return null;

  return (
    <section className="ctrl-row">
      <div className="ctrl-row__header">
        <div>
          <p className="ctrl-row__title">Accent</p>
          <p className="ctrl-row__note">
            Add solid-color texture inside the fill and across the shadow mass.
          </p>
        </div>
      </div>

      <label className="check-label check-label--wide">
        <input
          type="checkbox"
          checked={showInnerAccent}
          onChange={(e) => setShowInnerAccent(e.target.checked)}
        />
        <span>Inner Accent</span>
      </label>
      {showInnerAccent && (
        <>
          <label className="ctrl-slider">
            <div className="ctrl-slider__meta">
              <span className="ctrl-slider__label">Inner density</span>
              <span className="ctrl-slider__value">
                {innerAccentAmount.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.1}
              value={innerAccentAmount}
              onChange={(e) => setInnerAccentAmount(Number(e.target.value))}
            />
          </label>
          <label className="ctrl-slider">
            <div className="ctrl-slider__meta">
              <span className="ctrl-slider__label">Inner dot size</span>
              <span className="ctrl-slider__value">
                {innerAccentSize.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={4}
              step={0.1}
              value={innerAccentSize}
              onChange={(e) => setInnerAccentSize(Number(e.target.value))}
            />
          </label>
          <label className="ctrl-color-field ctrl-color-field--wide">
            <span className="ctrl-mini-label">Inner accent color</span>
            <input
              className="color-chip"
              type="color"
              value={innerAccentColor}
              onChange={(e) => setInnerAccentColor(e.target.value)}
            />
          </label>
        </>
      )}

      <label className="check-label check-label--wide">
        <input
          type="checkbox"
          checked={showBackAccent}
          onChange={(e) => setShowBackAccent(e.target.checked)}
        />
        <span>Back Accent</span>
      </label>
      {showBackAccent && (
        <>
          <label className="ctrl-slider">
            <div className="ctrl-slider__meta">
              <span className="ctrl-slider__label">Back density</span>
              <span className="ctrl-slider__value">
                {backAccentAmount.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.1}
              value={backAccentAmount}
              onChange={(e) => setBackAccentAmount(Number(e.target.value))}
            />
          </label>
          <label className="ctrl-slider">
            <div className="ctrl-slider__meta">
              <span className="ctrl-slider__label">Back dot size</span>
              <span className="ctrl-slider__value">
                {backAccentSize.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={4}
              step={0.1}
              value={backAccentSize}
              onChange={(e) => setBackAccentSize(Number(e.target.value))}
            />
          </label>
          <label className="ctrl-color-field ctrl-color-field--wide">
            <span className="ctrl-mini-label">Back accent color</span>
            <input
              className="color-chip"
              type="color"
              value={backAccentColor}
              onChange={(e) => setBackAccentColor(e.target.value)}
            />
          </label>
        </>
      )}
    </section>
  );
}
