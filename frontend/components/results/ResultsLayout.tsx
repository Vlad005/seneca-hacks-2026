"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
    Area,
    Bar,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type { DerivedResults } from "@/lib/derive-results";
import type { Customization } from "@/lib/customization";
import { CustomizeModal } from "./CustomizeModal";

interface Props {
    derived: DerivedResults;
    /** Kept in props for future use; UI no longer toggles scenarios. */
    meterChoice: "net-metering" | "hrs";
    address: string;
    customization: Customization;
    onApplyCustomization: (next: Customization) => void;
    recomputing: boolean;
    /** Building footprint in m² from Mapbox polygon, or null if not detected. */
    footprintSqm: number | null;
}

type TabValue = "overview" | "data" | "readiness";

/* ------------------------------------------------------------------------ */

export function ResultsLayout({
    derived,
    address,
    customization,
    onApplyCustomization,
    recomputing,
    footprintSqm,
}: Props) {
    const [tab, setTab] = useState<TabValue>("overview");
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <div className="relative px-5 pt-10 pb-32 sm:px-8 sm:pt-14 lg:pt-12">
            <HeroSection
                derived={derived}
                address={address}
                onCustomize={() => setModalOpen(true)}
            />

            <div className="mt-8">
                <TabBar value={tab} onChange={setTab} />
            </div>

            <div className="relative mt-6 space-y-8">
                {recomputing && <RecomputeOverlay />}
                <div
                    className={
                        recomputing ? "opacity-40 transition-opacity" : ""
                    }
                >
                    {tab === "overview" && <OverviewTab derived={derived} />}
                    {tab === "data" && <DataTab derived={derived} />}
                    {tab === "readiness" && <ReadinessTab derived={derived} />}
                </div>
            </div>

            <BottomCTA derived={derived} />

            <CustomizeModal
                open={modalOpen}
                initial={customization}
                footprintSqm={footprintSqm}
                onClose={() => setModalOpen(false)}
                onApply={(next) => {
                    setModalOpen(false);
                    onApplyCustomization(next);
                }}
            />
        </div>
    );
}

function RecomputeOverlay() {
    return (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center pt-16">
            <div className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-medium text-[var(--muted)] shadow-sm">
                Recomputing your numbers…
            </div>
        </div>
    );
}

/* ----------------------------- Hero ------------------------------------- */

function HeroSection({
    derived,
    address,
    onCustomize,
}: {
    derived: DerivedResults;
    address: string;
    onCustomize: () => void;
}) {
    const breakevenTarget = derived.breakevenYear ?? 0;
    const breakeven = useCountUp(breakevenTarget, 1100);
    const lifetimeShown = useCountUp(
        Math.max(0, Math.round(derived.lifetimeValueCAD)),
        1500,
    );

    return (
        <section>
            <p className="eyebrow">{address || "Your roof"}</p>
            <div className="mt-3">
                <p className="text-sm text-[var(--muted)]">Break even in</p>
                <div className="mt-1 flex items-baseline gap-3">
                    <span className="text-[64px] font-semibold leading-none tracking-[-0.03em] tabular-nums sm:text-[80px]">
                        {derived.breakevenYear === null ? "—" : breakeven}
                    </span>
                    <span className="text-2xl font-medium text-[var(--muted)]">
                        {derived.breakevenYear === null ? "" : "years"}
                    </span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                    {derived.breakevenYear === null
                        ? "Doesn't pay back within the system lifetime."
                        : `Then $${lifetimeShown.toLocaleString()} ahead by year 25.`}
                </p>
            </div>
            <button
                onClick={onCustomize}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--muted)]"
            >
                <SlidersGlyph />
                Customize
            </button>
        </section>
    );
}

function SlidersGlyph() {
    return (
        <svg
            viewBox="0 0 16 16"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            aria-hidden
        >
            <path d="M2 4h4M10 4h4M2 12h8M14 12h0M2 8h2M8 8h6" />
            <circle cx="8" cy="4" r="1.6" fill="white" />
            <circle cx="12" cy="12" r="1.6" fill="white" />
            <circle cx="6" cy="8" r="1.6" fill="white" />
        </svg>
    );
}

/* ----------------------------- TabBar ----------------------------------- */

const TABS: { value: TabValue; label: string }[] = [
    { value: "overview", label: "Overview" },
    { value: "data", label: "Data" },
    { value: "readiness", label: "Readiness" },
];

