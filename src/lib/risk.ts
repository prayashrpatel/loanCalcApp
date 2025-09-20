import type { BorrowerProfile, LoanConfig, RiskScore, Features } from './models';
import { http } from './api';

const TIMEOUT_MS = 12_000;

export async function scoreRisk(
  cfg: LoanConfig,
  borrower: BorrowerProfile,
  features: Features
): Promise<RiskScore> {
  const aprDecimal = cfg.apr > 1 ? cfg.apr / 100 : cfg.apr;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const payload = {
    ltv: features.ltv,
    dti: features.dti,
    apr: aprDecimal,
    termMonths: cfg.termMonths,
    income: borrower.monthlyIncome,
  };

  try {
    const result = await http<RiskScore>('/api/score', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    return result;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Risk API timed out. Please try again.');
    }
    const msg = typeof err?.message === 'string' ? err.message : String(err);
    throw new Error(`Risk API failed: ${msg}`);
  } finally {
    clearTimeout(t);
  }
}
