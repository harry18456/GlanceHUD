import React, { useState, useEffect, useRef } from "react"

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const MAX_LOGS = 200
const LOG_EVENT = "glancehud:debug"

export type LogLevel = "INFO" | "WARN" | "ERR" | "EVT"

interface LogEntry {
  id: number
  time: Date
  level: LogLevel
  category: string
  message: string
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  INFO: "#22c55e",
  WARN: "#f59e0b",
  ERR: "#ef4444",
  EVT: "#60a5fa",
}

let _counter = 0

/**
 * Emit a structured log entry to the Debug Console.
 * Safe to call even when DebugConsole is not mounted — events are silently dropped.
 */
export function debugLog(level: LogLevel, category: string, message: string): void {
  window.dispatchEvent(
    new CustomEvent<LogEntry>(LOG_EVENT, {
      detail: { id: ++_counter, time: new Date(), level, category, message },
    })
  )
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function fmtTime(d: Date): string {
  return d.toTimeString().slice(0, 8) // "HH:MM:SS"
}

const btnStyle: React.CSSProperties = {
  fontSize: 9,
  cursor: "pointer",
  background: "rgba(255,255,255,0.1)",
  border: "none",
  borderRadius: 4,
  padding: "2px 6px",
  color: "white",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DebugConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Listen for debugLog() events
  useEffect(() => {
    const handler = (e: Event) => {
      const entry = (e as CustomEvent<LogEntry>).detail
      setLogs((prev) => {
        const next = [...prev, entry]
        // Sliding window — keep newest MAX_LOGS entries
        return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next
      })
    }
    window.addEventListener(LOG_EVENT, handler)
    return () => window.removeEventListener(LOG_EVENT, handler)
  }, [])

  // Intercept console.error and console.warn only — not console.log (too noisy)
  useEffect(() => {
    const origError = console.error
    const origWarn = console.warn

    const fmt = (args: unknown[]) =>
      args
        .map((a) => {
          try {
            return typeof a === "object" ? JSON.stringify(a) : String(a)
          } catch {
            return String(a)
          }
        })
        .join(" ")

    console.error = (...args) => {
      origError(...args)
      debugLog("ERR", "Console", fmt(args))
    }
    console.warn = (...args) => {
      origWarn(...args)
      debugLog("WARN", "Console", fmt(args))
    }

    return () => {
      console.error = origError
      console.warn = origWarn
    }
  }, [])

  // Auto-scroll to bottom when expanded and new log arrives
  useEffect(() => {
    if (isExpanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, isExpanded])

  const copyAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = logs
      .map((l) => `${fmtTime(l.time)} [${l.level}] ${l.category}  ${l.message}`)
      .join("\n")
    navigator.clipboard.writeText(text)
  }

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLogs([])
  }

  const lastLog = logs[logs.length - 1]

  return (
    <div
      className="no-drag no-scrollbar"
      ref={scrollRef}
      style={{
        position: "relative",
        marginTop: 4,
        marginLeft: 4,
        marginRight: 4,
        height: isExpanded ? 220 : 24,
        background: isExpanded ? "rgba(0,0,0,0.88)" : "rgba(0,0,0,0.4)",
        backdropFilter: "blur(10px)",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        overflowY: isExpanded ? "auto" : "hidden",
        zIndex: 999999,
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 6,
        transition: "height 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s",
        boxSizing: "border-box",
        userSelect: isExpanded ? "text" : "none",
      }}
    >
      {/* ── Header bar ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 8px",
          height: 24,
          background: isExpanded ? "rgba(0,0,0,0.6)" : "transparent",
          borderBottom: isExpanded ? "1px solid rgba(255,255,255,0.08)" : "none",
          cursor: "pointer",
          userSelect: "none",
          flexShrink: 0,
        }}
        onClick={() => setIsExpanded((v) => !v)}
      >
        {/* Left: label + collapsed peek */}
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: "rgba(255,255,255,0.4)",
            overflow: "hidden",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          DEBUG {isExpanded ? "▼" : "▲"}
          {!isExpanded && lastLog && (
            <span style={{ marginLeft: 8, fontWeight: 400 }}>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>{fmtTime(lastLog.time)} </span>
              <span style={{ color: LEVEL_COLOR[lastLog.level] }}>[{lastLog.level}] </span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{lastLog.category} </span>
              <span style={{ color: "rgba(255,255,255,0.75)" }}>{lastLog.message}</span>
            </span>
          )}
        </span>

        {/* Right: action buttons (only when expanded) */}
        {isExpanded && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button style={btnStyle} onClick={copyAll}>
              Copy
            </button>
            <button style={btnStyle} onClick={clearAll}>
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Log entries ── */}
      {isExpanded &&
        logs.map((entry) => (
          <div
            key={entry.id}
            style={{
              padding: "2px 8px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              display: "flex",
              gap: 6,
              alignItems: "baseline",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
              {fmtTime(entry.time)}
            </span>
            <span
              style={{
                color: LEVEL_COLOR[entry.level],
                flexShrink: 0,
                fontWeight: 700,
                minWidth: 36,
              }}
            >
              [{entry.level}]
            </span>
            <span style={{ color: "rgba(255,255,255,0.45)", flexShrink: 0, minWidth: 56 }}>
              {entry.category}
            </span>
            <span style={{ color: "rgba(255,255,255,0.85)" }}>{entry.message}</span>
          </div>
        ))}
    </div>
  )
}