function TabBar({
    value,
    onChange,
}: {
    value: TabValue;
    onChange: (v: TabValue) => void;
}) {
    return (
        <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--card)] p-0.5">
            {TABS.map((t) => (
                <button
                    key={t.value}
                    onClick={() => onChange(t.value)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                        value === t.value
                            ? "bg-[var(--ink)] text-[var(--background)]"
                            : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                >
                    {t.label}
                </button>
            ))}
        </div>
    );
}

/* ------------------------------ Overview tab ---------------------------- */

function OverviewTab({ derived }: { derived: DerivedResults }) {
    return (
        <>
            <RoofGlanceSection derived={derived} />
            <KeyNumbersSection derived={derived} />
        </>
    );
}

function RoofGlanceSection({ derived }: { derived: DerivedResults }) {
    const stats = [
        {
            label: "Usable roof",
            value: `${Math.round(derived.usableAreaSqm)} m²`,
        },
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

function KeyNumbersSection({ derived }: { derived: DerivedResults }) {
    return (
        <Card>
            <SectionHeader title="What it earns you" />
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <BigStat
                    label="Year-1 savings"
                    value={`$${Math.round(derived.annualSavingsCAD).toLocaleString()}`}
                />
                <BigStat
                    label="Lifetime value (25yr)"
                    value={`$${Math.round(derived.lifetimeValueCAD).toLocaleString()}`}
                />
                <BigStat
                    label="Self-coverage"
                    value={`${Math.round(derived.annualSelfCoveragePct)}%`}
                    sub="of your annual usage"
                />
            </div>
        </Card>
    );
}

function BigStat({
    label,
    value,
    sub,
}: {
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <div>
            <div className="text-3xl font-semibold tabular-nums tracking-tight">
                {value}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--subtle)]">
                {label}
            </div>
            {sub && (
                <div className="mt-0.5 text-xs text-[var(--muted)]">{sub}</div>
            )}
        </div>
    );
}

/* -------------------------------- Data tab ------------------------------ */

function DataTab({ derived }: { derived: DerivedResults }) {
    return (
        <div className="space-y-12">
            <SunlightSection derived={derived} />
            <NetMeteringFlowSection derived={derived} />
            <MonthlyBalanceSection derived={derived} />
            <PaybackTimelineSection derived={derived} />
        </div>
    );
}

function SunlightSection({ derived }: { derived: DerivedResults }) {
    const theoreticalWeekly = aggregateWeekly(derived.theoreticalDaily);
    const actualWeekly = aggregateWeekly(derived.actualDaily);
    const data = theoreticalWeekly.map((th, i) => ({
        week: i + 1,
        theoretical: th,
        actual: actualWeekly[i],
    }));
    return (
        <Card>
            <SectionHeader title="How much sunlight your roof actually gets" />
            <div className="mt-4 grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr]">
                <SunChart
                    data={data}
                    dataKey="theoretical"
                    tint={C_SOFT}
                    label="On a perfect day"
                />
                <div className="text-center">
                    <div className="text-4xl font-semibold tabular-nums">
                        {Math.round(derived.avgRealizationPct)}%
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                        of perfect sunlight
                        <br />
                        reaches you on a normal day
                    </div>
                </div>
                <SunChart
                    data={data}
                    dataKey="actual"
                    tint={C_PRIMARY}
                    label="On a typical day"
                />
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
                <ComposedChart
                    data={data}
                    margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                >
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
        },
        {
            label: "Annual export",
            value: `${Math.round(derived.annualExportKwh).toLocaleString()} kWh`,
        },
        {
            label: "Annual bill credit",
            value: `$${Math.round(derived.annualBillCreditCAD).toLocaleString()}`,
        },
    ];

    return (
        <Card>
            <SectionHeader title="A typical day on your roof" />
            <div className="mt-4 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={data}
                        margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                    >
                        <CartesianGrid
                            stroke="#e6e9e3"
                            strokeDasharray="2 4"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="hour"
                            ticks={[0, 6, 12, 18, 23]}
                            tickFormatter={(h: number) =>
                                h === 0
                                    ? "12a"
                                    : h === 12
                                      ? "noon"
                                      : h < 12
                                        ? `${h}a`
                                        : `${h - 12}p`
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
                            stroke={C_PRIMARY}
                            fill={C_PRIMARY}
                            fillOpacity={0.6}
                            isAnimationActive={false}
                        />
                        <Area
                            type="monotone"
                            dataKey="exp"
                            stackId="up"
                            stroke={C_SOFT}
                            fill={C_SOFT}
                            fillOpacity={0.7}
                            isAnimationActive={false}
                        />
                        <Area
                            type="monotone"
                            dataKey="grid"
                            stroke={C_NEUTRAL}
                            fill={C_NEUTRAL}
                            fillOpacity={0.18}
                            isAnimationActive={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="usage"
                            stroke={C_NEUTRAL}
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
                        <div className="text-xl font-semibold tabular-nums">
                            {s.value}
                        </div>
                        <div className="text-xs text-[var(--muted)]">
                            {s.label}
                        </div>
                    </div>
                ))}
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

