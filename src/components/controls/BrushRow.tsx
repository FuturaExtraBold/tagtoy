import { useCanvas } from "../../contexts/CanvasContext";
import { useStyle } from "../../contexts/StyleContext";

function BrushIcon({ type }: { type: "round" | "square" | "calligraphy" }) {
  if (type === "round") {
    return (
      <svg
        aria-hidden="true"
        className="brush-option__icon"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="5.5" fill="currentColor" />
      </svg>
    );
  }

  if (type === "square") {
    return (
      <svg
        aria-hidden="true"
        className="brush-option__icon"
        viewBox="0 0 24 24"
      >
        <rect x="6.5" y="6.5" width="11" height="11" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="brush-option__icon" viewBox="0 0 24 24">
      <rect
        x="6"
        y="10"
        width="12"
        height="4"
        rx="1"
        fill="currentColor"
        transform="rotate(45 12 12)"
      />
    </svg>
  );
}

export function BrushRow() {
  const { activeStyle } = useCanvas();
  const {
    brushType,
    setBrushType,
    brushSize,
    handleBrushSize,
    showDrips,
    setShowDrips,
    dripCount,
    setDripCount,
  } = useStyle();
  const showDripControls = activeStyle !== "tag";

  return (
    <section className="ctrl-row">
      <div className="ctrl-row__header">
        <div>
          <p className="ctrl-row__title">Brush</p>
          <p className="ctrl-row__note">Shape, size, and drip behavior.</p>
        </div>
      </div>
      <div className="brush-options" role="group" aria-label="Brush type">
        {(
          [
            ["round", "Round"],
            ["square", "Square"],
            ["calligraphy", "Chisel"],
          ] as const
        ).map(([type, label]) => (
          <button
            key={type}
            aria-pressed={brushType === type}
            aria-label={label}
            className={`brush-option${brushType === type ? " is-active" : ""}`}
            type="button"
            onClick={() => setBrushType(type)}
          >
            <BrushIcon type={type} />
          </button>
        ))}
      </div>
      <label className="ctrl-slider">
        <div className="ctrl-slider__meta">
          <span className="ctrl-slider__label">Size</span>
          <span className="ctrl-slider__value">{brushSize}px</span>
        </div>
        <input
          type="range"
          min={10}
          max={200}
          value={brushSize}
          onChange={(e) => handleBrushSize(Number(e.target.value))}
        />
      </label>
      <div className="ctrl-chip-row">
        {showDripControls && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={showDrips}
              onChange={(e) => setShowDrips(e.target.checked)}
            />
            <span>Drips</span>
          </label>
        )}
      </div>
      {showDripControls && showDrips && (
        <label className="ctrl-slider">
          <div className="ctrl-slider__meta">
            <span className="ctrl-slider__label">Drip count</span>
            <span className="ctrl-slider__value">{dripCount}</span>
          </div>
          <input
            type="range"
            min={1}
            max={40}
            value={dripCount}
            onChange={(e) => setDripCount(Number(e.target.value))}
          />
        </label>
      )}
    </section>
  );
}
