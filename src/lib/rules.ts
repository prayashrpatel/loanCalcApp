import type { Features, RuleResult, RuleViolation, BorrowerProfile, RiskScore } from './models';

export interface RuleConfig {
  maxLtv: number;
  maxDti: number;
  minIncome: number;
  maxPd: number;
}

export const DEFAULT_RULES: RuleConfig = {
  maxLtv: 1.25,
  maxDti: 0.50,
  minIncome: 2000,
  maxPd: 0.35,
};

export function applyRules(
  features: Features,
  borrower: BorrowerProfile,
  risk: RiskScore,
  rules: RuleConfig = DEFAULT_RULES
): RuleResult {
  const violations: RuleViolation[] = [];

  if (features.ltv > rules.maxLtv) {
    violations.push({ code: 'MAX_LTV', message: `LTV ${pct(features.ltv)} exceeds ${pct(rules.maxLtv)}` });
  }
  if (features.dti > rules.maxDti) {
    violations.push({ code: 'MAX_DTI', message: `DTI ${pct(features.dti)} exceeds ${pct(rules.maxDti)}` });
  }
  if (borrower.monthlyIncome < rules.minIncome) {
    violations.push({ code: 'MIN_INCOME', message: `Income ${usd(borrower.monthlyIncome)} below ${usd(rules.minIncome)}` });
  }
  if (risk.pd > rules.maxPd) {
    violations.push({ code: 'MAX_PD', message: `PD ${pct(risk.pd)} exceeds ${pct(rules.maxPd)}` });
  }

  return { approved: violations.length === 0, violations };
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const usd = (x: number) => `$${x.toFixed(0)}`;