const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

const C_PRIMARY = "#3ec079";
const C_SOFT = "#a7f3d0";
const C_NEUTRAL = "#475569";

function MonthlyBalanceSection({ derived }: { derived: DerivedResults }) {
    const data = MONTHS.map((m, i) => ({
        month: m,
        usage: Math.round(derived.monthlyUsage[i]),
        gen: Math.round(derived.monthlyGen[i]),
        net: Math.round(derived.monthlyNet[i]),
    }));
    return (
        <Card>
            <SectionHeader title="Your year in net metering" />
            <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={data}
                        margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                    >
                        <CartesianGrid
                            stroke="#e6e9e3"
                            strokeDasharray="2 4"
                            vertical={false}
                        />
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
                        <Bar
                            dataKey="usage"
                            fill={C_SOFT}
                            radius={[3, 3, 0, 0]}
                            name="Usage"
                        />
                        <Bar
                            dataKey="gen"
                            fill={C_PRIMARY}
                            radius={[3, 3, 0, 0]}
                            name="Generation"
                        />
                        <Line
                            type="monotone"
                            dataKey="net"
                            stroke={C_NEUTRAL}
                            strokeWidth={1.5}
                            dot={{ r: 2.5, fill: C_NEUTRAL }}
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
                    <div className="text-xs text-[var(--muted)]">
                        Net-export months
                    </div>
                </div>
                <div>
                    <div className="text-xl font-semibold tabular-nums">
                        {derived.netDrawMonths}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                        Net-draw months
                    </div>
                </div>
                <div>
                    <div className="text-xl font-semibold tabular-nums">
                        {Math.round(derived.annualSelfCoveragePct)}%
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                        Annual self-coverage
                    </div>
                </div>
            </div>
        </Card>
    );
}

