import { useStyle } from "../../contexts/StyleContext";

export function ShadowRow() {
  const {
    shadowOffset,
    setShadowOffset,
    shadowColor,
    setShadowColor,
    shadowAngle,
    setShadowAngle,
    shadowAttached,
    setShadowAttached,
  } = useStyle();

  return (
    <>
      <label className="ctrl-menu-item ctrl-menu-item--slider">
        <div className="ctrl-menu-item__head">
          <span className="ctrl-menu-label">Shadow</span>
          <span className="ctrl-menu-value">{shadowOffset}px</span>
        </div>
        <input
          type="range"
          min={0}
          max={150}
          value={shadowOffset}
          onChange={(e) => setShadowOffset(Number(e.target.value))}
        />
      </label>
      <label className="ctrl-menu-item">
        <span className="ctrl-menu-label">Shadow color</span>
        <input
          className="color-chip"
          type="color"
          value={shadowColor}
          onChange={(e) => setShadowColor(e.target.value)}
        />
      </label>
      <div className="ctrl-menu-item">
        <span className="ctrl-menu-label">Shadow angle</span>
        <div className="brush-options" role="group" aria-label="Shadow angle">
          {(
            [
              ["horizontal", "Right", "M4,12 H20 M13,6 L20,12 L13,18"],
              ["45", "Down-right", "M6,6 L18,18 M10,18 H18 V10"],
              ["vertical", "Down", "M12,4 V20 M6,13 L12,20 L18,13"],
            ] as const
          ).map(([val, label, d]) => (
            <button
              key={val}
              type="button"
              aria-label={label}
              aria-pressed={shadowAngle === val}
              className={`brush-option${shadowAngle === val ? " is-active" : ""}`}
              onClick={() => setShadowAngle(val)}
            >
              <svg
                aria-hidden="true"
                className="brush-option__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={d} />
              </svg>
            </button>
          ))}
        </div>
      </div>
      <label className="ctrl-menu-item">
        <span className="ctrl-menu-label">Shadow attached</span>
        <input
          type="checkbox"
          checked={shadowAttached}
          onChange={(e) => setShadowAttached(e.target.checked)}
        />
      </label>
    </>
  );
}
