import { useCallback, useEffect, useRef } from "react"
import { Window } from "@wailsio/runtime"

const DEFAULT_WIDTH = 400
const OUTER_PADDING = 8 // 4px padding on each side in App.tsx

/**
 * Whether Window.Show() has been called.
 *
 * The HUD window starts with Hidden=true (see main.go WORKAROUND comment)
 * to avoid flashing an oversized window at launch. We call Window.Show()
 * exactly once, after the first successful SetSize, so the user only sees
 * the correctly-sized HUD.
 */
let windowShown = false

/**
 * Auto-resize the native window to match the content height.
 *
 * Width is derived from the grid column count (+ outer padding).
 * Height is measured from the ref element's scrollHeight.
 *
 * Height must be multiplied by devicePixelRatio before passing to
 * Window.SetSize. WebView2 reports scrollHeight in CSS pixels, but
 * Wails' DipToPhysicalRect appears to be a no-op in this context
 * (window starts Hidden=true before attaching to a screen), so the
 * DPR conversion must be done on the JS side instead.
 *
 * @param gridWidth  desired window width in CSS pixels
 * @param contentKey  change this value to force a re-sync (e.g. when toggling Settings)
 */
export function useAutoResize(gridWidth?: number, contentKey?: string | number) {
  const ref = useRef<HTMLDivElement>(null)
  const widthRef = useRef(gridWidth ?? DEFAULT_WIDTH)

  // Keep widthRef in sync with the latest grid width
  widthRef.current = gridWidth ? gridWidth + OUTER_PADDING : DEFAULT_WIDTH

  const sync = useCallback(() => {
    const el = ref.current
    if (!el) return
    const w = widthRef.current
    const dpr = window.devicePixelRatio || 1
    const h = Math.ceil(el.scrollHeight * dpr)
    if (h > 0) {
      try {
        Window.SetSize(w, h)

        // First resize done — reveal the window (see main.go Hidden:true)
        if (!windowShown) {
          windowShown = true
          Window.Show()
        }
      } catch (err: unknown) {
        console.error("[Resize] SetSize failed:", err)
      }
    }
  }, [])

  // Observe element size changes
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver(() => sync())
    observer.observe(el)
    sync()

    return () => observer.disconnect()
  }, [sync])

  // Re-sync when grid width or content type changes
  // Defer to next frame so browser can finish layout first
  useEffect(() => {
    requestAnimationFrame(() => sync())
  }, [gridWidth, contentKey, sync])

  return ref
}
