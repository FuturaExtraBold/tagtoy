import { useCanvas } from "../../contexts/CanvasContext";
import { useStyle } from "../../contexts/StyleContext";

export function FillRow() {
  const { activeStyle, gradientMode, setGradientMode } = useCanvas();
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
      <section className="ctrl-row">
        <div className="ctrl-row__header">
          <div>
            <p className="ctrl-row__title">Fill</p>
            <p className="ctrl-row__note">Choose the inner throwup color.</p>
          </div>
        </div>
        <label className="ctrl-color-field ctrl-color-field--wide">
          <span className="ctrl-mini-label">Fill color</span>
          <input
            className="color-chip"
            type="color"
            value={throwupColor}
            onChange={(e) => setThrowupColor(e.target.value)}
          />
        </label>
      </section>
    );
  }

  if (activeStyle === "burner") {
    return (
      <section className="ctrl-row">
        <div className="ctrl-row__header">
          <div>
            <p className="ctrl-row__title">Fill</p>
            <p className="ctrl-row__note">
              Shape the burner gradient and how it spans the piece.
            </p>
          </div>
        </div>
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
          <span>Use one shared gradient across all burner strokes</span>
        </label>
      </section>
    );
  }

  return null;
}
