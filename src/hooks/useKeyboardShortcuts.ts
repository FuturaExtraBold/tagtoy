import { useEffect } from "react";

interface KeyboardShortcutOptions {
  undo: () => void;
}

export function useKeyboardShortcuts({ undo }: KeyboardShortcutOptions): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === "z" || e.key === "Z") undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);
}
