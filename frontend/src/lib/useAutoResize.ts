import { useEffect, useRef } from "react";
import { Window } from "@wailsio/runtime";

const DEFAULT_WIDTH = 400;
const OUTER_PADDING = 8; // 4px padding on each side in App.tsx

/**
 * Whether Window.Show() has been called.
 *
 * The HUD window starts with Hidden=true (see main.go WORKAROUND comment)
 * to avoid flashing an oversized window at launch. We call Window.Show()
 * exactly once, after the first successful SetSize, so the user only sees
 * the correctly-sized HUD.
 */
let windowShown = false;

/**
 * Auto-resize the native window to match the content height.
 *
 * Width is derived from the grid column count (+ outer padding).
 * Height is measured from the ref element's scrollHeight.
 *
 * Wails v3 Window.SetSize() accepts logical (CSS / DIP) pixels;
 * it internally converts to physical pixels via DipToPhysicalRect.
 * WebView2 runs in COREWEBVIEW2_BOUNDS_MODE_USE_RAW_PIXELS, but the
 * DIP→physical conversion happens on the Go side, so we must NOT
 * multiply by devicePixelRatio here.
 */
export function useAutoResize(gridWidth?: number) {
  const ref = useRef<HTMLDivElement>(null);
  const widthRef = useRef(gridWidth ?? DEFAULT_WIDTH);

  // Keep widthRef in sync with the latest grid width
  widthRef.current = gridWidth ? gridWidth + OUTER_PADDING : DEFAULT_WIDTH;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const sync = () => {
      const w = widthRef.current;
      const dpr = window.devicePixelRatio || 1;
      const h = Math.ceil(el.scrollHeight * dpr); // Restore scaling
      if (h > 0) {
        try {
          Window.SetSize(w, h);

          // First resize done — reveal the window (see main.go Hidden:true)
          if (!windowShown) {
            windowShown = true;
            Window.Show();
          }
        } catch (err: unknown) {
          console.error("[Resize] SetSize failed:", err);
          // Wails runtime may not be ready yet
        }
      }
    };

    const observer = new ResizeObserver(() => sync());
    observer.observe(el);
    sync();

    return () => observer.disconnect();
  }, []);

  // Re-sync when grid column count changes
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = widthRef.current;
    const h = Math.ceil(el.scrollHeight);
    if (h > 0) {
      try {
        Window.SetSize(w, h);
      } catch {
        // Wails runtime may not be ready yet
      }
    }
  }, [gridWidth]);

  return ref;
}
