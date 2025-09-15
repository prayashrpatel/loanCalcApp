// src/lib/risk.ts
import { http } from './api';
import type { BorrowerProfile, LoanConfig } from './models';

export type RiskScore = { pd: number; confidence: number; modelVersion?: string };

export async function scoreRisk(
  cfg: LoanConfig,
  borrower: BorrowerProfile,
  features: { ltv: number; dti: number }
): Promise<RiskScore> {
  const payload = {
    ltv: features.ltv,
    dti: features.dti,
    apr: cfg.apr,
    termMonths: cfg.termMonths,
    income: borrower.monthlyIncome,
  };

  return http<RiskScore>('/api/score', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