function PaybackTimelineSection({ derived }: { derived: DerivedResults }) {
    const data = derived.cumulativeCashflow.map((c, i) => ({
        year: i,
        cum: Math.round(c),
    }));
    const maxYear = data.length - 1;
    const beYear = derived.breakevenYear;
    const labelAnchor: "start" | "middle" | "end" =
        beYear === null
            ? "middle"
            : beYear <= 3
              ? "start"
              : beYear >= maxYear - 3
                ? "end"
                : "middle";
    const labelDx =
        labelAnchor === "start" ? 6 : labelAnchor === "end" ? -6 : 0;
    return (
        <Card>
            <SectionHeader title="When the system pays itself off" />
            <div className="mt-4 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={data}
                        margin={{ top: 28, right: 16, bottom: 8, left: 0 }}
                    >
                        <CartesianGrid
                            stroke="#e6e9e3"
                            strokeDasharray="2 4"
                            vertical={false}
                        />
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
                                v >= 1000 || v <= -1000
                                    ? `${Math.round(v / 1000)}k`
                                    : String(v)
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
                                <Cell
                                    key={i}
                                    fill={d.cum < 0 ? C_NEUTRAL : C_PRIMARY}
                                />
                            ))}
                        </Bar>
                        {beYear !== null && (
                            <ReferenceLine
                                x={beYear}
                                stroke="#0f172a"
                                strokeDasharray="4 4"
                                label={(props: {
                                    viewBox?: { x: number; y: number };
                                }) => {
                                    const vb = props.viewBox ?? { x: 0, y: 0 };
                                    return (
                                        <text
                                            x={vb.x + labelDx}
                                            y={vb.y - 8}
                                            fontSize={11}
                                            fill="#0f172a"
                                            textAnchor={labelAnchor}
                                        >
                                            Year {beYear} · paid off
                                        </text>
                                    );
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
                    <div className="mt-1 text-xs text-[var(--muted)]">
                        Upfront cost
                    </div>
                </div>
                <div>
                    <div className="text-xl font-semibold tabular-nums">
                        ${Math.round(derived.annualSavingsCAD).toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                        Year-1 savings
                    </div>
                </div>
                <div>
                    <div className="text-xl font-semibold tabular-nums">
                        ${Math.round(derived.lifetimeValueCAD).toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                        Lifetime value
                    </div>
                </div>
            </div>
        </Card>
    );
}

/* ----------------------------- Readiness tab ---------------------------- */

function ReadinessTab({ derived }: { derived: DerivedResults }) {
    return (
        <Card>
            <SectionHeader title="Connection readiness" />
            <ReadinessHero systemKw={derived.systemKw} />
            <div className="mt-10 divide-y divide-[var(--border)]">
                <NetMeteringCapItem systemKw={derived.systemKw} />
                <FeederCapacityItem />
                <DerDensityItem />
                <DistanceItem />
            </div>
        </Card>
    );
}

/* ---------- Overall score + verdict ---------- */

interface ReadinessScore {
    score: number;
    tone: "pass" | "warn";
    verdictLabel: string;
}

/** Demo inputs for sections 2-4 — kept in sync with section visuals. */
const FEEDER_UTILIZED = 0.68;
const DER_SATURATION = 0.056;
const DISTANCE_KM = 1.8;

function computeReadinessScore(systemKw: number): ReadinessScore {
    const capPass = systemKw <= 12;
    const capScore = capPass
        ? 1 - Math.max(0, systemKw - 10) * 0.05
        : Math.max(0, 1 - (systemKw - 12) * 0.15);
    const rateClassScore = 1;
    const feederScore =
        FEEDER_UTILIZED < 0.6
            ? 1
            : FEEDER_UTILIZED < 0.85
              ? 1 - (FEEDER_UTILIZED - 0.6) * 1.8
              : 0.3;
    const derScore =
        DER_SATURATION < 0.1 ? 1 : DER_SATURATION < 0.25 ? 0.8 : 0.4;
    const distanceScore = DISTANCE_KM < 3 ? 1 : DISTANCE_KM < 5 ? 0.7 : 0.4;

    const raw =
        capScore * 40 +
        rateClassScore * 10 +
        feederScore * 20 +
        derScore * 15 +
        distanceScore * 15;
    const score = Math.round(raw) / 10;

    if (!capPass) {
        return { score, tone: "warn", verdictLabel: "CIA likely required" };
    }
    if (score >= 7.0) {
        return { score, tone: "pass", verdictLabel: "Likely approvable" };
    }
    return { score, tone: "warn", verdictLabel: "Some review expected" };
}

function ReadinessHero({ systemKw }: { systemKw: number }) {
    const { score, tone, verdictLabel } = computeReadinessScore(systemKw);
    const verdictColor =
        tone === "pass" ? "text-[var(--accent-deep)]" : "text-amber-700";
    return (
        <div className="mt-5">
            <div className="flex items-baseline gap-3">
                <span
                    className={`text-[64px] font-semibold leading-none tracking-[-0.03em] tabular-nums sm:text-[72px] ${
                        tone === "pass" ? "" : "text-amber-700"
                    }`}
                >
                    {score.toFixed(1)}
                </span>
                <span className="text-xl font-medium text-[var(--muted)]">
                    / 10
                </span>
            </div>
            <p
                className={`mt-3 text-base font-medium tracking-[-0.01em] ${verdictColor}`}
            >
                {verdictLabel}.
            </p>
            <p className="mt-1 text-[11px] text-[var(--subtle)]">
                Sample data for feeder, DER density, and substation distance
            </p>
        </div>
    );
}

function ReadinessRow({
    eyebrow,
    pill,
    pillTone = "pass",
    children,
}: {
    eyebrow: string;
    pill?: string;
    pillTone?: "pass" | "warn";
    children: React.ReactNode;
}) {
    return (
        <section className="py-8 first:pt-4 last:pb-2">
            <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--subtle)]">
                    {eyebrow}
                </p>
                {pill && <ReadinessPill tone={pillTone}>{pill}</ReadinessPill>}
            </div>
            {children}
        </section>
    );
}

function ReadinessPill({
    tone,
    children,
}: {
    tone: "pass" | "warn";
    children: React.ReactNode;
}) {
    const cls =
        tone === "pass"
            ? "bg-emerald-50 text-emerald-800"
            : "bg-amber-50 text-amber-900";
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}
        >
            <CheckGlyph />
            {children}
        </span>
    );
}

