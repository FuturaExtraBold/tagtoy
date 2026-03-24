import { useCanvas } from "../../contexts/CanvasContext";
import { BrushRow } from "./BrushRow";
import { FillRow } from "./FillRow";
import { OutlineRow } from "./OutlineRow";
import { RandomizeButton } from "./RandomizeButton";
import { ShadowRow } from "./ShadowRow";
import { StyleRow } from "./StyleRow";
import { TextureRow } from "./TextureRow";

export function ControlPanel() {
  const { undo, clear, exportImage } = useCanvas();

  return (
    <div className="controls">
      <div className="controls__shell">
        <p className="controls__eyebrow">Paint Controls</p>
        <div className="ctrl-menu">
          <StyleRow />
          <BrushRow />
          <ShadowRow />
          <OutlineRow />
          <FillRow />
          <TextureRow />
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
        <div className="controls__actions">
          <RandomizeButton />
          <button
            className="controls__export"
            type="button"
            onClick={exportImage}
          >
            Export PNG
          </button>
        </div>
      </div>
    </div>
  );
}
