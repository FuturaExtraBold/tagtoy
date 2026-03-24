import { type ChangeEvent, useEffect, useRef, useState } from "react";

import { useCanvas } from "../../contexts/CanvasContext";

const SPRAY_SRC = "/backgrounds/spray.jpg";

export function TextureRow() {
  const { setPaintTexture } = useCanvas();
  const [enabled, setEnabled] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load the spray image once
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      if (enabled) setPaintTexture(img);
    };
    img.src = SPRAY_SRC;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = (e: ChangeEvent<HTMLInputElement>) => {
    const on = e.target.checked;
    setEnabled(on);
    setPaintTexture(on && imgRef.current ? imgRef.current : null);
  };

  return (
    <label className="ctrl-menu-item">
      <span className="ctrl-menu-label">Spray texture</span>
      <input type="checkbox" checked={enabled} onChange={handleToggle} />
    </label>
  );
}
