import type { ExtractedBill } from "./types";

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
