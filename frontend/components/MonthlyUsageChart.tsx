"use client";

import { useRef, useState } from "react";

interface Props {
  values: number[];
  labels: string[];
  onChange: (next: number[]) => void;
}

const WIDTH = 720;
const HEIGHT = 280;
const PAD_TOP = 28;
const PAD_BOTTOM = 44;
const PAD_X = 16;
const CHART_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

export function MonthlyUsageChart({ values, labels, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const maxRaw = Math.max(...values, 100);
  const max = Math.max(Math.ceil(maxRaw / 100) * 100, 100) * 1.18;
  const innerW = WIDTH - PAD_X * 2;
  const slot = innerW / 12;
  const barW = slot * 0.62;

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

  const total = values.reduce((a, b) => a + b, 0);
  const avg = Math.round(total / 12);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-end justify-between gap-6">
        <div>
          <div className="text-3xl font-semibold tracking-tight tabular-nums">
            {total.toLocaleString()}
            <span className="ml-1.5 text-base font-normal text-[var(--muted)]">kWh</span>
          </div>
          <div className="mt-1 text-xs text-[var(--subtle)]">
            Annual total · {avg.toLocaleString()} kWh / month average
          </div>
        </div>
        <p className="hidden text-xs text-[var(--subtle)] sm:block">
          Drag a bar, or click its number.
        </p>
      </div>

      <div className="relative w-full" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
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
          {/* baseline */}
          <line
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={PAD_TOP + CHART_H}
            y2={PAD_TOP + CHART_H}
            stroke="currentColor"
            strokeOpacity={0.18}
          />

          {values.map((v, i) => {
            const cx = PAD_X + slot * (i + 0.5);
            const x = cx - barW / 2;
            const y = yFor(v);
            const h = PAD_TOP + CHART_H - y;
            const isHover = hoverIdx === i;
            return (
              <g
                key={i}
                onPointerEnter={() => setHoverIdx(i)}
                onPointerLeave={() => setHoverIdx(null)}
              >
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
                  rx={4}
                  fill="var(--accent)"
                  fillOpacity={isHover ? 1 : 0.92}
                  onPointerDown={onPointerDown(i)}
                  style={{ cursor: "ns-resize" }}
                />
                {/* value: only on hover or when wide enough */}
                <text
                  x={cx}
                  y={Math.max(y - 8, PAD_TOP - 2)}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="currentColor"
                  fillOpacity={isHover ? 1 : 0.85}
                  onClick={() => startEdit(i)}
                  style={{ cursor: "text" }}
                >
                  {Math.round(v)}
                </text>
                <text
                  x={cx}
                  y={HEIGHT - PAD_BOTTOM + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fill="currentColor"
                  fillOpacity={0.5}
                  letterSpacing="0.04em"
                >
                  {labels[i]}
                </text>
              </g>
            );
          })}
        </svg>

        {editingIdx !== null && (
          <div className="absolute -top-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-sm">
            <span className="text-xs text-[var(--subtle)]">
              {labels[editingIdx]}
            </span>
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
              className="w-24 rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm outline-none focus:border-[var(--ink)]"
            />
            <span className="text-xs text-[var(--subtle)]">kWh</span>
          </div>
        )}
      </div>
    </div>
  );
}
