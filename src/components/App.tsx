import { useRef } from "react";

import { CanvasProvider } from "../contexts/CanvasContext";
import { useCanvas } from "../contexts/CanvasContext";
import { StyleProvider } from "../contexts/StyleContext";
import { useBackground } from "../hooks/useBackground";
import { useCursor } from "../hooks/useCursor";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { Canvas } from "./Canvas";
import { ControlPanel } from "./controls/ControlPanel";

function AppInner() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const { background, undo } = useCanvas();

  useBackground(background);
  useCursor(cursorRef);
  useKeyboardShortcuts({ undo });

  return (
    <>
      <div ref={cursorRef} className="cursor" />
      <Canvas />
      <ControlPanel />
    </>
  );
}

export default function App() {
  return (
    <CanvasProvider>
      <StyleProvider>
        <AppInner />
      </StyleProvider>
    </CanvasProvider>
  );
}
