import type { Features, RiskScore } from './models';

// Mock risk model
export function scoreRisk(features: Features): RiskScore {
  const { ltv, dti } = features;

  const z = 3.0 * (ltv - 0.9) + 2.5 * (dti - 0.35);
  const pd = clamp(sigmoid(z), 0.02, 0.60);

  const ltvConf = 1 - clamp(Math.abs(ltv - 0.9) / 0.5, 0, 1);
  const dtiConf = 1 - clamp(Math.abs(dti - 0.35) / 0.35, 0, 1);
  const confidence = clamp(0.5 * ltvConf + 0.5 * dtiConf, 0.2, 0.95);

  return { pd, confidence, modelVersion: 'mock-1.0.0' };
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
