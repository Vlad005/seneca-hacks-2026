"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AZIMUTH_OPTIONS,
  PANEL_COUNT_MAX,
  PANEL_COUNT_MIN,
  PANEL_PRESETS,
  TILT_MAX,
  TILT_MIN,
  estimateUpfrontCost,
  presetById,
  type Customization,
  type PanelPresetId,
} from "@/lib/customization";
import {
  OBSTRUCTION_FACTOR,
  PITCH_MULTIPLIER,
  SOUTH_HALF_FRACTION,
  SPACING_BUFFER,
} from "@/lib/roof-geometry";

interface Props {
  open: boolean;
  initial: Customization;
  footprintSqm: number | null;
  onClose: () => void;
  onApply: (next: Customization) => void;
}

export function CustomizeModal({
  open,
  initial,
  footprintSqm,
  onClose,
  onApply,
}: Props) {
  const [draft, setDraft] = useState<Customization>(initial);

  // Re-seed draft whenever the modal opens with fresh initial values.
  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const preset = presetById(draft.panelPresetId);
  const systemKw = (draft.panelCount * preset.watts) / 1000;
  const upfrontCAD = estimateUpfrontCost(draft);

  // Real per-roof, per-preset maximum: how many of THIS panel actually fit
  // on the usable portion of THIS roof. Recomputes whenever preset changes.
  const maxPanels = useMemo(() => {
    const usableSqm = footprintSqm
      ? footprintSqm * PITCH_MULTIPLIER * SOUTH_HALF_FRACTION * OBSTRUCTION_FACTOR
      : null;
    if (usableSqm === null) return PANEL_COUNT_MAX;
    const slot = preset.area_sqm * SPACING_BUFFER;
    const fits = Math.floor(usableSqm / slot);
    return Math.max(PANEL_COUNT_MIN, Math.min(PANEL_COUNT_MAX, fits));
  }, [footprintSqm, preset.area_sqm]);

  // Clamp count down if the user previously had more panels than the
  // newly-selected (bigger) preset can fit.
  useEffect(() => {
    if (draft.panelCount > maxPanels) {
      setDraft((d) => ({ ...d, panelCount: maxPanels }));
    }
  }, [maxPanels, draft.panelCount]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--subtle)]">
            Customize
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.01em]">
            Your system, your call
          </h2>
        </header>

        <div className="mt-6 space-y-5">
          <Field label="Panel">
            <select
              value={draft.panelPresetId}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  panelPresetId: e.target.value as PanelPresetId,
                }))
              }
              className={inputClasses}
            >
              {PANEL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} {p.model} — {p.tier}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-[var(--subtle)]">
              {preset.efficiency * 100}% efficient · {preset.area_sqm} m² ·{" "}
              ${preset.cost_per_w_cad.toFixed(2)}/W installed
            </p>
          </Field>

          <Field
            label={`Panels — ${draft.panelCount}`}
            sublabel={
              footprintSqm
                ? `Up to ${maxPanels} fit on your roof`
                : `${PANEL_COUNT_MIN} – ${maxPanels}`
            }
          >
            <input
              type="range"
              min={PANEL_COUNT_MIN}
              max={maxPanels}
              value={Math.min(draft.panelCount, maxPanels)}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  panelCount: clampInt(
                    Number(e.target.value),
                    PANEL_COUNT_MIN,
                    maxPanels,
                  ),
                }))
              }
              className="custom-range w-full"
              style={{
                background: rangeBackground(
                  Math.min(draft.panelCount, maxPanels),
                  PANEL_COUNT_MIN,
                  maxPanels,
                ),
              }}
            />
            <p className="mt-2 text-xs text-[var(--subtle)]">
              {systemKw.toFixed(1)} kW system. Most Ontario LDCs auto-approve
              under 12 kW.
            </p>
          </Field>

          <Field label="Roof faces">
            <select
              value={draft.azimuthDeg}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  azimuthDeg: Number(e.target.value),
                }))
              }
              className={inputClasses}
            >
              {AZIMUTH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={`Roof tilt — ${draft.tiltDeg}°`}
            sublabel={`${TILT_MIN}° (low slope) – ${TILT_MAX}° (steep)`}
          >
            <input
              type="range"
              min={TILT_MIN}
              max={TILT_MAX}
              value={draft.tiltDeg}
              onChange={(e) =>
                setDraft((d) => ({ ...d, tiltDeg: Number(e.target.value) }))
              }
              className="custom-range w-full"
              style={{
                background: rangeBackground(
                  draft.tiltDeg,
                  TILT_MIN,
                  TILT_MAX,
                ),
              }}
            />
          </Field>
        </div>

        {/* Cost preview */}
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-[0.12em] text-[var(--subtle)]">
              Estimated upfront
            </span>
            <span className="text-2xl font-semibold tabular-nums">
              ${Math.round(upfrontCAD).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Includes labour, racking, inverter, and permits. Final price set by
            your installer at site visit.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(draft)}
            className="rounded-full bg-[var(--ink)] px-5 py-2 text-sm font-medium text-[var(--background)] hover:opacity-90"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  sublabel,
  children,
}: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        {sublabel && (
          <span className="text-[11px] text-[var(--subtle)]">{sublabel}</span>
        )}
      </div>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClasses =
  "w-full rounded-xl border border-[var(--border)] bg-transparent px-3.5 py-2 text-[15px] outline-none transition focus:border-[var(--ink)]";

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** Inline gradient that fills a range input emerald up to `value` and leaves
 *  the rest light gray — works in Chrome, Safari, and Firefox without
 *  separate progress-element styling. */
function rangeBackground(value: number, min: number, max: number): string {
  const pct = ((value - min) / (max - min)) * 100;
  return `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`;
}
