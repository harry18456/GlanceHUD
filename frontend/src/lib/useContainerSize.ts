import { useState, useEffect, useRef, useCallback } from "react"

interface ContainerSize {
  width: number
  height: number
}

/**
 * Hook that measures the container's width and height using ResizeObserver.
 * Returns a ref to attach to a container and the current size.
 */
export function useContainerSize(): [React.RefObject<HTMLDivElement | null>, ContainerSize] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState<ContainerSize>({ width: 0, height: 0 })

  const updateSize = useCallback(() => {
    if (ref.current) {
      const { width, height } = ref.current.getBoundingClientRect()
      setSize((prev) => {
        if (Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
          return prev // avoid unnecessary re-renders
        }
        return { width, height }
      })
    }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    updateSize()
    const observer = new ResizeObserver(() => updateSize())
    observer.observe(el)
    return () => observer.disconnect()
  }, [updateSize])

  return [ref, size]
}
