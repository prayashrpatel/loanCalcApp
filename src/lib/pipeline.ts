// src/lib/pipeline.ts
import type {
  BorrowerProfile,
  EvaluationResult,
  Lender,
  LoanConfig,
  Features,
  RiskScore,
} from './models';
import { computeFeatures } from './affordability';
import { scoreRisk } from './risk';
import { applyRules, DEFAULT_RULES } from './rules';
import { getLenderOffers, LENDERS } from './offers';

// Orchestrates the entire flow (now async)
export async function evaluateApplication(
  cfg: LoanConfig,
  borrower: BorrowerProfile,
  lenders: Lender[] = LENDERS
): Promise<EvaluationResult> {
  const features: Features = computeFeatures(cfg, borrower);

  // Await the async risk call and ensure it's a RiskScore
  const risk: RiskScore = await scoreRisk(features);

  const rules = applyRules(features, borrower, risk, DEFAULT_RULES);

  const offers = rules.approved ? getLenderOffers(cfg, features, risk, lenders) : [];

  return { features, risk, rules, offers };
}
