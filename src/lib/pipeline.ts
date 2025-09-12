import type { BorrowerProfile, EvaluationResult, Lender, LoanConfig } from './models';
import { computeFeatures } from './affordability';
import { scoreRisk } from './risk';
import { applyRules, DEFAULT_RULES } from './rules';
import { getLenderOffers, LENDERS } from './offers';

// Orchestrates the entire flow
export function evaluateApplication(
  cfg: LoanConfig,
  borrower: BorrowerProfile,
  lenders: Lender[] = LENDERS
): EvaluationResult {
  const features = computeFeatures(cfg, borrower);
  const risk = scoreRisk(features);
  const rules = applyRules(features, borrower, risk, DEFAULT_RULES);

  const offers = rules.approved ? getLenderOffers(cfg, features, risk, lenders) : [];

  return { features, risk, rules, offers };
}
