import { useCanvas } from "../../contexts/CanvasContext";

export function StyleRow() {
  const {
    activeStyle,
    gradientMode,
    background,
    setStyle,
    setGradientMode,
    setBackground,
    undo,
    clear,
  } = useCanvas();
  const isBurner = activeStyle === "burner";

  return (
    <div className="ctrl-row">
      <select
        value={activeStyle}
        onChange={(e) =>
          setStyle(e.target.value as "tag" | "throwup" | "burner")
        }
      >
        <option value="tag">Tag</option>
        <option value="throwup">Throwup</option>
        <option value="burner">Burner</option>
      </select>
      <select
        value={background}
        onChange={(e) => setBackground(e.target.value)}
      >
        <option value="">No Background</option>
        <option value="bricks-white.jpg">Bricks</option>
        <option value="concrete-light.jpg">Concrete</option>
      </select>
      {isBurner && (
        <label className="check-label">
          <input
            type="checkbox"
            checked={gradientMode === "combined"}
            onChange={(e) =>
              setGradientMode(e.target.checked ? "combined" : "overlay")
            }
          />
          Combined
        </label>
      )}
      <button onClick={undo}>Undo</button>
      <button onClick={clear}>Clear</button>
    </div>
  );
}
