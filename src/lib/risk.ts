// src/lib/risk.ts
import { http } from './api';
import type { BorrowerProfile, LoanConfig, RiskScore, Features } from './models';

export async function scoreRisk(
  cfg: LoanConfig,
  borrower: BorrowerProfile,
  features: Pick<Features, 'ltv' | 'dti'>
): Promise<RiskScore> {
  const payload = {
    ltv: features.ltv,
    dti: features.dti,
    apr: cfg.apr / 100,           // send decimal to API (e.g. 0.065)
    termMonths: cfg.termMonths,
    income: borrower.monthlyIncome,
  };

  const res = await http<RiskScore>('/api/score', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  // ensure modelVersion present
  return { ...res, modelVersion: res.modelVersion ?? 'dummy-v1' };
}
