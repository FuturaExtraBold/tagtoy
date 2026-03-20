import { useCanvas } from "../../contexts/CanvasContext";
import { useStyle } from "../../contexts/StyleContext";

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
    showOverspray,
    setShowOverspray,
    oversprayAmount,
    setOversprayAmount,
  } = useStyle();
  const showDripControls = activeStyle !== "tag";
  const showTagOverspray = activeStyle === "tag";

  return (
    <section className="ctrl-row">
      <div className="ctrl-row__header">
        <div>
          <p className="ctrl-row__title">Brush</p>
          <p className="ctrl-row__note">Shape, size, and spray texture.</p>
        </div>
        <div className="select-wrap select-wrap--compact">
          <select
            aria-label="Brush type"
            value={brushType}
            onChange={(e) => setBrushType(e.target.value as "round" | "square")}
          >
            <option value="round">Round</option>
            <option value="square">Square</option>
          </select>
        </div>
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
        {showTagOverspray && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={showOverspray}
              onChange={(e) => setShowOverspray(e.target.checked)}
            />
            <span>Overspray</span>
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
      {showTagOverspray && showOverspray && (
        <label className="ctrl-slider">
          <div className="ctrl-slider__meta">
            <span className="ctrl-slider__label">Overspray spread</span>
            <span className="ctrl-slider__value">
              {oversprayAmount.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.1}
            value={oversprayAmount}
            onChange={(e) => setOversprayAmount(Number(e.target.value))}
          />
        </label>
      )}
    </section>
  );
}
