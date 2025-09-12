import type { Features, Lender, LoanConfig, Offer, RiskScore } from './models';
import { computeSalesTax, computeFinancedAmount, computePayment, computeSummary } from './loan';

// Example lender catalog you can tweak or extend
export const LENDERS: Lender[] = [
  { id: 'L1', name: 'Acme Bank', baseApr: 6.9, maxTerm: 72, maxLtv: 1.3, maxDti: 0.5,  riskAprBpsPerPd: 120 },
  { id: 'L2', name: 'Metro Credit', baseApr: 5.9, maxTerm: 60, maxLtv: 1.2, maxDti: 0.45, riskAprBpsPerPd: 160 },
  { id: 'L3', name: 'Sunrise Financial', baseApr: 7.5, maxTerm: 84, maxLtv: 1.35, maxDti: 0.55, riskAprBpsPerPd: 90  },
];

// Produce lender-specific offers
export function getLenderOffers(cfg: LoanConfig, features: Features, risk: RiskScore, lenders: Lender[] = LENDERS): Offer[] {
  const tax = computeSalesTax(cfg);
  const financedAmount = computeFinancedAmount(cfg, tax);

  const offers: Offer[] = [];

  for (const lender of lenders) {
    if (cfg.termMonths > lender.maxTerm) continue;
    if (lender.maxLtv && features.ltv > lender.maxLtv) continue;
    if (lender.maxDti && features.dti > lender.maxDti) continue;

    const bpsPerPd = lender.riskAprBpsPerPd ?? 120;
    const upliftPct = (bpsPerPd * (risk.pd * 10)) / 100;
    const apr = round2(lender.baseApr + upliftPct);

    const pricedCfg: LoanConfig = { ...cfg, apr };
    const pmt = computePayment(pricedCfg, financedAmount);
    const summary = computeSummary(pricedCfg);

    const riskAdjustedApr = round2(apr * (1 + risk.pd));

    offers.push({
      lenderId: lender.id,
      lenderName: lender.name,
      termMonths: cfg.termMonths,
      apr,
      monthlyPayment: pmt,
      totalCost: summary.totalCost,
      riskAdjustedApr,
    });
  }

  return offers.sort((a, b) => a.riskAdjustedApr - b.riskAdjustedApr);
}

const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;
