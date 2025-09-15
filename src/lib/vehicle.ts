import { http } from './api';

export type VinInfo = {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  msrp?: number;
};

export async function decodeVin(vin: string): Promise<VinInfo> {
  return http(`/api/vin?vin=${encodeURIComponent(vin)}`);
}
