import { useStyle } from "../../contexts/StyleContext";

export function PressureRow() {
  const {
    pressureSensitivity,
    setPressureSensitivity,
    sensitivity,
    setSensitivity,
  } = useStyle();

  return (
    <div className="ctrl-row">
      <label className="check-label">
        <input
          type="checkbox"
          checked={pressureSensitivity}
          onChange={(e) => setPressureSensitivity(e.target.checked)}
        />
        Pressure
      </label>
      {pressureSensitivity && (
        <label style={{ flex: 1 }}>
          Sensitivity
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
          />
          <span>{sensitivity}</span>
        </label>
      )}
    </div>
  );
}
