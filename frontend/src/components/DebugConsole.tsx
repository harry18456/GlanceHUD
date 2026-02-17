import React, { useState, useEffect, useRef } from "react";

export function DebugConsole() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const logsRef = useRef<string[]>([]); // Ref to access latest state in hook
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const addLog = (prefix: string, args: any[]) => {
      const msg = args.map(a => {
        try {
          return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a);
        } catch {
          return String(a);
        }
      }).join(" ");
      
      const newLog = `[${prefix}] ${msg}`;
      // Use ref to keep logs in memory without re-binding hook
      logsRef.current = [...logsRef.current.slice(-49), newLog];
      setLogs([...logsRef.current]);
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog("LOG", args);
    };
    console.error = (...args) => {
      originalError(...args);
      addLog("ERR", args);
    };
    console.warn = (...args) => {
      originalWarn(...args);
      addLog("WRN", args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      className="no-drag no-scrollbar"
      style={{
        position: "relative",
        marginTop: 4,
        marginLeft: 4,
        marginRight: 4,
        height: isExpanded ? 250 : 24,
        background: isExpanded ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.4)",
        backdropFilter: "blur(10px)",
        color: "#0f0",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        overflowY: isExpanded ? "auto" : "hidden",
        zIndex: 999999,
        padding: isExpanded ? 8 : "0 8px",
        pointerEvents: "auto",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 6,
        whiteSpace: "pre-wrap",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        boxSizing: "border-box",
        userSelect: "text",
        cursor: isExpanded ? "text" : "pointer",
      }}
      ref={scrollRef}
    >
      <div 
        style={{ 
          position: 'sticky', 
          top: 0, 
          background: isExpanded ? 'rgba(0,0,0,0.5)' : 'transparent',
          borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.1)' : 'none',
          marginBottom: isExpanded ? 4 : 0,
          fontWeight: 600, 
          color: isExpanded ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
          padding: isExpanded ? "2px 4px" : "0",
          borderRadius: 4,
          height: isExpanded ? 'auto' : 24,
          fontSize: 9,
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>Debug Console {isExpanded ? '▼' : '▲'}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(logs.join("\n"));
            }}
            style={{ 
              fontSize: 9, 
              cursor: "pointer",
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: 4,
              padding: "2px 6px",
              color: "white",
            }}
          >
            Copy
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLogs([]);
              logsRef.current = [];
            }}
            style={{ 
              fontSize: 9, 
              cursor: "pointer",
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: 4,
              padding: "2px 6px",
              color: "white",
            }}
          >
            Clear
          </button>
        </div>
      </div>
      
      {isExpanded && (
        logs.map((log, i) => (
          <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "2px 0" }}>
            {log}
          </div>
        ))
      )}
    </div>
  );
}
