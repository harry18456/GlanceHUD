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
      // Filter out redundant logs if needed, but show all for now
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
      className="no-drag"
      style={{
        position: "relative",
        marginTop: 4,
        marginLeft: 4,
        marginRight: 4,
        // width taken from flex parent (app container)
        height: isExpanded ? 250 : 32,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(10px)",
        color: "#0f0",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        overflowY: "auto",
        zIndex: 999999,
        padding: 8,
        pointerEvents: "auto",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        whiteSpace: "pre-wrap",
        transition: "height 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        boxSizing: "border-box",
        userSelect: "text",
        cursor: "text",
      }}
      ref={scrollRef}
    >
      <div 
        style={{ 
          position: 'sticky', 
          top: 0, 
          background: 'rgba(0,0,0,0.5)', 
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: 4, 
          fontWeight: 600, 
          color: "rgba(255,255,255,0.9)",
          display: "flex",
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none",
          padding: "2px 4px",
          borderRadius: 4,
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
              fontSize: 10, 
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
              fontSize: 10, 
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
      
      {isExpanded ? (
        logs.map((log, i) => (
          <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "2px 0" }}>
            {log}
          </div>
        ))
      ) : (
        <div style={{ color: "#888", fontStyle: "italic" }}>
          {logs.length > 0 ? logs[logs.length - 1] : "No logs"}
        </div>
      )}
    </div>
  );
}
