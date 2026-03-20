import { type RefObject, useEffect } from "react";

export function useCursor(ref: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (ref.current) {
        ref.current.style.left = `${e.clientX}px`;
        ref.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [ref]);
}
