import { useStyle } from "../../contexts/StyleContext";

export function BrushRow() {
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

  return (
    <div className="ctrl-row">
      <select
        value={brushType}
        onChange={(e) => setBrushType(e.target.value as "round" | "square")}
      >
        <option value="round">Round</option>
        <option value="square">Square</option>
      </select>
      <label style={{ flex: 1 }}>
        Size
        <input
          type="range"
          min={10}
          max={200}
          value={brushSize}
          onChange={(e) => handleBrushSize(Number(e.target.value))}
        />
        <span>{brushSize}px</span>
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={showDrips}
          onChange={(e) => setShowDrips(e.target.checked)}
        />
        Drips
      </label>
      {showDrips && (
        <label style={{ flex: 1 }}>
          <input
            type="range"
            min={1}
            max={20}
            value={dripCount}
            onChange={(e) => setDripCount(Number(e.target.value))}
          />
          <span>{dripCount}</span>
        </label>
      )}
      <label className="check-label">
        <input
          type="checkbox"
          checked={showOverspray}
          onChange={(e) => setShowOverspray(e.target.checked)}
        />
        Overspray
      </label>
      {showOverspray && (
        <label style={{ flex: 1 }}>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.1}
            value={oversprayAmount}
            onChange={(e) => setOversprayAmount(Number(e.target.value))}
          />
          <span>{oversprayAmount.toFixed(1)}×</span>
        </label>
      )}
    </div>
  );
}
