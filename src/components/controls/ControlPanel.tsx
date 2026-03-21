import { useId, useState } from "react";

import { useCanvas } from "../../contexts/CanvasContext";
import { BrushRow } from "./BrushRow";
import { FillRow } from "./FillRow";
import { OutlineRow } from "./OutlineRow";
import { PressureRow } from "./PressureRow";
import { ShadowRow } from "./ShadowRow";
import { StyleRow } from "./StyleRow";

export function ControlPanel() {
  const { undo, clear } = useCanvas();
  const [isExpanded, setIsExpanded] = useState(false);
  const advancedControlsId = useId();

  return (
    <div className="controls">
      <div className="controls__shell">
        <div className="controls__intro">
          <p className="controls__eyebrow">Paint Controls</p>
          <p className="controls__summary">
            Set the look up top, then open the drawer for deeper tuning.
          </p>
        </div>
        <StyleRow />
        <button
          aria-controls={advancedControlsId}
          aria-expanded={isExpanded}
          className="controls__accordion"
          type="button"
          onClick={() => setIsExpanded((open) => !open)}
        >
          <span
            aria-hidden="true"
            className={`controls__caret${isExpanded ? " is-open" : ""}`}
          />
          <span className="controls__accordion-copy">
            <span className="controls__accordion-label">
              More controls below
            </span>
            <span className="controls__accordion-note">
              Brush, pressure, shadow, outline, and fill controls live below.
            </span>
          </span>
        </button>
        <div
          id={advancedControlsId}
          className="controls__advanced"
          hidden={!isExpanded}
        >
          <BrushRow />
          <PressureRow />
          <ShadowRow />
          <OutlineRow />
          <FillRow />
        </div>
        <div className="controls__footer">
          <button className="controls__clear" type="button" onClick={clear}>
            Clear
          </button>
          <button className="controls__undo" type="button" onClick={undo}>
            <span>Undo</span>
            <span className="controls__undo-hint">Press Z</span>
          </button>
        </div>
      </div>
    </div>
  );
}
