// src/lib/risk.ts
import { http } from './api';
import type { Features, BorrowerProfile, LoanConfig, RiskScore } from './models';

export async function scoreRisk(
  cfg: LoanConfig,
  borrower: BorrowerProfile,
  features: Features
): Promise<RiskScore> {
  // UI stores APR as percent (e.g., 6.5). Convert to decimal (0.065) for the API.
  const aprDecimal = cfg.apr >= 1 ? cfg.apr / 100 : cfg.apr;

  const payload = {
    ltv: features.ltv,
    dti: features.dti,
    apr: aprDecimal,
    termMonths: cfg.termMonths,
    income: borrower.monthlyIncome,
  };

  const res = await http<{ pd: number; confidence: number; modelVersion?: string }>(
    '/api/score',
    { method: 'POST', body: JSON.stringify(payload) }
  );

  return {
    pd: res.pd,
    confidence: res.confidence,
    modelVersion: res.modelVersion ?? 'dummy-v1',
  };
}
