import type {
  CloudHistory,
  ExtractedBill,
  GeocodedAddress,
  PvAnalysis,
  RebateSelections,
  UsageProfile,
} from "./types";
import type { Customization } from "./customization";

const BILL_KEY = "helios:bill";
const USAGE_KEY = "helios:usage";
const REBATES_KEY = "helios:rebates";
const ANALYSIS_KEY = "helios:analysis";
const CLOUD_KEY = "helios:cloud";
const GEO_KEY = "helios:geo";
const CUSTOMIZATION_KEY = "helios:customization";

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

/* ---------- analysis (pv + cloud + geo) ---------- */

export function saveAnalysis(data: PvAnalysis): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(ANALYSIS_KEY, JSON.stringify(data));
}

export function loadAnalysis(): PvAnalysis | null {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(ANALYSIS_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as PvAnalysis;
    } catch {
        return null;
    }
}

export function saveCloud(data: CloudHistory): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(CLOUD_KEY, JSON.stringify(data));
}

export function loadCloud(): CloudHistory | null {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(CLOUD_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as CloudHistory;
    } catch {
        return null;
    }
}

export function saveGeo(data: GeocodedAddress): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(GEO_KEY, JSON.stringify(data));
}

export function loadGeo(): GeocodedAddress | null {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(GEO_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as GeocodedAddress;
    } catch {
        return null;
    }
}

export function clearAll(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(BILL_KEY);
    sessionStorage.removeItem(USAGE_KEY);
    sessionStorage.removeItem(REBATES_KEY);
    sessionStorage.removeItem(ANALYSIS_KEY);
    sessionStorage.removeItem(CLOUD_KEY);
    sessionStorage.removeItem(GEO_KEY);
}

/**
 * Clear everything derived from the current bill — geocoded coords, solar
 * analysis, cloud history, usage edits, rebate answers. Call this from /upload
 * right before saving a NEW bill so a different home doesn't inherit the old
 * roof's lat/lon cache (which is why a second upload was still zooming to the
 * first address).
 */
export function clearDerivedFromBill(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(GEO_KEY);
    sessionStorage.removeItem(ANALYSIS_KEY);
    sessionStorage.removeItem(CLOUD_KEY);
    sessionStorage.removeItem(USAGE_KEY);
    sessionStorage.removeItem(REBATES_KEY);
    sessionStorage.removeItem(CUSTOMIZATION_KEY);
}

export function saveCustomization(c: Customization): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(CUSTOMIZATION_KEY, JSON.stringify(c));
}

export function loadCustomization(): Customization | null {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(CUSTOMIZATION_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as Customization;
    } catch {
        return null;
    }
}
