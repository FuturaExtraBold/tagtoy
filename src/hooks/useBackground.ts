import { useEffect } from "react";

export function useBackground(bg: string): void {
  useEffect(() => {
    document.body.style.backgroundColor = "#ffffff";

    if (bg) {
      document.body.style.backgroundImage = `url(/backgrounds/${bg})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.classList.add("has-bg");
    } else {
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundPosition = "";
      document.body.classList.remove("has-bg");
    }
  }, [bg]);
}
