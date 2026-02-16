import { useEffect, useRef } from "react";
import { Window } from "@wailsio/runtime";

const WINDOW_WIDTH = 400;

export function useAutoResize() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const sync = () => {
      // scrollHeight captures full content including padding/children
      const height = Math.ceil(el.scrollHeight);
      if (height > 0) {
        try {
          Window.SetSize(WINDOW_WIDTH, height);
        } catch {
          // Wails runtime may not be ready yet
        }
      }
    };

    // Observe size changes on the container
    const observer = new ResizeObserver(() => sync());
    observer.observe(el);

    // Also sync once on mount
    sync();

    return () => observer.disconnect();
  }, []);

  return ref;
}
