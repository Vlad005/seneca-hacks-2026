"use client";

import { useEffect, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DerivedResults } from "@/lib/derive-results";

interface Props {
  derived: DerivedResults;
  meterChoice: "net-metering" | "hrs";
  address: string;
}

/* ------------------------------------------------------------------------ */

export function ResultsLayout({ derived, meterChoice, address }: Props) {
  const [scenario, setScenario] = useState<"net-metering" | "hrs">(meterChoice);

  return (
    <div className="space-y-12 px-5 py-10 sm:px-8 sm:py-14 lg:py-12">
      <HeroSection
        scenario={scenario}
        onSwap={setScenario}
        derived={derived}
        address={address}
      />
      <RoofGlanceSection derived={derived} />
      <SunlightSection derived={derived} />
      <NetMeteringFlowSection derived={derived} />
      <MonthlyBalanceSection derived={derived} />
      <ReadinessSection derived={derived} />
      <PaybackTimelineSection derived={derived} />
      <InstallersSection />
    </div>
  );
}

/* ----------------------------- Section A: Hero -------------------------- */

function HeroSection({
  scenario,
  onSwap,
  derived,
  address,
}: {
  scenario: "net-metering" | "hrs";
  onSwap: (v: "net-metering" | "hrs") => void;
  derived: DerivedResults;
  address: string;
}) {
  const heroValue =
    scenario === "net-metering"
      ? derived.lifetimeValueCAD
      : derived.hrsScenario.lifetimeValue;
  const heroLabel =
    scenario === "net-metering" ? "Net Metering" : "Home Renovation Savings";

  const display = useCountUp(Math.round(heroValue), 1600);

  return (
    <section>
      <p className="eyebrow">25-year savings · {heroLabel}</p>
      <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="text-[56px] font-semibold leading-none tracking-[-0.03em] tabular-nums sm:text-[72px]">
          ${display.toLocaleString()}
        </div>
        <div className="mb-1 text-sm text-[var(--muted)]">
          {derived.systemKw} kW · {address}
        </div>
      </div>

      <div className="mt-5 inline-flex rounded-full border border-[var(--border)] p-0.5">
        <ScenarioToggle
          active={scenario === "net-metering"}
          onClick={() => onSwap("net-metering")}
        >
          Net Metering
        </ScenarioToggle>
        <ScenarioToggle
          active={scenario === "hrs"}
          onClick={() => onSwap("hrs")}
        >
          HRS comparison
        </ScenarioToggle>
      </div>

      {scenario === "hrs" && (
        <p className="mt-3 max-w-md text-xs text-[var(--subtle)]">
          With HRS you pocket $10K up front but lose ~$
          {Math.abs(derived.hrsScenario.deltaVsNetMetering).toLocaleString()} over
          25 years vs Net Metering. Alternate scenario — precomputed.
        </p>
      )}
    </section>
  );
}

function ScenarioToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-[var(--ink)] text-[var(--background)]"
          : "text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}

/* -------------------- Section B: Roof at a glance ----------------------- */

function RoofGlanceSection({ derived }: { derived: DerivedResults }) {
  const stats = [
    { label: "Usable roof", value: `${Math.round(derived.usableAreaSqm)} m²` },
    { label: "Panels", value: String(derived.panelCount) },
    { label: "System size", value: `${derived.systemKw.toFixed(1)} kW` },
    {
      label: "Annual generation",
      value: `${Math.round(derived.annualKwh).toLocaleString()} kWh`,
    },
  ];
  return (
    <Card>
      <SectionHeader title="Your roof, by the numbers" />
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              {s.value}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--subtle)]">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------------- Section C: Sunlight graphs ---------------------- */

function SunlightSection({ derived }: { derived: DerivedResults }) {
  // Aggregate 365 daily into 52 weekly points so the chart isn't a blur.
  const theoreticalWeekly = aggregateWeekly(derived.theoreticalDaily);
  const actualWeekly = aggregateWeekly(derived.actualDaily);

  const data = theoreticalWeekly.map((th, i) => ({
    week: i + 1,
    theoretical: th,
    actual: actualWeekly[i],
  }));

  return (
    <Card>
      <SectionHeader
        title="Sunlight reaching your roof"
        hint="Theoretical clear-sky vs cloud-adjusted from 5-year history"
      />
      <div className="mt-4 grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr]">
        <SunChart data={data} dataKey="theoretical" tint="#facc15" label="Clear sky" />
        <div className="text-center">
          <div className="text-4xl font-semibold tabular-nums">
            {Math.round(derived.avgRealizationPct)}%
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            of theoretical sunlight
            <br />
            reaches you on average
          </div>
        </div>
        <SunChart data={data} dataKey="actual" tint="#0ea5e9" label="After clouds" />
      </div>
    </Card>
  );
}

