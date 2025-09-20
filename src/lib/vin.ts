// Simple client for your backend VIN endpoint
export type VinInfo = {
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyClass?: string;
  fuelType?: string;
  engineCylinders?: number;
  displacementL?: number;
  engineHP?: number;
  title?: string;   // e.g. "2003 HONDA Accord EX-V6"
  msrp?: number;    // optional if your backend enriches it
  summary?: string; // optional AI blurb
};

export async function decodeVin(vin: string): Promise<VinInfo> {
  const res = await fetch(`/api/vin?vin=${encodeURIComponent(vin)}`);
  const json = await res.json();
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `VIN decode failed (${res.status})`);
  }
  return json.data as VinInfo;
}
