import { useCanvas } from "../../contexts/CanvasContext";
import { BrushRow } from "./BrushRow";
import { FillRow } from "./FillRow";
import { OutlineRow } from "./OutlineRow";
import { PressureRow } from "./PressureRow";
import { ShadowRow } from "./ShadowRow";
import { StyleRow } from "./StyleRow";

export function ControlPanel() {
  const { activeStyle } = useCanvas();
  const hasEffects = activeStyle === "throwup" || activeStyle === "burner";

  return (
    <div className="controls">
      <StyleRow />
      <BrushRow />
      <PressureRow />
      {hasEffects && (
        <>
          <ShadowRow />
          <OutlineRow />
          <FillRow />
        </>
      )}
    </div>
  );
}
