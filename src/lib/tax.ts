import type { TaxRule } from './models';

export interface TaxPreset { ratePct: number; rule: TaxRule; }

const PRESETS: Record<string, TaxPreset> = {
  CA: { ratePct: 8.75, rule: 'price_minus_tradein' },
  TX: { ratePct: 6.25, rule: 'price_full' },
  FL: { ratePct: 6.00, rule: 'price_minus_tradein' },
  NY: { ratePct: 8.875, rule: 'price_minus_tradein' },
  WA: { ratePct: 6.50, rule: 'price_minus_tradein' },
};

export function getTaxPreset(state?: string): TaxPreset | null {
  if (!state) return null;
  return PRESETS[state.trim().toUpperCase()] ?? null;
}
