// Shared types used across modules

export type TaxRule = 'price_minus_tradein' | 'price_full';

export interface LoanConfig {
  price: number;
  down: number;
  tradeIn: number;
  tradeInPayoff: number;
  apr: number;            // UI APR input; lenders may override
  termMonths: number;
  taxRate: number;        // %
  fees: { upfront: number; financed: number };
  extras: { upfront: number; financed: number };
  taxRule: TaxRule;
}

export interface BorrowerProfile {
  monthlyIncome: number;    // gross
  housingCost: number;      // rent/mortgage
  otherDebt: number;        // credit cards, student loans, etc.
  state?: string;
}

export interface Features {
  ltv: number;              // loan-to-value
  dti: number;              // debt-to-income incl. new loan payment
  payment: number;          // computed monthly payment for cfg
  financedAmount: number;   // principal financed
}

export interface RiskScore {
  pd: number;               // probability of default (0..1)
  confidence: number;       // 0..1
  modelVersion: string;
}

export interface RuleViolation {
  code: string;
  message: string;
}

export interface RuleResult {
  approved: boolean;
  violations: RuleViolation[];
}

export interface Lender {
  id: string;
  name: string;
  // simple lender preferences to shape their pricing
  baseApr: number;          // nominal base APR
  maxTerm: number;          // months
  minIncome?: number;
  maxLtv?: number;
  maxDti?: number;
  riskAprBpsPerPd?: number; // e.g., +150 bps per 0.10 PD
}

export interface Offer {
  lenderId: string;
  lenderName: string;
  termMonths: number;
  apr: number;              // lender-priced APR
  monthlyPayment: number;
  totalCost: number;        // down + upfronts + payments
  riskAdjustedApr: number;  // apr * (1 + pd)
}

export interface EvaluationResult {
  features: Features;
  risk: RiskScore;
  rules: RuleResult;
  offers: Offer[];
}
