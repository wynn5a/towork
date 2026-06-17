import { useEffect, useRef } from "react";

/** Fire `callback` when Shift is pressed twice within `delay` ms. */
export function useDoubleShift(callback: () => void, delay = 350) {
  const last = useRef(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Shift" || e.repeat) return;
      const now = Date.now();
      if (now - last.current < delay) {
        last.current = 0;
        callback();
      } else {
        last.current = now;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [callback, delay]);
}
