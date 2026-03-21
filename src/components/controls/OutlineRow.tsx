import { useStyle } from "../../contexts/StyleContext";

export function OutlineRow() {
  const {
    brushSize,
    outlineSize,
    setOutlineSize,
    outlineColor,
    setOutlineColor,
  } = useStyle();

  return (
    <section className="ctrl-row">
      <div className="ctrl-row__header">
        <div>
          <p className="ctrl-row__title">Outline</p>
          <p className="ctrl-row__note">
            Set the outer silhouette width and edge color.
          </p>
        </div>
      </div>
      <label className="ctrl-slider">
        <div className="ctrl-slider__meta">
          <span className="ctrl-slider__label">Width</span>
          <span className="ctrl-slider__value">{outlineSize}px</span>
        </div>
        <input
          type="range"
          min={0}
          max={brushSize * 2}
          value={outlineSize}
          onChange={(e) => setOutlineSize(Number(e.target.value))}
        />
      </label>
      <label className="ctrl-color-field ctrl-color-field--wide">
        <span className="ctrl-mini-label">Outline color</span>
        <input
          className="color-chip"
          type="color"
          title="Outline color"
          value={outlineColor}
          onChange={(e) => setOutlineColor(e.target.value)}
        />
      </label>
    </section>
  );
}
