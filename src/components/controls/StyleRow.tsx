import { useCanvas } from "../../contexts/CanvasContext";

export function StyleRow() {
  const { activeStyle, background, setStyle, setBackground } = useCanvas();

  return (
    <div className="controls__primary">
      <label className="ctrl-field">
        <span className="ctrl-field__label">Style</span>
        <div className="select-wrap">
          <select
            aria-label="Style"
            value={activeStyle}
            onChange={(e) =>
              setStyle(e.target.value as "tag" | "throwup" | "burner")
            }
          >
            <option value="tag">Tag</option>
            <option value="throwup">Throwup</option>
            <option value="burner">Burner</option>
          </select>
        </div>
      </label>
      <label className="ctrl-field">
        <span className="ctrl-field__label">Background</span>
        <div className="select-wrap">
          <select
            aria-label="Background"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
          >
            <option value="">White</option>
            <option value="bricks-white.jpg">Bricks</option>
            <option value="concrete-light.jpg">Concrete</option>
          </select>
        </div>
      </label>
    </div>
  );
}