function SunChart({
  data,
  dataKey,
  tint,
  label,
}: {
  data: Array<{ week: number } & Record<string, number>>;
  dataKey: string;
  tint: string;
  label: string;
}) {
  return (
    <div className="h-40 w-full">
      <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-[var(--subtle)]">
        {label}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={tint}
            fill={tint}
            fillOpacity={0.22}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <XAxis dataKey="week" hide />
          <YAxis hide />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------- Section D: Net Metering 24h flow -------------------- */

function NetMeteringFlowSection({ derived }: { derived: DerivedResults }) {
  const data = derived.hourlyGen.map((_g, h) => ({
    hour: h,
    self: derived.hourlySelf[h],
    exp: derived.hourlyExport[h],
    usage: derived.hourlyUsage[h],
    grid: -derived.hourlyGridDraw[h],
  }));

  const stats = [
    {
      label: "Self-consumed",
      value: `${Math.round(derived.annualSelfConsumptionPct)}%`,
      sub: "of generation",
    },
    {
      label: "Exported",
      value: `${Math.round(derived.annualExportKwh).toLocaleString()} kWh`,
      sub: "to the grid / year",
    },
    {
      label: "Bill credit",
      value: `$${Math.round(derived.annualBillCreditCAD).toLocaleString()}`,
      sub: "annual at TOU rate",
    },
  ];

  return (
    <Card>
      <SectionHeader
        title="A typical day on your roof"
        hint="Hour-by-hour generation vs your usage curve"
      />
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#e6e9e3" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="hour"
              ticks={[0, 6, 12, 18, 23]}
              tickFormatter={(h: number) =>
                h === 0 ? "12a" : h === 12 ? "noon" : h < 12 ? `${h}a` : `${h - 12}p`
              }
              stroke="#8a948a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#8a948a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(v: number) => `${v}`}
            />
            <Tooltip
              formatter={(value, name) => [
                `${Math.abs(Number(value)).toFixed(2)} kWh`,
                tooltipName(String(name)),
              ]}
              labelFormatter={(h) => `Hour ${h}`}
              contentStyle={{
                background: "white",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="self"
              stackId="up"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.55}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="exp"
              stackId="up"
              stroke="#38bdf8"
              fill="#38bdf8"
              fillOpacity={0.45}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="grid"
              stroke="#f43f5e"
              fill="#f43f5e"
              fillOpacity={0.25}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="usage"
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <ReferenceLine y={0} stroke="#cbd5e1" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4 border-t border-[var(--border)] pt-5">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-xl font-semibold tabular-nums">{s.value}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--subtle)]">
              {s.label}
            </div>
            <div className="text-xs text-[var(--muted)]">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
        Your {derived.systemKw.toFixed(1)} kW system is under Ontario's 12 kW
        residential Net Metering cap (effective May 2026 under O. Reg. 541/05).
      </div>
    </Card>
  );
}

function tooltipName(key: string): string {
  if (key === "self") return "Self-consumed";
  if (key === "exp") return "Exported";
  if (key === "usage") return "Usage";
  if (key === "grid") return "From grid";
  return key;
}

/* ---------------------- Section D2: Monthly balance --------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function MonthlyBalanceSection({ derived }: { derived: DerivedResults }) {
  const data = MONTHS.map((m, i) => ({
    month: m,
    usage: Math.round(derived.monthlyUsage[i]),
    gen: Math.round(derived.monthlyGen[i]),
    net: Math.round(derived.monthlyNet[i]),
  }));

  return (
    <Card>
      <SectionHeader
        title="Your year in net metering"
        hint="Summer generation banks credits; winter draw spends them"
      />
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#e6e9e3" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#8a948a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#8a948a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Bar dataKey="usage" fill="#f87171" radius={[3, 3, 0, 0]} name="Usage" />
            <Bar dataKey="gen" fill="#facc15" radius={[3, 3, 0, 0]} name="Generation" />
            <Line
              type="monotone"
              dataKey="net"
              stroke="#0f172a"
              strokeWidth={1.5}
              dot={{ r: 2.5, fill: "#0f172a" }}
              name="Net"
              isAnimationActive={false}
            />
            <ReferenceLine y={0} stroke="#cbd5e1" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4 border-t border-[var(--border)] pt-5 text-sm">
        <div>
          <div className="text-xl font-semibold tabular-nums">
            {derived.netExportMonths}
          </div>
          <div className="text-xs text-[var(--muted)]">Net-export months</div>
        </div>
        <div>
          <div className="text-xl font-semibold tabular-nums">
            {derived.netDrawMonths}
          </div>
          <div className="text-xs text-[var(--muted)]">Net-draw months</div>
        </div>
        <div>
          <div className="text-xl font-semibold tabular-nums">
            {Math.round(derived.annualSelfCoveragePct)}%
          </div>
          <div className="text-xs text-[var(--muted)]">Annual self-coverage</div>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------- Section E: Readiness ------------------------- */

interface ReadinessFactor {
  label: string;
  status: "pass" | "warn" | "info";
  value: string;
  why: string;
  sourceLabel?: string;
  sourceUrl?: string;
}

function ReadinessSection({ derived }: { derived: DerivedResults }) {
  const factors = buildReadinessFactors(derived);
  return (
    <Card>
      <SectionHeader
        title="Connection readiness"
        hint="What your LDC actually checks before approving residential solar"
      />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {factors.map((f) => (
          <div
            key={f.label}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold">{f.label}</span>
              <StatusPill status={f.status} />
            </div>
            <div className="mt-2 text-xs text-[var(--muted)]">{f.why}</div>
            <div className="mt-2 text-sm font-medium">{f.value}</div>
            {f.sourceUrl && (
              <a
                href={f.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-[11px] uppercase tracking-[0.1em] text-[var(--subtle)] hover:text-[var(--foreground)]"
              >
                {f.sourceLabel ?? "Source"} ↗
              </a>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function buildReadinessFactors(derived: DerivedResults): ReadinessFactor[] {
  return [
    {
      label: "Net Metering cap",
      status: derived.systemKw <= 12 ? "pass" : "warn",
      value:
        derived.systemKw <= 12
          ? `${derived.systemKw.toFixed(1)} kW · under 12 kW cap`
          : `${derived.systemKw.toFixed(1)} kW · over 12 kW cap`,
      why: "Ontario residential cap is 12 kW. Under = simple approval, no Connection Impact Assessment fee.",
      sourceLabel: "O. Reg. 541/05",
      sourceUrl: "https://www.ontario.ca/laws/regulation/050541",
    },
    {
      label: "Feeder hosting capacity",
      status: "info",
      value: "Source unavailable in demo",
      why: "Your feeder's available capacity vs already-approved DER. Live CCIM scrape pending in v2.",
      sourceLabel: "OEB CCIM",
      sourceUrl: "https://www.oeb.ca/regulatory-rules-and-documents/rule-and-code-amendments/connection-impact-assessment",
    },
    {
      label: "DER density on feeder",
      status: "info",
      value: "Source unavailable in demo",
      why: "High existing DER load increases CIA likelihood. Aggregated approved capacity ÷ feeder hosting.",
      sourceLabel: "OEB CCIM",
      sourceUrl: "https://www.oeb.ca/",
    },
    {
      label: "Distance to substation",
      status: "info",
      value: "Source unavailable in demo",
      why: "Long runs increase voltage rise risk and CIA cost. Nearest substation lookup pending in v2.",
      sourceLabel: "OSM Overpass",
      sourceUrl: "https://overpass-turbo.eu/",
    },
    {
      label: "Building rate class",
      status: "pass",
      value: "Residential",
      why: "Net Metering requires you to be a retail electricity customer at the same site.",
      sourceLabel: "From your bill",
    },
    {
      label: "Equipment compliance",
      status: "info",
      value: "Confirmed at install time",
      why: "CSA-certified inverter required; smart inverter mandatory since 2024.",
      sourceLabel: "IESO bulletin",
      sourceUrl: "https://saveonenergy.ca/",
    },
  ];
}

function StatusPill({ status }: { status: "pass" | "warn" | "info" }) {
  const map = {
    pass: { bg: "bg-emerald-50 text-emerald-800", text: "Pass" },
    warn: { bg: "bg-amber-50 text-amber-900", text: "Check" },
    info: { bg: "bg-stone-100 text-stone-600", text: "Demo data" },
  } as const;
  const s = map[status];
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.bg}`}>
      {s.text}
    </span>
  );
}

/* -------------------- Section F: Payback timeline ----------------------- */

function PaybackTimelineSection({ derived }: { derived: DerivedResults }) {
  const data = derived.cumulativeCashflow.map((c, i) => ({
    year: i,
    cum: Math.round(c),
    yearly: Math.round(derived.yearlyCashflow[i]),
  }));

  return (
    <Card>
      <SectionHeader
        title="When the system pays itself off"
        hint="25-year cumulative cashflow with degradation + escalation"
      />
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#e6e9e3" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="year"
              stroke="#8a948a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#8a948a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) =>
                v >= 1000 || v <= -1000 ? `${Math.round(v / 1000)}k` : String(v)
              }
            />
            <Tooltip
              formatter={(value) => [
                `$${Number(value).toLocaleString()}`,
                "Cumulative",
              ]}
              labelFormatter={(y) => `Year ${y}`}
              contentStyle={{
                background: "white",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Bar dataKey="cum" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.cum < 0 ? "#f87171" : "#10b981"} />
              ))}
            </Bar>
            {derived.breakevenYear !== null && (
              <ReferenceLine
                x={derived.breakevenYear}
                stroke="#0f172a"
                strokeDasharray="4 4"
                label={{
                  value: `Year ${derived.breakevenYear} · paid off`,
                  position: "top",
                  fontSize: 11,
                  fill: "#0f172a",
                }}
              />
            )}
            <ReferenceLine y={0} stroke="#94a3b8" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4 border-t border-[var(--border)] pt-5">
        <div>
          <div className="text-xl font-semibold tabular-nums">
            ${Math.round(derived.upfrontCost).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">Upfront cost</div>
        </div>
        <div>
          <div className="text-xl font-semibold tabular-nums">
            ${Math.round(derived.annualSavingsCAD).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">Year-1 savings</div>
        </div>
        <div>
          <div className="text-xl font-semibold tabular-nums">
            ${Math.round(derived.lifetimeValueCAD).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">Lifetime value</div>
        </div>
      </div>
    </Card>
  );
}

/* recharts Cell needs to be imported separately, but we declare via the
 * <Bar>'s children — recharts exports it. Importing inline to keep this file
 * self-contained: */
import { Cell } from "recharts";

/* ---------------------- Section G: Installer cards ---------------------- */

const INSTALLERS = [
  { name: "Pinegrove Solar", region: "Mississauga · Brampton", rating: 4.8 },
  { name: "Lakeshore Renewables", region: "Hamilton · Burlington", rating: 4.7 },
  { name: "GTA Solar Group", region: "Toronto · Markham", rating: 4.6 },
];

function InstallersSection() {
  return (
    <Card>
      <SectionHeader
        title="Pre-qualified installers"
        hint="3 of 247 Ontario solar professionals matched to your roof"
      />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {INSTALLERS.map((i) => (
          <div
            key={i.name}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <div className="text-sm font-semibold">{i.name}</div>
            <div className="mt-1 text-xs text-[var(--muted)]">{i.region}</div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="font-medium">★ {i.rating.toFixed(1)}</span>
              <span className="text-[var(--subtle)]">14-day SLA</span>
            </div>
          </div>
        ))}
      </div>
      <button
        disabled
        title="Quote handoff goes live in the next release."
        className="mt-5 cursor-not-allowed rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--background)] opacity-50"
      >
        Request 3 quotes
      </button>
    </Card>
  );
}

/* ----------------------------- shared bits ------------------------------ */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
      {children}
    </section>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-[-0.01em] sm:text-xl">
        {title}
      </h2>
      {hint && <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

/* ------------------------------ utilities ------------------------------- */

function aggregateWeekly(daily: number[]): number[] {
  const weekly: number[] = [];
  for (let w = 0; w < 52; w++) {
    let s = 0;
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      if (idx < daily.length) s += daily[idx];
    }
    weekly.push(s);
  }
  return weekly;
}

function useCountUp(target: number, durationMs: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}
