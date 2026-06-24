"use client";
import React from "react";
import { fmtTime } from "@/lib/format";

export type ConflictItem = {
  kind: "fixed" | "block";
  label: string;
  startAt: number;
  endAt: number;
};

export function ConflictWarningModal({
  conflicts,
  onCancel,
  onConfirm,
  pending,
}: {
  conflicts: ConflictItem[];
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
}): React.ReactElement {
  return (
    <div
      className="scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Cảnh báo xung đột lịch"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="sheet">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--danger)" }}>
            Xung đột lịch
          </h3>
        </div>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-secondary)" }}>
          Khoảng thời gian này trùng với {conflicts.length} mục sau:
        </p>

        {/* Conflict list */}
        <ul
          style={{
            margin: "0 0 16px",
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {conflicts.map((c, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: "var(--radius-md)",
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <span
                className={`chip ${c.kind === "fixed" ? "work" : "study"}`}
                style={{ flexShrink: 0, fontSize: 11 }}
              >
                {c.kind === "fixed" ? "Cố định" : "Khối việc"}
              </span>
              <span
                style={{
                  flex: 1,
                  fontWeight: 600,
                  fontSize: 13,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                  flexShrink: 0,
                }}
              >
                {fmtTime(c.startAt)}–{fmtTime(c.endAt)}
              </span>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="row2">
          <button
            className="btn line block"
            onClick={onCancel}
            disabled={pending}
            aria-label="Hủy tạo khối"
          >
            Hủy
          </button>
          <button
            className="btn primary block"
            onClick={onConfirm}
            disabled={pending}
            aria-label="Tạo khối dù có xung đột"
          >
            {pending ? "Đang lưu..." : "Tạo dù vậy"}
          </button>
        </div>
      </div>
    </div>
  );
}
