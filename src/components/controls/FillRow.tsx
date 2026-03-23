import { useCanvas } from "../../contexts/CanvasContext";
import { useStyle } from "../../contexts/StyleContext";

export function FillRow() {
  const { gradientMode, setGradientMode } = useCanvas();
  const {
    throwupColor,
    setThrowupColor,
    gradientStart,
    setGradientStart,
    gradientEnd,
    setGradientEnd,
  } = useStyle();

  return (
    <>
      <label className="ctrl-menu-item">
        <span className="ctrl-menu-label">Fill</span>
        <input
          className="color-chip"
          type="color"
          value={throwupColor}
          onChange={(e) => setThrowupColor(e.target.value)}
        />
      </label>
      <label className="ctrl-menu-item">
        <span className="ctrl-menu-label">Gradient start</span>
        <input
          className="color-chip"
          type="color"
          value={gradientStart}
          onChange={(e) => setGradientStart(e.target.value)}
        />
      </label>
      <label className="ctrl-menu-item">
        <span className="ctrl-menu-label">Gradient end</span>
        <input
          className="color-chip"
          type="color"
          value={gradientEnd}
          onChange={(e) => setGradientEnd(e.target.value)}
        />
      </label>
      <label className="ctrl-menu-item">
        <span className="ctrl-menu-label">Combined gradient</span>
        <input
          type="checkbox"
          checked={gradientMode === "combined"}
          onChange={(e) =>
            setGradientMode(e.target.checked ? "combined" : "overlay")
          }
        />
      </label>
    </>
  );
}