function CheckGlyph() {
    return (
        <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M2 5.5L4 7.5L8 3" />
        </svg>
    );
}

/* ---------- 1. Net Metering cap ---------- */

function NetMeteringCapItem({ systemKw }: { systemKw: number }) {
    const cap = 12;
    const pct = Math.min(100, (systemKw / cap) * 100);
    const pass = systemKw <= cap;
    return (
        <ReadinessRow
            eyebrow="Net Metering cap"
            pill={pass ? undefined : "Over cap"}
            pillTone="warn"
        >
            <p className="mt-3 text-base">
                <span className="font-semibold tabular-nums">
                    {systemKw.toFixed(1)} kW
                </span>
                <span className="text-[var(--muted)]">
                    {" "}
                    of 12 kW residential limit
                </span>
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                        width: `${pct}%`,
                        background: pass ? C_PRIMARY : "#f59e0b",
                    }}
                />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-[var(--subtle)]">
                <span>0 kW</span>
                <span>12 kW</span>
            </div>
        </ReadinessRow>
    );
}

/* ---------- 2. Feeder hosting capacity ---------- */

function FeederCapacityItem() {
    const utilized = 0.68;
    const capacityMW = 2.5;
    const approvedMW = 1.7;
    const availableMW = 0.8;
    const ringColor =
        utilized < 0.6 ? C_PRIMARY : utilized < 0.85 ? "#f59e0b" : "#ef4444";
    const r = 32;
    const circumference = 2 * Math.PI * r;
    const filled = utilized * circumference;

    return (
        <ReadinessRow eyebrow="Feeder capacity">
            <div className="mt-4 flex items-center gap-6">
                <div className="relative h-24 w-24 shrink-0">
                    <svg
                        viewBox="0 0 80 80"
                        className="h-full w-full -rotate-90"
                    >
                        <circle
                            cx="40"
                            cy="40"
                            r={r}
                            fill="none"
                            stroke="var(--border)"
                            strokeWidth="7"
                        />
                        <circle
                            cx="40"
                            cy="40"
                            r={r}
                            fill="none"
                            stroke={ringColor}
                            strokeWidth="7"
                            strokeDasharray={`${filled} ${circumference}`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-semibold leading-none tabular-nums">
                            {Math.round(utilized * 100)}%
                        </span>
                        <span className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--subtle)]">
                            utilized
                        </span>
                    </div>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5 text-sm flex-1">
                    <FeederRow label="Approved" value={`${approvedMW} MW`} />
                    <FeederRow
                        label="Available"
                        value={`${availableMW} MW`}
                        emphasize
                    />
                    <FeederRow
                        label="Total capacity"
                        value={`${capacityMW} MW`}
                        muted
                    />
                </div>
            </div>
        </ReadinessRow>
    );
}

function FeederRow({
    label,
    value,
    emphasize,
    muted,
}: {
    label: string;
    value: string;
    emphasize?: boolean;
    muted?: boolean;
}) {
    return (
        <div className="flex items-baseline justify-between">
            <span
                className={
                    muted ? "text-[var(--subtle)]" : "text-[var(--muted)]"
                }
            >
                {label}
            </span>
            <span
                className={`tabular-nums ${
                    emphasize
                        ? "font-semibold"
                        : muted
                          ? "text-[var(--subtle)]"
                          : "font-medium"
                }`}
            >
                {value}
            </span>
        </div>
    );
}

/* ---------- 3. DER density ---------- */

const DOT_ROWS = 5;
const DOT_COLS = 8;
const HOUSE_CELL = "2,3";
// 14 deterministic positions, spread evenly, avoiding HOUSE_CELL.
const SYSTEM_CELLS = new Set([
    "0,1",
    "0,4",
    "0,6",
    "1,2",
    "1,5",
    "1,7",
    "2,0",
    "2,6",
    "3,2",
    "3,4",
    "3,7",
    "4,1",
    "4,3",
    "4,5",
]);

