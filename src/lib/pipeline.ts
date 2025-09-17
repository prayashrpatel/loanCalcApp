// src/lib/pipeline.ts
import type {
  BorrowerProfile,
  EvaluationResult,
  Lender,
  LoanConfig,
  RiskScore,
} from './models';
import { computeFeatures } from './affordability';
import { scoreRisk } from './risk';
import { applyRules, DEFAULT_RULES } from './rules';
import { getLenderOffers, LENDERS } from './offers';


export async function evaluateApplication(
  cfg: LoanConfig,
  borrower: BorrowerProfile,
  lenders: Lender[] = LENDERS
): Promise<EvaluationResult> {
  const features = computeFeatures(cfg, borrower);
  const risk: RiskScore = await scoreRisk(cfg, borrower, features);
  const rules = applyRules(features, borrower, risk, DEFAULT_RULES);
  const offers = rules.approved ? getLenderOffers(cfg, features, risk, lenders) : [];
  return { features, risk, rules, offers };
}
