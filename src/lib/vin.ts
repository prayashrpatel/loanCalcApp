import { http } from './api';

export type VinData = {
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  bodyClass: string | null;
  driveType: string | null;
  fuelType: string | null;
  engine: string | null;
};

export type VinAI = {
  summary?: string;
  inferred?: Array<{ field: string; value: string; confidence: number; reason?: string }>;
  error?: string;
  detail?: string;
} | null;

export type VinResponse =
  | { ok: true; data: VinData; ai: VinAI; raw?: any }
  | { ok?: false; error: string };

export async function decodeVin(vin: string) {
  return http<VinResponse>(`/api/vin?vin=${encodeURIComponent(vin)}`);
}
