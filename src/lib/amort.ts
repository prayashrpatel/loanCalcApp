import type { AmortRow } from "../components/AmortizationCard";

export function buildAmortization(
  principal: number,
  aprPercent: number,
  termMonths: number
): AmortRow[] {
  const r = (aprPercent / 100) / 12;  // monthly rate
  const n = termMonths;

  // monthly payment
  const pmt = r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));

  const rows: AmortRow[] = [];
  let bal = principal;

  for (let m = 1; m <= n; m++) {
    const interest = r === 0 ? 0 : bal * r;
    const principalPart = Math.min(pmt - interest, bal);
    bal = Math.max(0, bal - principalPart);

    rows.push({
      month: m,
      payment: r === 0 ? principal / n : pmt,
      interest,
      principal: principalPart,
      balance: bal,
    });
  }
  return rows;
}
