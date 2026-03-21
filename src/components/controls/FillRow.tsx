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
    <section className="ctrl-row">
      <div className="ctrl-row__header">
        <div>
          <p className="ctrl-row__title">Fill</p>
          <p className="ctrl-row__note">Throwup color and gradient fill.</p>
        </div>
      </div>
      <label className="ctrl-color-field ctrl-color-field--wide">
        <span className="ctrl-mini-label">Throwup fill</span>
        <input
          className="color-chip"
          type="color"
          value={throwupColor}
          onChange={(e) => setThrowupColor(e.target.value)}
        />
      </label>
      <div className="ctrl-swatch-grid">
        <label className="ctrl-color-field">
          <span className="ctrl-mini-label">Gradient start</span>
          <input
            className="color-chip"
            type="color"
            value={gradientStart}
            onChange={(e) => setGradientStart(e.target.value)}
          />
        </label>
        <label className="ctrl-color-field">
          <span className="ctrl-mini-label">Gradient end</span>
          <input
            className="color-chip"
            type="color"
            value={gradientEnd}
            onChange={(e) => setGradientEnd(e.target.value)}
          />
        </label>
      </div>
      <label className="check-label check-label--wide">
        <input
          type="checkbox"
          checked={gradientMode === "combined"}
          onChange={(e) =>
            setGradientMode(e.target.checked ? "combined" : "overlay")
          }
        />
        <span>Use one shared gradient across all strokes</span>
      </label>
    </section>
  );
}
