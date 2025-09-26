// src/lib/vehicle.ts
export type VinInfo = {
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  body: string | null;
  doors: number | null;

  drive: string | null;
  transmission: string | null;
  fuel: string | null;
  cylinders: number | null;
  displacement: number | null; // (L)
  engineHp: number | null;

  manufacturer: string | null;
  plantCountry: string | null;

  msrp: number | null;
  summary: string | null;

  title?: string | null;
};

type BackendVinPayload = VinInfo | { data: any; meta?: any };

export const show = (v: unknown) => (v == null ? "—" : String(v));

/** Unwrap {data, meta} or accept flat; map backend keys -> UI keys */
export function normalizeVinPayload(raw: BackendVinPayload): { vehicle: VinInfo; meta?: any } {
  const meta = (raw as any).meta;
  const v = (raw as any).data ?? raw;

  const vehicle: VinInfo = {
    vin: v.vin ?? null,
    year: v.year ?? null,
    make: v.make ?? null,
    model: v.model ?? null,
    trim: v.trim ?? null,
    body: v.body ?? null,
    doors: v.doors ?? null,

    // map possible backend names to UI names
    drive: v.drive ?? v.driveType ?? null,
    transmission: v.transmission ?? null,
    fuel: v.fuel ?? null,
    cylinders: v.cylinders ?? null,
    displacement: v.displacement ?? v.displacementL ?? null,
    engineHp: v.engineHp ?? v.engineHP ?? null,

    manufacturer: v.manufacturer ?? null,
    plantCountry: v.plantCountry ?? null,

    msrp: v.msrp ?? null,
    summary: v.summary ?? null,

    title: v.title ?? null,
  };

  return { vehicle, meta };
}

/** Call backend and normalize for UI */
export async function decodeVin(vin: string): Promise<{ vehicle: VinInfo; meta?: any }> {
  const res = await fetch(`/api/vin?vin=${encodeURIComponent(vin)}`);
  if (!res.ok) {
    let details = "";
    try { details = await res.text(); } catch {}
    throw new Error(`VIN API ${res.status} ${res.statusText}${details ? ` — ${details}` : ""}`);
  }
  const json = (await res.json()) as BackendVinPayload;
  return normalizeVinPayload(json);
}
