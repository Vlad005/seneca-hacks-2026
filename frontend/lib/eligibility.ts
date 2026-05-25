import type { RebateProgram } from "@/data/rebate-programs";

export type PropertyType =
  | "detached"
  | "semi"
  | "row"
  | "townhome"
  | "mobile_permanent"
  | "condo"
  | "other";

export type IncomeBracket = "under_80k" | "over_80k" | "undisclosed";

export type OwnershipStructure = "personal" | "corporation";

export interface EligibilityAnswers {
  isOwner: boolean;
  propertyType: PropertyType;
  incomeBracket: IncomeBracket;
  ownershipStructure: OwnershipStructure;
  /** Derived from the bill's postal code. */
  postalCode: string | null;
  province: "ON" | "other";
  isCornwallElectric: boolean;
  inToronto: boolean;
}

export type EligibilityResult =
  | "eligible"
  | "not-eligible"
  | "check-directly"
  | "closed";

export interface EligibilityVerdict {
  result: EligibilityResult;
  reason?: string;
}

/* ---------- postal-code helpers ---------- */

const ONTARIO_PREFIXES = new Set(["K", "L", "M", "N", "P"]);

export function provinceFromPostal(
  postal: string | null | undefined,
): "ON" | "other" {
  if (!postal) return "other";
  const first = postal.trim().toUpperCase().charAt(0);
  return ONTARIO_PREFIXES.has(first) ? "ON" : "other";
}

/** Cornwall Electric service area FSAs: K6H, K6J, K6K. */
export function isCornwallFromPostal(
  postal: string | null | undefined,
): boolean {
  if (!postal) return false;
  return /^K6[HJK]/i.test(postal.trim());
}

/** Toronto FSAs all start with M. */
export function isTorontoPostal(
  postal: string | null | undefined,
): boolean {
  if (!postal) return false;
  return postal.trim().toUpperCase().startsWith("M");
}

/* ---------- per-program rules ---------- */

const OWNERSHIP_REASON = "Program requires property ownership.";
const ONTARIO_GRID_REASON = "Requires connection to the Ontario electricity grid.";
const CORNWALL_REASON = "Cornwall Electric is on the Hydro-Québec grid.";

function resolveNetMetering(a: EligibilityAnswers): EligibilityVerdict {
  if (a.province !== "ON") {
    return { result: "not-eligible", reason: ONTARIO_GRID_REASON };
  }
  if (a.isCornwallElectric) {
    return { result: "not-eligible", reason: CORNWALL_REASON };
  }
  if (a.propertyType === "other") {
    return {
      result: "check-directly",
      reason: "Net metering applies to most homes — confirm with your LDC for non-standard properties.",
    };
  }
  return { result: "eligible" };
}

function resolveHRS(a: EligibilityAnswers): EligibilityVerdict {
  if (a.province !== "ON") {
    return { result: "not-eligible", reason: ONTARIO_GRID_REASON };
  }
  if (a.isCornwallElectric) {
    return { result: "not-eligible", reason: CORNWALL_REASON };
  }
  if (a.propertyType === "condo" || a.propertyType === "other") {
    return {
      result: "not-eligible",
      reason: "Requires detached, semi, row, townhome, or mobile home on a permanent foundation.",
    };
  }
  return { result: "eligible" };
}

function resolveCGHAP(a: EligibilityAnswers): EligibilityVerdict {
  if (a.incomeBracket === "over_80k") {
    return {
      result: "not-eligible",
      reason: "Income-tested program for lower- and median-income households.",
    };
  }
  if (a.incomeBracket === "undisclosed") {
    return {
      result: "check-directly",
      reason: "Income-tested — confirm your eligibility with NRCan.",
    };
  }
  // under_80k: still check_directly because province-by-province rollout is incomplete.
  return {
    result: "check-directly",
    reason: "Rollout is province-by-province — confirm Ontario coverage with NRCan.",
  };
}

function resolveHELP(a: EligibilityAnswers): EligibilityVerdict {
  if (!a.inToronto) {
    return {
      result: "not-eligible",
      reason: "Toronto only — Peel doesn't currently offer a direct equivalent.",
    };
  }
  if (a.propertyType === "condo" || a.propertyType === "other") {
    return {
      result: "not-eligible",
      reason: "Requires detached, semi, row, duplex, triplex, or low-rise up to 3 storeys / 6 units.",
    };
  }
  return { result: "eligible" };
}

function resolvePeakPerks(a: EligibilityAnswers): EligibilityVerdict {
  if (a.province !== "ON") {
    return { result: "not-eligible", reason: ONTARIO_GRID_REASON };
  }
  if (a.isCornwallElectric) {
    return { result: "not-eligible", reason: CORNWALL_REASON };
  }
  return { result: "eligible" };
}

function resolveITC(a: EligibilityAnswers): EligibilityVerdict {
  if (a.ownershipStructure === "personal") {
    return {
      result: "not-eligible",
      reason: "Available only to taxable Canadian corporations and REITs — not individual homeowners.",
    };
  }
  return {
    result: "check-directly",
    reason: "Talk to your accountant — depends on corporate structure and property use.",
  };
}

/* ---------- main resolver ---------- */

export function resolveEligibility(
  program: RebateProgram,
  answers: EligibilityAnswers,
): EligibilityVerdict {
  // Short-circuit: not an owner = nothing on this page applies.
  if (!answers.isOwner) {
    return { result: "not-eligible", reason: OWNERSHIP_REASON };
  }

  switch (program.id) {
    case "net-metering":
      return resolveNetMetering(answers);
    case "hrs":
      return resolveHRS(answers);
    case "cghap":
      return resolveCGHAP(answers);
    case "help":
      return resolveHELP(answers);
    case "battery-storage":
      return resolvePeakPerks(answers);
    case "clean-tech-itc":
      return resolveITC(answers);
    default:
      return { result: "eligible" };
  }
}

/** Helper for the questionnaire screen — builds the derived part of EligibilityAnswers. */
export function deriveAddressAnswers(postalCode: string | null) {
  return {
    postalCode,
    province: provinceFromPostal(postalCode),
    isCornwallElectric: isCornwallFromPostal(postalCode),
    inToronto: isTorontoPostal(postalCode),
  };
}
