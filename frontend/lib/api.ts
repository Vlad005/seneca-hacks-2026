import type { CloudHistory, ExtractedBill, PvAnalysis } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function extractBill(file: File): Promise<ExtractedBill> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/extract-bill`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      /* response wasn't JSON */
    }
    throw new ApiError(res.status, detail);
  }

  return (await res.json()) as ExtractedBill;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data?.detail ?? detail;
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data?.detail ?? detail;
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

export interface RoofOverride {
  tilt_deg?: number;
  azimuth_deg?: number;
  panel_count?: number;
  panel_area_sqm?: number;
  panel_efficiency_stc?: number;
}

export function fetchPvAnalysis(
  lat: number,
  lon: number,
  roof?: RoofOverride | null,
  tz = "America/Toronto",
): Promise<PvAnalysis> {
  const body: Record<string, unknown> = { lat, lon, tz };
  if (roof) body.roof = roof;
  return postJson<PvAnalysis>("/pv-analysis", body);
}

export function fetchCloudHistory(
  lat: number,
  lon: number,
  years = 5,
  tz = "America/Toronto",
): Promise<CloudHistory> {
  const qs = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    years: String(years),
    tz,
  });
  return getJson<CloudHistory>(`/cloud-history?${qs.toString()}`);
}
