import { evaluateApplication } from './lib/pipeline';
import { type LoanConfig, type BorrowerProfile } from './lib/models';

const cfg: LoanConfig = {
  price: 32000, down: 2000, tradeIn: 0, tradeInPayoff: 0,
  apr: 6.5, termMonths: 60, taxRate: 8.75,
  fees: { upfront: 400, financed: 300 },
  extras: { upfront: 0, financed: 0 },
  taxRule: 'price_minus_tradein',
};

const borrower: BorrowerProfile = {
  monthlyIncome: 5200, housingCost: 1800, otherDebt: 250, state: 'CA'
};

console.log(evaluateApplication(cfg, borrower));