function DerDensityItem() {
    const cells: { key: string; isHouse: boolean; isSystem: boolean }[] = [];
    for (let r = 0; r < DOT_ROWS; r++) {
        for (let c = 0; c < DOT_COLS; c++) {
            const key = `${r},${c}`;
            cells.push({
                key,
                isHouse: key === HOUSE_CELL,
                isSystem: SYSTEM_CELLS.has(key),
            });
        }
    }
    return (
        <ReadinessRow eyebrow="DER density">
            <div className="mt-4 flex items-center gap-6 justify-between">
                <div
                    className="grid shrink-0"
                    style={{
                        gridTemplateColumns: `repeat(${DOT_COLS}, 1rem)`,
                        gridAutoRows: "1rem",
                        gap: "0.4rem",
                    }}
                >
                    {cells.map((cell) => (
                        <div
                            key={cell.key}
                            className="flex h-4 w-4 items-center justify-center"
                        >
                            {cell.isHouse ? (
                                <HouseGlyphMini color={C_PRIMARY} />
                            ) : cell.isSystem ? (
                                <span className="block h-1.5 w-1.5 rounded-full bg-[var(--border)]" />
                            ) : null}
                        </div>
                    ))}
                </div>
                <div className="min-w-0 flex-1 sm:max-w-[14rem]">
                    <div className="flex items-baseline gap-2 justify-end">
                        <span className="text-xl font-semibold tabular-nums">
                            14
                        </span>
                        <span className="text-sm text-[var(--muted)]">
                            systems on your feeder
                        </span>
                    </div>
                    <div className="mt-1 text-xs text-right text-[var(--muted)]">
                        ~5.6% saturation
                    </div>
                </div>
            </div>
        </ReadinessRow>
    );
}

function HouseGlyphMini({ color }: { color: string }) {
    return (
        <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill={color}
            aria-hidden
        >
            <path d="M5.5 0L0 4.4V11h3.5V7.7h4V11H11V4.4z" />
        </svg>
    );
}

/* ---------- 4. Distance to substation ---------- */

function DistanceItem() {
    const km = 1.8;
    return (
        <ReadinessRow eyebrow="Distance to substation">
            <div className="mt-5 flex items-start gap-3">
                <div className="flex flex-col items-center">
                    <SubstationGlyph />
                    <span className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--subtle)]">
                        Substation
                    </span>
                </div>
                <div className="relative mt-[18px] flex-1">
                    <div className="border-t border-dashed border-[var(--accent)]" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--card)] px-2 text-sm font-semibold tabular-nums">
                        {km} km
                    </span>
                </div>
                <div className="flex flex-col items-center">
                    <HouseGlyphBox />
                    <span className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--subtle)]">
                        Your home
                    </span>
                </div>
            </div>
        </ReadinessRow>
    );
}

function SubstationGlyph() {
    return (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)]">
            <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill={C_PRIMARY}
                aria-hidden
            >
                <path d="M8.5 0L2 8h3.5L4.5 14 11 5.5H7.5z" />
            </svg>
        </div>
    );
}

function HouseGlyphBox() {
    return (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)]">
            <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill={C_PRIMARY}
                aria-hidden
            >
                <path d="M7 0L0 5.5V14h4.5V9.5h5V14H14V5.5z" />
            </svg>
        </div>
    );
}

/* ----------------------------- Bottom CTA ------------------------------- */

function BottomCTA({ derived }: { derived: DerivedResults }) {
    return (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-white/95 backdrop-blur lg:left-[38vw]">
            <div className="mx-auto flex w-full items-center justify-between gap-4 px-5 py-3 sm:px-8">
                <div className="hidden text-xs text-[var(--subtle)] sm:block">
                    ${Math.round(derived.annualSavingsCAD).toLocaleString()}/yr
                    · pays off year {derived.breakevenYear ?? "—"}
                </div>
                <Link
                    href="/installers"
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--background)] transition hover:opacity-90"
                >
                    Choose installer
                    <span
                        aria-hidden
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-black"
                    >
                        <svg
                            viewBox="0 0 16 16"
                            width="11"
                            height="11"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M3 8h10M9 4l4 4-4 4" />
                        </svg>
                    </span>
                </Link>
            </div>
        </div>
    );
}

/* ----------------------------- shared bits ------------------------------ */

function Card({ children }: { children: React.ReactNode }) {
    return (
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7 mb-4">
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
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(Math.round(target * eased));
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, durationMs]);
    return value;
}
