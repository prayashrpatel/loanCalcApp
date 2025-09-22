// src/lib/vehicle.ts

export type VinInfo = {
  vin: string;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  msrp?: number | null;
  bodyClass?: string | null;
  doors?: number | null;
  driveType?: string | null;
  transmission?: string | null;
  fuelType?: string | null;
  engineCylinders?: number | null;
  displacementL?: number | null;
  engineHP?: number | null;
  manufacturer?: string | null;
  plantCountry?: string | null;
  title?: string | null;
  summary?: string | null;              // short optional text
  source?: 'nhtsa' | 'custom' | string | null;
  ai?: {
    filled: string[];                   // e.g., ['msrp','transmission']
    confidence: number;                 // 0..1
    notes?: string | null;
    disclaimer?: string | null;
  } | null;
};

const vinCache = new Map<string, VinInfo>();

function isValidVin(v: string) {
  // 17 chars, excludes I, O, Q
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
}

export async function decodeVin(vin: string): Promise<VinInfo> {
  const clean = (vin || "").trim().toUpperCase();
  if (!isValidVin(clean)) {
    throw new Error("VIN must be 17 characters (no I/O/Q).");
  }

  // in-session cache
  const cached = vinCache.get(clean);
  if (cached) return cached;

  // 10s timeout guard
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);

  const res = await fetch(`/api/vin?vin=${encodeURIComponent(clean)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: ctrl.signal,
  }).catch((e) => {
    clearTimeout(t);
    throw new Error(e?.message || "Network error");
  });
  clearTimeout(t);

  let data: any = null;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    // ignore JSON parse error; handled below
  }

  if (!res.ok) {
    const msg = data?.error || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  const out: VinInfo | undefined = data?.data;
  if (!out) throw new Error("Malformed VIN response");

  vinCache.set(clean, out);
  return out;
}
