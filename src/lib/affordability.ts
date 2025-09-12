import type { BorrowerProfile, Features, LoanConfig } from './models';
import { computeSalesTax, computeFinancedAmount, computePayment } from './loan';

// Compute LTV, DTI, etc. Uses your existing loan math.
export function computeFeatures(cfg: LoanConfig, borrower: BorrowerProfile): Features {
  const tax = computeSalesTax(cfg);
  const financedAmount = computeFinancedAmount(cfg, tax);
  const payment = computePayment(cfg, financedAmount);

  const vehiclePrice = Math.max(cfg.price, 1); // avoid /0
  const ltv = financedAmount / vehiclePrice;

  const monthlyDebtLoad = borrower.otherDebt + borrower.housingCost + payment;
  const denom = Math.max(borrower.monthlyIncome, 1);
  const dti = monthlyDebtLoad / denom;

  return { ltv, dti, payment, financedAmount };
}

// convenience if you want “can afford” flag in UI
export function isAffordable(features: Features, thresholds = { maxDTI: 0.45 }) {
  return features.dti <= thresholds.maxDTI;
}
