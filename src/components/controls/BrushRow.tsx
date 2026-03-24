import { useCanvas } from "../../contexts/CanvasContext";
import { useStyle } from "../../contexts/StyleContext";

function BrushIcon({ type }: { type: "round" | "square" }) {
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
      <circle cx="12" cy="12" r="5.5" fill="currentColor" />
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
  const showDripControls = !!activeStyle; // drips available in all styles

  return (
    <>
      <div className="ctrl-menu-item">
        <span className="ctrl-menu-label">Brush</span>
        <div className="brush-options" role="group" aria-label="Brush type">
          {(
            [
              ["round", "Round"],
              ["square", "Square"],
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
      </div>
      <label className="ctrl-menu-item ctrl-menu-item--slider">
        <div className="ctrl-menu-item__head">
          <span className="ctrl-menu-label">Size</span>
          <span className="ctrl-menu-value">{brushSize}px</span>
        </div>
        <input
          type="range"
          min={10}
          max={200}
          value={brushSize}
          onChange={(e) => handleBrushSize(Number(e.target.value))}
        />
      </label>
      {showDripControls && (
        <label className="ctrl-menu-item">
          <span className="ctrl-menu-label">Drips</span>
          <input
            type="checkbox"
            checked={showDrips}
            onChange={(e) => setShowDrips(e.target.checked)}
          />
        </label>
      )}
      {showDripControls && showDrips && (
        <label className="ctrl-menu-item ctrl-menu-item--slider">
          <div className="ctrl-menu-item__head">
            <span className="ctrl-menu-label">Drip count</span>
            <span className="ctrl-menu-value">{dripCount}</span>
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
    </>
  );
}
