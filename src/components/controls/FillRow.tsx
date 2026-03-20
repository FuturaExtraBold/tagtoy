import { useCanvas } from "../../contexts/CanvasContext";
import { useStyle } from "../../contexts/StyleContext";

export function FillRow() {
  const { activeStyle } = useCanvas();
  const {
    throwupColor,
    setThrowupColor,
    gradientStart,
    setGradientStart,
    gradientEnd,
    setGradientEnd,
  } = useStyle();

  if (activeStyle === "throwup") {
    return (
      <div className="ctrl-row">
        <label>
          Fill{" "}
          <input
            type="color"
            value={throwupColor}
            onChange={(e) => setThrowupColor(e.target.value)}
          />
        </label>
      </div>
    );
  }

  if (activeStyle === "burner") {
    return (
      <div className="ctrl-row">
        <label>
          Fill start{" "}
          <input
            type="color"
            value={gradientStart}
            onChange={(e) => setGradientStart(e.target.value)}
          />
        </label>
        <label>
          Fill end{" "}
          <input
            type="color"
            value={gradientEnd}
            onChange={(e) => setGradientEnd(e.target.value)}
          />
        </label>
      </div>
    );
  }

  return null;
}
