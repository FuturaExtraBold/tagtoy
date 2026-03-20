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
    <div className="ctrl-row">
      <label style={{ flex: 1 }}>
        Outline
        <input
          type="range"
          min={brushSize}
          max={brushSize * 2}
          value={outlineSize}
          onChange={(e) => setOutlineSize(Number(e.target.value))}
        />
        <span>{outlineSize}px</span>
      </label>
      <input
        type="color"
        title="Outline color"
        value={outlineColor}
        onChange={(e) => setOutlineColor(e.target.value)}
      />
    </div>
  );
}
