import type { ExtractedBill, RebateSelections, UsageProfile } from "./types";

const BILL_KEY = "solarfit:bill";
const USAGE_KEY = "solarfit:usage";
const REBATES_KEY = "solarfit:rebates";

export function saveBill(bill: ExtractedBill): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(BILL_KEY, JSON.stringify(bill));
}

export function loadBill(): ExtractedBill | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(BILL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExtractedBill;
  } catch {
    return null;
  }
}

export function saveUsage(usage: UsageProfile): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

export function loadUsage(): UsageProfile | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(USAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UsageProfile;
  } catch {
    return null;
  }
}

export const REBATE_DEFAULTS: RebateSelections = {
  isOwner: true,
  propertyType: "detached",
  incomeBracket: "over_80k",
  ownershipStructure: "personal",
  meterChoice: "net-metering",
  // CGHAP is income-tested (advisory), battery storage requires an add-on,
  // and ITC is corporate-only. Nothing meaningful to pre-check.
  includedExtras: [],
};

/** Returns saved selections merged onto defaults, so missing fields don't break a step. */
export function getRebateDraft(): RebateSelections {
  return loadRebates() ?? REBATE_DEFAULTS;
}

export function saveRebates(rebates: RebateSelections): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(REBATES_KEY, JSON.stringify(rebates));
}

export function loadRebates(): RebateSelections | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(REBATES_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RebateSelections;
  } catch {
    return null;
  }
}

export function clearAll(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(BILL_KEY);
  sessionStorage.removeItem(USAGE_KEY);
  sessionStorage.removeItem(REBATES_KEY);
}
