// src/lib/lendersGateway.ts
import type { BorrowerProfile, LoanConfig, Offer } from './models';
import { computeFeatures } from './affordability';
import { scoreRisk } from './risk';
import { getLenderOffers, LENDERS } from './offers';

// Simulated aggregator call: compute features, score risk, then price + rank offers.
export async function fetchOffers(cfg: LoanConfig, borrower: BorrowerProfile): Promise<Offer[]> {
  const features = computeFeatures(cfg, borrower);
  const risk = await scoreRisk(cfg, borrower, features);
  return getLenderOffers(cfg, features, risk, LENDERS);
}
