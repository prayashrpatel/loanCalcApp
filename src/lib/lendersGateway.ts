import type { BorrowerProfile, LoanConfig, Offer } from './models';
import { computeFeatures } from './affordability';
import { scoreRisk } from './risk';
import { getLenderOffers, LENDERS } from './offers';

export async function fetchOffers(cfg: LoanConfig, borrower: BorrowerProfile): Promise<Offer[]> {
  await new Promise((r) => setTimeout(r, 350)); // simulate network
  const features = computeFeatures(cfg, borrower);
  const risk = scoreRisk(features);
  return getLenderOffers(cfg, features, risk, LENDERS);
}
