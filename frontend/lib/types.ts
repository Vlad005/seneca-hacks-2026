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

/** Shape of the /pv-analysis backend response. Mirrors backend Pydantic. */
export interface PvAggregate {
  annual_kwh: number;
  monthly_kwh: number[]; // 12
  daily_kwh: number[]; // 365
  typical_day_hourly_kwh: number[]; // 24
}

export interface PvAnalysis {
  system_kw: number;
  panel_count: number;
  usable_area_sqm: number;
  tilt_deg: number;
  azimuth_deg: number;
  theoretical: PvAggregate;
  actual: PvAggregate;
  avg_realization_pct: number;
  monthly_generation_kwh: number[];
  typical_day_hourly_kwh: number[];
  annual_kwh: number;
}

export interface CloudHistory {
  lat: number;
  lon: number;
  years_averaged: number;
  start: string;
  end: string;
  daily_cloud_cover_pct: (number | null)[]; // 365
  annual_avg_pct: number;
}

export interface GeocodedAddress {
  lat: number;
  lon: number;
  query: string;
}
