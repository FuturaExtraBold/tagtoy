import { useStyle } from "../../contexts/StyleContext";

export function TagRow() {
  const { tagColor, setTagColor, oversprayAmount, setOversprayAmount } =
    useStyle();

  return (
    <>
      <label className="ctrl-menu-item">
        <span className="ctrl-menu-label">Color</span>
        <input
          className="color-chip"
          type="color"
          value={tagColor}
          onChange={(e) => setTagColor(e.target.value)}
        />
      </label>
      <label className="ctrl-menu-item">
        <span className="ctrl-menu-label">Overspray</span>
        <input
          type="range"
          min={0}
          max={100}
          value={oversprayAmount}
          onChange={(e) => setOversprayAmount(Number(e.target.value))}
        />
      </label>
    </>
  );
}
