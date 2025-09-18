// src/lib/risk.ts
import type { BorrowerProfile, LoanConfig, RiskScore } from './models';
import type { Features } from './models';

/**
 * Calls your API (/api/score) to get a PD/Confidence.
 * - cfg.apr in your UI is a percent (e.g. 6.5) so convert to 0.065 for the API
 */
export async function scoreRisk(
  cfg: LoanConfig,
  borrower: BorrowerProfile,
  features: Features
): Promise<RiskScore> {
  const aprDecimal = cfg.apr > 1 ? cfg.apr / 100 : cfg.apr;

  const res = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ltv: features.ltv,
      dti: features.dti,
      apr: aprDecimal,
      termMonths: cfg.termMonths,
      income: borrower.monthlyIncome,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Risk API failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<RiskScore>;
}
