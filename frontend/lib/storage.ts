import type { ExtractedBill, UsageProfile } from "./types";

const BILL_KEY = "solarfit:bill";
const USAGE_KEY = "solarfit:usage";

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

export function clearAll(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(BILL_KEY);
  sessionStorage.removeItem(USAGE_KEY);
}
