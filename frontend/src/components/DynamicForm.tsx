import React, { useState, useEffect } from "react";
import { ConfigSchema } from "../types";

interface Props {
  schema: ConfigSchema[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--glass-border)",
  borderRadius: 8,
  padding: "7px 10px",
  color: "var(--text-primary)",
  fontSize: 13,
  fontFamily: "var(--font-mono)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export const DynamicForm: React.FC<Props> = ({ schema, values, onChange }) => {
  const [formData, setFormData] = useState(values);

  useEffect(() => {
    setFormData(values);
  }, [values]);

  const handleChange = (key: string, value: any) => {
    const newData = { ...formData, [key]: value };
    setFormData(newData);
    onChange(newData);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {schema.map((field) => (
        <div
          key={field.name || field.label}
          style={{ display: "flex", flexDirection: "column", gap: 5 }}
        >
          <label
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {field.label}
          </label>

          {field.type === "text" && (
            <input
              type="text"
              value={formData[field.name!] || ""}
              onChange={(e) => handleChange(field.name!, e.target.value)}
              style={inputStyle}
            />
          )}

          {field.type === "number" && (
            <input
              type="number"
              value={formData[field.name!] || 0}
              onChange={(e) => handleChange(field.name!, Number(e.target.value))}
              style={inputStyle}
            />
          )}

          {field.type === "bool" && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={!!formData[field.name!]}
                onChange={(e) => handleChange(field.name!, e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "var(--color-healthy)" }}
              />
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Enable
              </span>
            </label>
          )}

          {field.type === "checkboxes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {field.options?.map((opt) => {
                const raw = formData[field.name!];
                const selected: string[] = Array.isArray(raw)
                  ? raw
                  : Array.isArray(field.default) ? field.default : [];
                const checked = selected.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? selected.filter((v) => v !== opt.value)
                          : [...selected, opt.value];
                        handleChange(field.name!, next);
                      }}
                      style={{
                        width: 15,
                        height: 15,
                        accentColor: "var(--color-healthy)",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {field.type === "select" && (
            <select
              value={formData[field.name!] || ""}
              onChange={(e) => handleChange(field.name!, e.target.value)}
              style={{
                ...inputStyle,
                appearance: "none",
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%23888\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
                paddingRight: 30,
              }}
            >
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
};
