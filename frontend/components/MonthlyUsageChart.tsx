"use client";

import { useRef, useState } from "react";

interface Props {
  values: number[]; // exactly 12
  labels: string[]; // exactly 12 (e.g. "Jun '25")
  onChange: (next: number[]) => void;
}

const WIDTH = 720;
const HEIGHT = 280;
const PAD_TOP = 24;
const PAD_BOTTOM = 44;
const PAD_X = 28;
const CHART_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

export function MonthlyUsageChart({ values, labels, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const maxRaw = Math.max(...values, 100);
  const max = Math.max(Math.ceil(maxRaw / 100) * 100, 100) * 1.15;
  const innerW = WIDTH - PAD_X * 2;
  const slot = innerW / 12;
  const barW = slot * 0.68;

  const yFor = (v: number) => PAD_TOP + CHART_H - (v / max) * CHART_H;

  const setValue = (idx: number, raw: number) => {
    const clamped = Math.max(0, Math.round(raw));
    const next = values.slice();
    next[idx] = clamped;
    onChange(next);
  };

  const onPointerDown = (idx: number) => (e: React.PointerEvent<SVGElement>) => {
    if (editingIdx !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = idx;
  };

  const onPointerMove = (e: React.PointerEvent<SVGElement>) => {
    const idx = draggingRef.current;
    if (idx === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const yPx = ((e.clientY - rect.top) / rect.height) * HEIGHT;
    const raw = ((PAD_TOP + CHART_H - yPx) / CHART_H) * max;
    setValue(idx, raw);
  };

  const onPointerUp = (e: React.PointerEvent<SVGElement>) => {
    if (draggingRef.current === null) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    draggingRef.current = null;
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditText(String(values[idx]));
  };

  const commitEdit = () => {
    if (editingIdx === null) return;
    const parsed = Number(editText);
    if (Number.isFinite(parsed)) setValue(editingIdx, parsed);
    setEditingIdx(null);
  };

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    y: PAD_TOP + CHART_H * (1 - p),
    label: Math.round(max * p),
  }));

  const total = values.reduce((a, b) => a + b, 0);
  const avg = Math.round(total / 12);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Monthly usage (kWh)
        </h3>
        <div className="text-xs text-neutral-500">
          12-month total <span className="font-semibold text-neutral-800 dark:text-neutral-200">{total.toLocaleString()}</span>
          {" · "}avg <span className="font-semibold text-neutral-800 dark:text-neutral-200">{avg.toLocaleString()}</span>/mo
        </div>
      </div>
      <div className="relative w-full" style={{ aspectRatio: `${WIDTH} / ${HEIGHT + 30}` }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          height="100%"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: "none", userSelect: "none" }}
        >
          {/* gridlines */}
          {gridLines.map((g, i) => (
            <g key={i}>
              <line
                x1={PAD_X}
                x2={WIDTH - PAD_X}
                y1={g.y}
                y2={g.y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeDasharray="3 4"
              />
              <text
                x={PAD_X - 6}
                y={g.y + 3}
                textAnchor="end"
                fontSize="10"
                fill="currentColor"
                fillOpacity={0.4}
              >
                {g.label}
              </text>
            </g>
          ))}

          {values.map((v, i) => {
            const cx = PAD_X + slot * (i + 0.5);
            const x = cx - barW / 2;
            const y = yFor(v);
            const h = PAD_TOP + CHART_H - y;
            return (
              <g key={i}>
                {/* hit target — slightly wider invisible rect for easier grabbing */}
                <rect
                  x={cx - slot / 2}
                  y={PAD_TOP}
                  width={slot}
                  height={CHART_H}
                  fill="transparent"
                  onPointerDown={onPointerDown(i)}
                  style={{ cursor: "ns-resize" }}
                />
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={3}
                  fill="#f59e0b"
                  fillOpacity={0.9}
                  onPointerDown={onPointerDown(i)}
                  style={{ cursor: "ns-resize" }}
                />
                {/* drag handle nub */}
                <line
                  x1={x + barW * 0.2}
                  x2={x + barW * 0.8}
                  y1={y + 4}
                  y2={y + 4}
                  stroke="white"
                  strokeWidth={1.5}
                  strokeOpacity={0.7}
                  pointerEvents="none"
                />
                {/* value label */}
                <text
                  x={cx}
                  y={Math.max(y - 6, PAD_TOP - 4)}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="currentColor"
                  onClick={() => startEdit(i)}
                  style={{ cursor: "text" }}
                >
                  {Math.round(v)}
                </text>
                {/* month label */}
                <text
                  x={cx}
                  y={HEIGHT - PAD_BOTTOM + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="currentColor"
                  fillOpacity={0.6}
                >
                  {labels[i]}
                </text>
              </g>
            );
          })}

          {/* baseline */}
          <line
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={PAD_TOP + CHART_H}
            y2={PAD_TOP + CHART_H}
            stroke="currentColor"
            strokeOpacity={0.3}
          />
        </svg>

        {editingIdx !== null && (
          <div
            className="absolute -top-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <span className="text-xs text-neutral-500">{labels[editingIdx]}</span>
            <input
              autoFocus
              type="number"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditingIdx(null);
              }}
              onBlur={commitEdit}
              className="w-24 rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <span className="text-xs text-neutral-500">kWh</span>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Drag a bar to adjust. Click the number above to type a value.
      </p>
    </div>
  );
}
