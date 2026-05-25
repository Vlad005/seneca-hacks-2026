"use client";

import { useRef } from "react";
import type { UsageProfile } from "@/lib/types";

interface Props {
  split: UsageProfile["daily_split"];
  /** Approx kWh per day, just for the label tooltip. */
  dailyKwh: number;
  onChange: (next: UsageProfile["daily_split"]) => void;
}

type SegmentKey = keyof UsageProfile["daily_split"];

const SEGMENTS: { key: SegmentKey; label: string; hours: string; color: string; period: "off" | "mid" | "on" }[] = [
  { key: "night", label: "Night", hours: "11pm – 6am", color: "#1e3a8a", period: "off" },
  { key: "morning", label: "Morning", hours: "6am – 11am", color: "#dc2626", period: "on" },
  { key: "day", label: "Day", hours: "11am – 5pm", color: "#f59e0b", period: "mid" },
  { key: "evening", label: "Evening", hours: "5pm – 11pm", color: "#7c2d12", period: "on" },
];

const PERIOD_LABEL: Record<"off" | "mid" | "on", string> = {
  off: "Off-peak",
  mid: "Mid-peak",
  on: "On-peak",
};

const WIDTH = 720;
const HEIGHT = 80;
const PAD_X = 12;
const INNER_W = WIDTH - PAD_X * 2;
const MIN_FRAC = 0.02;

export function DailySplitChart({ split, dailyKwh, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<number | null>(null); // 0..2 = divider index between segments

  const order: SegmentKey[] = SEGMENTS.map((s) => s.key);
  const fracs = order.map((k) => split[k]);

  // Cumulative x positions in [0, 1] for each divider — there are 3 dividers.
  const cumulative: number[] = [];
  let acc = 0;
  for (let i = 0; i < fracs.length - 1; i++) {
    acc += fracs[i];
    cumulative.push(acc);
  }

  const onPointerDown = (dividerIdx: number) => (e: React.PointerEvent<SVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = dividerIdx;
  };

  const onPointerMove = (e: React.PointerEvent<SVGElement>) => {
    const d = draggingRef.current;
    if (d === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xPx = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const xFrac = Math.max(0, Math.min(1, (xPx - PAD_X) / INNER_W));

    // Compute neighbours' floor/ceiling so neither shrinks below MIN_FRAC.
    const leftBoundary = d === 0 ? 0 : cumulative[d - 1];
    const rightBoundary = d === fracs.length - 2 ? 1 : cumulative[d + 1];
    const minPos = leftBoundary + MIN_FRAC;
    const maxPos = rightBoundary - MIN_FRAC;
    const clamped = Math.max(minPos, Math.min(maxPos, xFrac));

    const nextFracs = fracs.slice();
    const oldLeftFrac = clamped - leftBoundary;
    const oldRightFrac = rightBoundary - clamped;
    nextFracs[d] = oldLeftFrac;
    nextFracs[d + 1] = oldRightFrac;

    const nextSplit: UsageProfile["daily_split"] = {
      night: nextFracs[0],
      morning: nextFracs[1],
      day: nextFracs[2],
      evening: nextFracs[3],
    };
    onChange(nextSplit);
  };

  const onPointerUp = (e: React.PointerEvent<SVGElement>) => {
    if (draggingRef.current === null) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    draggingRef.current = null;
  };

  // Aggregate by TOU period for the secondary readout below the bar.
  const periodTotals = { off: 0, mid: 0, on: 0 };
  SEGMENTS.forEach((s, i) => {
    periodTotals[s.period] += fracs[i];
  });

  return (
    <div className="w-full">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Daily usage by time-of-day
        </h3>
        <div className="text-xs text-neutral-500">
          ≈ <span className="font-semibold text-neutral-800 dark:text-neutral-200">{Math.round(dailyKwh)}</span> kWh / day
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ touchAction: "none", userSelect: "none", display: "block" }}
      >
        {SEGMENTS.map((seg, i) => {
          const startFrac = i === 0 ? 0 : cumulative[i - 1];
          const endFrac = i === SEGMENTS.length - 1 ? 1 : cumulative[i];
          const x = PAD_X + startFrac * INNER_W;
          const w = Math.max(0, (endFrac - startFrac) * INNER_W);
          const pct = Math.round(fracs[i] * 100);
          return (
            <g key={seg.key}>
              <rect x={x} y={20} width={w} height={36} fill={seg.color} rx={4} />
              {w > 48 && (
                <>
                  <text
                    x={x + w / 2}
                    y={42}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="600"
                    fill="white"
                  >
                    {pct}%
                  </text>
                  <text
                    x={x + w / 2}
                    y={14}
                    textAnchor="middle"
                    fontSize="11"
                    fill="currentColor"
                  >
                    {seg.label}
                  </text>
                  <text
                    x={x + w / 2}
                    y={72}
                    textAnchor="middle"
                    fontSize="10"
                    fill="currentColor"
                    fillOpacity={0.55}
                  >
                    {seg.hours}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {cumulative.map((c, i) => {
          const x = PAD_X + c * INNER_W;
          return (
            <g
              key={i}
              onPointerDown={onPointerDown(i)}
              style={{ cursor: "ew-resize" }}
            >
              <rect x={x - 8} y={16} width={16} height={44} fill="transparent" />
              <line
                x1={x}
                x2={x}
                y1={18}
                y2={58}
                stroke="white"
                strokeWidth={2}
              />
              <circle cx={x} cy={38} r={6} fill="white" stroke="#525252" strokeWidth={1.5} />
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {(["on", "mid", "off"] as const).map((p) => (
          <div key={p} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{
                background:
                  p === "on" ? "#dc2626" : p === "mid" ? "#f59e0b" : "#1e3a8a",
              }}
            />
            <span className="text-neutral-500">{PERIOD_LABEL[p]}</span>
            <span className="font-semibold tabular-nums">
              {Math.round(periodTotals[p] * 100)}%
            </span>
          </div>
        ))}
      </div>

      <p className="mt-2 text-xs text-neutral-500">
        Drag the white handles to redistribute. On-peak hours map to Ontario&apos;s
        winter TOU windows; mid- and off-peak follow the same schedule.
      </p>
    </div>
  );
}
