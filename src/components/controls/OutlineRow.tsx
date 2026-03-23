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
    <>
      <label className="ctrl-menu-item ctrl-menu-item--slider">
        <div className="ctrl-menu-item__head">
          <span className="ctrl-menu-label">Outline</span>
          <span className="ctrl-menu-value">{outlineSize}px</span>
        </div>
        <input
          type="range"
          min={0}
          max={brushSize * 2}
          value={outlineSize}
          onChange={(e) => setOutlineSize(Number(e.target.value))}
        />
      </label>
      <label className="ctrl-menu-item">
        <span className="ctrl-menu-label">Outline color</span>
        <input
          className="color-chip"
          type="color"
          value={outlineColor}
          onChange={(e) => setOutlineColor(e.target.value)}
        />
      </label>
    </>
  );
}
