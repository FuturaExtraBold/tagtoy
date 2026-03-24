import { useCanvas } from "../../contexts/CanvasContext";
import { useStyle } from "../../contexts/StyleContext";

const BACKGROUNDS = [
  "",
  "bricks.jpg",
  "concrete.jpg",
  "stucco.jpg",
  "toys.jpg",
  "bodega.jpg",
];

const OUTLINE_COLORS = [
  "#000000",
  "#0d0d2b",
  "#0b1a0b",
  "#1a000d",
  "#0a1a2e",
  "#1a0d00",
  "#1a001a",
];

function hslToHex(h: number, s: number, l: number): string {
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function randomVividHex(excludeHue?: number): [string, number] {
  let h: number;
  do {
    h = Math.floor(Math.random() * 360);
  } while (excludeHue !== undefined && Math.abs(h - excludeHue) < 40);
  const s = 90 + Math.random() * 10;
  const l = 50 + Math.random() * 12;
  return [hslToHex(h, s, l), h];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function RandomizeButton() {
  const { setBackground, activeStyle } = useCanvas();
  const { setGradientStart, setGradientEnd, setOutlineColor, setTagColor } =
    useStyle();

  const handleRandomize = () => {
    const [startHex, startHue] = randomVividHex();
    const [endHex] = randomVividHex(startHue);
    setGradientStart(startHex);
    setGradientEnd(endHex);
    setOutlineColor(pick(OUTLINE_COLORS));
    setBackground(pick(BACKGROUNDS));
    if (activeStyle === "tag") {
      const [tagHex] = randomVividHex();
      setTagColor(tagHex);
    }
  };

  return (
    <button
      className="controls__randomize"
      type="button"
      onClick={handleRandomize}
    >
      Randomize
    </button>
  );
}
