import { useEffect, useState } from "react";

/** Returns "dark" or "light", reacting to the `.dark` class on <html> and OS preference. */
export function useColorScheme(): "dark" | "light" {
  const [scheme, setScheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    if (document.documentElement.classList.contains("dark")) return "dark";
    if (document.documentElement.classList.contains("light")) return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const compute = () => {
      const el = document.documentElement;
      if (el.classList.contains("dark")) return setScheme("dark");
      if (el.classList.contains("light")) return setScheme("light");
      setScheme(mq.matches ? "dark" : "light");
    };
    compute();
    mq.addEventListener("change", compute);
    const observer = new MutationObserver(compute);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      mq.removeEventListener("change", compute);
      observer.disconnect();
    };
  }, []);

  return scheme;
}