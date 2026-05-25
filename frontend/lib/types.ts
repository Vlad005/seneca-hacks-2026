export interface ExtractedBill {
  service_address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  total_kwh_this_period: number | null;
  monthly_history_kwh: number[] | null;
  on_peak_kwh: number | null;
  mid_peak_kwh: number | null;
  off_peak_kwh: number | null;
}

import type {
  IncomeBracket,
  OwnershipStructure,
  PropertyType,
} from "./eligibility";

export interface RebateSelections {
  isOwner: boolean;
  propertyType: PropertyType;
  incomeBracket: IncomeBracket;
  ownershipStructure: OwnershipStructure;
  /** "hrs" or "net-metering". */
  meterChoice: "hrs" | "net-metering";
  /** IDs of stackable programs the user wants included. */
  includedExtras: string[];
}

export interface UsageProfile {
  /** 12-month kWh, oldest to newest (Jan to Dec ordering not assumed). */
  monthly_kwh: number[];
  /** Daily split ratios, must sum to 1. */
  daily_split: {
    night: number;
    morning: number;
    day: number;
    evening: number;
  };
}
