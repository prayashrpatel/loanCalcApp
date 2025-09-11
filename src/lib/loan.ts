export type TaxRule = 'price_minus_tradein' | 'price_full';

export interface LoanConfig {
  price: number;
  down: number;
  tradeIn: number;
  tradeInPayoff: number;
  apr: number;            // percent, e.g., 6.5
  termMonths: number;
  taxRate: number;        // percent
  fees: { upfront: number; financed: number };
  extras: { upfront: number; financed: number };
  taxRule: TaxRule;
}

export interface AmortRow {
  period: number;         // 1-based month
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface Summary {
  payment: number;
  totalInterest: number;
  totalCost: number;      // down + upfronts + all payments over life
  financedAmount: number; // PV actually financed
  salesTax: number;
}

const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

export function computeSalesTax(cfg: LoanConfig): number {
  const taxableBase =
    cfg.taxRule === 'price_minus_tradein'
      ? Math.max(cfg.price - cfg.tradeIn, 0)
      : cfg.price;
  return round2((taxableBase * cfg.taxRate) / 100);
}

export function computeFinancedAmount(cfg: LoanConfig, salesTax?: number): number {
  const tax = salesTax ?? computeSalesTax(cfg);
  const principal0 =
    cfg.price
    - cfg.down
    - cfg.tradeIn
    + tax
    + cfg.fees.financed
    + cfg.extras.financed
    - cfg.tradeInPayoff;

  return Math.max(round2(principal0), 0);
}

export function computePayment(cfg: LoanConfig, financedAmount?: number): number {
  const PV = financedAmount ?? computeFinancedAmount(cfg);
  const r = cfg.apr / 100 / 12;
  const n = cfg.termMonths;
  if (n <= 0) return 0;
  if (r === 0) return round2(PV / n);
  const pmt = (r * PV) / (1 - Math.pow(1 + r, -n));
  return round2(pmt);
}

export function buildAmortization(cfg: LoanConfig): AmortRow[] {
  const tax = computeSalesTax(cfg);
  const PV = computeFinancedAmount(cfg, tax);
  const pmt = computePayment(cfg, PV);
  const r = cfg.apr / 100 / 12;

  const rows: AmortRow[] = [];
  let balance = PV;

  for (let i = 1; i <= cfg.termMonths; i++) {
    const interest = round2(balance * r);
    let principal = round2(pmt - interest);
    if (i === cfg.termMonths) {
      // Final period: wipe out any rounding drift
      principal = round2(balance);
    }
    const payment = round2(principal + interest);
    balance = round2(balance - principal);
    rows.push({ period: i, payment, interest, principal, balance });
  }
  return rows;
}

export function computeSummary(cfg: LoanConfig): Summary {
  const tax = computeSalesTax(cfg);
  const PV = computeFinancedAmount(cfg, tax);
  const pmt = computePayment(cfg, PV);
  const rows = buildAmortization(cfg);
  const totalInterest = round2(rows.reduce((s, r) => s + r.interest, 0));
  const totalPayments = round2(pmt * cfg.termMonths);
  const totalCost = round2(cfg.down + cfg.fees.upfront + cfg.extras.upfront + totalPayments);
  return {
    payment: pmt,
    totalInterest,
    totalCost,
    financedAmount: PV,
    salesTax: tax,
  };
}
