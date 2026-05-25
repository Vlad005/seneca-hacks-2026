"use client";

import { useRef } from "react";
import type { UsageProfile } from "@/lib/types";

interface Props {
  split: UsageProfile["daily_split"];
  /** Approx kWh per day, for the headline number. */
  dailyKwh: number;
  onChange: (next: UsageProfile["daily_split"]) => void;
}

type SegmentKey = keyof UsageProfile["daily_split"];

const SEGMENTS: { key: SegmentKey; label: string; hours: string; tint: string }[] = [
  { key: "night",   label: "Night",   hours: "11pm – 6am", tint: "#1c1917" },
  { key: "morning", label: "Morning", hours: "6am – 11am", tint: "#44403c" },
  { key: "day",     label: "Day",     hours: "11am – 5pm", tint: "#78716c" },
  { key: "evening", label: "Evening", hours: "5pm – 11pm", tint: "#a8a29e" },
];

const WIDTH = 720;
const HEIGHT = 96;
const PAD_X = 0;
const INNER_W = WIDTH - PAD_X * 2;
const MIN_FRAC = 0.03;

export function DailySplitChart({ split, dailyKwh, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<number | null>(null);

  const order: SegmentKey[] = SEGMENTS.map((s) => s.key);
  const fracs = order.map((k) => split[k]);

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

    const leftBoundary = d === 0 ? 0 : cumulative[d - 1];
    const rightBoundary = d === fracs.length - 2 ? 1 : cumulative[d + 1];
    const minPos = leftBoundary + MIN_FRAC;
    const maxPos = rightBoundary - MIN_FRAC;
    const clamped = Math.max(minPos, Math.min(maxPos, xFrac));

    const nextFracs = fracs.slice();
    nextFracs[d] = clamped - leftBoundary;
    nextFracs[d + 1] = rightBoundary - clamped;

    onChange({
      night: nextFracs[0],
      morning: nextFracs[1],
      day: nextFracs[2],
      evening: nextFracs[3],
    });
  };

  const onPointerUp = (e: React.PointerEvent<SVGElement>) => {
    if (draggingRef.current === null) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    draggingRef.current = null;
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex items-end justify-between gap-6">
        <div>
          <div className="text-3xl font-semibold tracking-tight tabular-nums">
            {Math.round(dailyKwh)}
            <span className="ml-1.5 text-base font-normal text-[var(--muted)]">kWh / day</span>
          </div>
          <div className="mt-1 text-xs text-[var(--subtle)]">
            How a typical day breaks down
          </div>
        </div>
        <p className="hidden text-xs text-[var(--subtle)] sm:block">
          Drag the handles between segments.
        </p>
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
          const isFirst = i === 0;
          const isLast = i === SEGMENTS.length - 1;
          const isWide = w > 60;
          return (
            <g key={seg.key}>
              <path
                d={segmentPath(x, 28, w, 44, 10, isFirst, isLast)}
                fill={seg.tint}
              />
              {isWide && (
                <>
                  <text
                    x={x + 12}
                    y={20}
                    fontSize="11"
                    fill="currentColor"
                    fillOpacity={0.85}
                    fontWeight="500"
                  >
                    {seg.label}
                  </text>
                  <text
                    x={x + w - 12}
                    y={20}
                    textAnchor="end"
                    fontSize="11"
                    fill="currentColor"
                    fillOpacity={0.55}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {pct}%
                  </text>
                  <text
                    x={x + 12}
                    y={88}
                    fontSize="10"
                    fill="currentColor"
                    fillOpacity={0.45}
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
              <rect x={x - 10} y={24} width={20} height={52} fill="transparent" />
              <line x1={x} x2={x} y1={32} y2={68} stroke="white" strokeWidth={2} strokeOpacity={0.9} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Rounded-corner pill segment. Only corners on the outer ends round. */
function segmentPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  roundLeft: boolean,
  roundRight: boolean,
): string {
  const rl = roundLeft ? r : 0;
  const rr = roundRight ? r : 0;
  return [
    `M ${x + rl} ${y}`,
    `L ${x + w - rr} ${y}`,
    rr > 0 ? `A ${rr} ${rr} 0 0 1 ${x + w} ${y + rr}` : ``,
    `L ${x + w} ${y + h - rr}`,
    rr > 0 ? `A ${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h}` : ``,
    `L ${x + rl} ${y + h}`,
    rl > 0 ? `A ${rl} ${rl} 0 0 1 ${x} ${y + h - rl}` : ``,
    `L ${x} ${y + rl}`,
    rl > 0 ? `A ${rl} ${rl} 0 0 1 ${x + rl} ${y}` : ``,
    "Z",
  ]
    .filter(Boolean)
    .join(" ");
}
