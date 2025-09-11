import { useMemo, useState } from 'react';
import './App.css';
import {
  type LoanConfig,
  computeSummary,
  buildAmortization,
  computeSalesTax,
  computeFinancedAmount,
} from './lib/loan';

const usd = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

const DEFAULT_CFG: LoanConfig = {
  price: 32000,
  down: 2000,
  tradeIn: 0,
  tradeInPayoff: 0,
  apr: 6.5,
  termMonths: 60,
  taxRate: 8.75,
  fees: { upfront: 400, financed: 300 },
  extras: { upfront: 0, financed: 0 },
  taxRule: 'price_minus_tradein',
};

function NumberInput({
  label,
  value,
  onChange,
  step = 100,
  min = 0,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

export default function App() {
  const [cfg, setCfg] = useState<LoanConfig>(DEFAULT_CFG);
  const [showAll, setShowAll] = useState(false);

  const summary = useMemo(() => computeSummary(cfg), [cfg]);
  const table = useMemo(() => buildAmortization(cfg), [cfg]);

  const salesTax = useMemo(() => computeSalesTax(cfg), [cfg]);
  const financedAmount = useMemo(
    () => computeFinancedAmount(cfg, salesTax),
    [cfg, salesTax]
  );

  return (
    <div className="container">
      <header>
        <h1>Auto Loan Calculator</h1>
        <p className="sub">Change numbers on the left; results update live.</p>
      </header>

      <main className="grid">
        {/* LEFT: Inputs */}
        <section className="panel inputs">
          <h2>Vehicle & Pricing</h2>
          <NumberInput label="Vehicle price" value={cfg.price} onChange={(v) => setCfg({ ...cfg, price: v })} />
          <NumberInput label="Down payment" value={cfg.down} onChange={(v) => setCfg({ ...cfg, down: v })} />

          <div className="two">
            <NumberInput label="Trade-in value" value={cfg.tradeIn} onChange={(v) => setCfg({ ...cfg, tradeIn: v })} />
            <NumberInput label="Trade-in payoff" value={cfg.tradeInPayoff} onChange={(v) => setCfg({ ...cfg, tradeInPayoff: v })} />
          </div>

          <div className="two">
            <NumberInput label="Sales tax %" step={0.25} value={cfg.taxRate} onChange={(v) => setCfg({ ...cfg, taxRate: v })} />
            <label className="field">
              <span className="label">Tax rule</span>
              <select
                value={cfg.taxRule}
                onChange={(e) => setCfg({ ...cfg, taxRule: e.target.value as LoanConfig['taxRule'] })}
              >
                <option value="price_minus_tradein">Tax price − trade-in</option>
                <option value="price_full">Tax full price</option>
              </select>
            </label>
          </div>

          <h2>Financing</h2>
          <div className="two">
            <NumberInput label="APR %" step={0.1} value={cfg.apr} onChange={(v) => setCfg({ ...cfg, apr: v })} />
            <label className="field">
              <span className="label">Term (months)</span>
              <select
                value={cfg.termMonths}
                onChange={(e) => setCfg({ ...cfg, termMonths: Number(e.target.value) })}
              >
                {[36, 48, 60, 72, 84].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>

          <h2>Fees & Extras</h2>
          <div className="two">
            <NumberInput label="Upfront fees" value={cfg.fees.upfront} onChange={(v) => setCfg({ ...cfg, fees: { ...cfg.fees, upfront: v } })} />
            <NumberInput label="Financed fees" value={cfg.fees.financed} onChange={(v) => setCfg({ ...cfg, fees: { ...cfg.fees, financed: v } })} />
          </div>
          <div className="two">
            <NumberInput label="Upfront extras" value={cfg.extras.upfront} onChange={(v) => setCfg({ ...cfg, extras: { ...cfg.extras, upfront: v } })} />
            <NumberInput label="Financed extras" value={cfg.extras.financed} onChange={(v) => setCfg({ ...cfg, extras: { ...cfg.extras, financed: v } })} />
          </div>
        </section>

        {/* RIGHT: Results */}
        <section className="panel results">
          <div className="summary">
            <div className="big">{usd.format(summary.payment)}/mo</div>
            <div className="row">
              <span>Financed amount</span>
              <strong>{usd.format(financedAmount)}</strong>
            </div>
            <div className="row">
              <span>Sales tax</span>
              <strong>{usd.format(salesTax)}</strong>
            </div>
            <div className="row">
              <span>Total interest (life of loan)</span>
              <strong>{usd.format(summary.totalInterest)}</strong>
            </div>
            <div className="row">
              <span>All-in cost (down + upfronts + all payments)</span>
              <strong>{usd.format(summary.totalCost)}</strong>
            </div>
          </div>

          <h3>Amortization</h3>
          <table className="amort">
            <thead>
              <tr>
                <th>Month</th>
                <th>Payment</th>
                <th>Interest</th>
                <th>Principal</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {(showAll ? table : table.slice(0, 24)).map((r) => (
                <tr key={r.period}>
                  <td>{r.period}</td>
                  <td>{usd.format(r.payment)}</td>
                  <td>{usd.format(r.interest)}</td>
                  <td>{usd.format(r.principal)}</td>
                  <td>{usd.format(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {table.length > 24 && (
            <button className="ghost" onClick={() => setShowAll((s) => !s)}>
              {showAll ? 'Show first 24 months' : `Show all ${table.length} months`}
            </button>
          )}
        </section>
      </main>

      <footer>
        <small>Edge cases handled: 0% APR, last-payment rounding, negative equity protection (no negative PV).</small>
      </footer>
    </div>
  );
}
