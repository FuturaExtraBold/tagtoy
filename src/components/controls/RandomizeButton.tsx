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

function hslToHex(h: number, s: number, l: number): string {
  const lf = l / 100;
  const a = (s / 100) * Math.min(lf, 1 - lf);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = lf - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
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

// Dark but visibly hued — for outline and shadow layers
function randomDarkHex(excludeHue?: number): [string, number] {
  let h: number;
  do {
    h = Math.floor(Math.random() * 360);
  } while (excludeHue !== undefined && Math.abs(h - excludeHue) < 40);
  const s = 50 + Math.random() * 40;
  const l = 12 + Math.random() * 18;
  return [hslToHex(h, s, l), h];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function RandomizeButton() {
  const { setBackground } = useCanvas();
  const {
    setGradientStart,
    setGradientEnd,
    setOutlineColor,
    setShadowColor,
    setTagColor,
    setThrowupColor,
  } = useStyle();

  const handleRandomize = () => {
    const [startHex, startHue] = randomVividHex();
    const [endHex] = randomVividHex(startHue);
    const [fillHex] = randomVividHex(startHue);
    const [outlineHex, outlineHue] = randomDarkHex();
    const [shadowHex] = randomDarkHex(outlineHue);
    setGradientStart(startHex);
    setGradientEnd(endHex);
    setThrowupColor(fillHex);
    setTagColor(fillHex);
    setOutlineColor(outlineHex);
    setShadowColor(shadowHex);
    setBackground(pick(BACKGROUNDS));
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
