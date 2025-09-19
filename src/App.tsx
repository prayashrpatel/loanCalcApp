// src/App.tsx
import { useEffect, useMemo, useState } from 'react';
import './App.css';

import type { LoanConfig, BorrowerProfile, EvaluationResult, Offer } from './lib/models';
import { computeSalesTax, computeFinancedAmount, buildAmortization, computeSummary } from './lib/loan';
import { evaluateApplication } from './lib/pipeline';
import { getTaxPreset } from './lib/tax';
import { fetchOffers } from './lib/lendersGateway';
import { decodeVin, type VinInfo } from './lib/vehicle';

// charts
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

// ---- Defaults aligned with your models.ts ----
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

const DEFAULT_BORROWER: BorrowerProfile = {
  monthlyIncome: 5200,
  housingCost: 1800,
  otherDebt: 250,
  state: 'CA',
};

function NumberField({
  label, value, onChange, step = 100, min = 0,
}: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; }) {
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
    </label>
  );
}

// Amortization row shape (matches buildAmortization output)
type AmortRow = {
  period: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
};

export default function App() {
  const [cfg, setCfg] = useState<LoanConfig>(DEFAULT_CFG);
  const [borrower, setBorrower] = useState<BorrowerProfile>(DEFAULT_BORROWER);

  // VIN UI state
  const [vin, setVin] = useState('');
  const [vinInfo, setVinInfo] = useState<VinInfo | null>(null);
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState<string | null>(null);

  // Offers async state
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);

  // Decision pipeline async state (rules/approval/offers)
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // === Loan math (local/instant) ===
  const salesTax = useMemo(() => computeSalesTax(cfg), [cfg]);
  const financedAmount = useMemo(() => computeFinancedAmount(cfg, salesTax), [cfg, salesTax]);
  const summary = useMemo(() => computeSummary(cfg), [cfg]);
  const schedule: AmortRow[] = useMemo(() => buildAmortization(cfg), [cfg]);

  // Run server-side decision pipeline (rules/approval etc.)
  useEffect(() => {
    let alive = true;
    (async () => {
      setEvalLoading(true);
      setEvalError(null);
      try {
        const res = await evaluateApplication(cfg, borrower);
        if (alive) setEvalResult(res);
      } catch (e: any) {
        if (alive) {
          setEvalResult(null);
          setEvalError(e?.message ?? 'Failed to evaluate application');
        }
      } finally {
        if (alive) setEvalLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [cfg, borrower]);

  // Optional: auto-set tax preset from state
  useEffect(() => {
    const p = getTaxPreset(borrower.state);
    if (p) setCfg((c) => ({ ...c, taxRate: p.ratePct, taxRule: p.rule }));
  }, [borrower.state]);

  // Fetch lender offers if approved
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!evalResult?.rules.approved) { setOffers([]); return; }
      setOffersLoading(true);
      try {
        const o = await fetchOffers(cfg, borrower);
        if (alive) setOffers(o);
      } finally {
        if (alive) setOffersLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [cfg, borrower, evalResult?.rules.approved]);

  // VIN handler
  async function onDecodeVin() {
    if (!vin) return;
    setVinError(null);
    setVinLoading(true);
    try {
      const info = await decodeVin(vin);
      setVinInfo(info);
      if (info.msrp) setCfg((c) => ({ ...c, price: info.msrp! }));
    } catch (e: any) {
      setVinError(e?.message ?? 'Failed to decode VIN');
    } finally {
      setVinLoading(false);
    }
  }

  const approved = evalResult?.rules.approved ?? false;

  return (
    <div className="container">
      <div className="grid-shell">
        {/* ===== KPI STRIP ===== */}
        <section className="hero area-hero">
          <h1 className="hero-title">Auto Loan Calculator</h1>
          <div className="hero-kpis">
            <div className="kpi">
              <div className="label">Monthly payment</div>
              <div className="value">
                {usd.format(summary.payment)} <span className="unit">/mo</span>
              </div>
            </div>
            <div className="kpi">
              <div className="label">Financed amount</div>
              <div className="value">{usd.format(financedAmount)}</div>
            </div>
            <div className="kpi">
              <div className="label">Term</div>
              <div className="value">{cfg.termMonths} <span className="unit">mo</span></div>
            </div>
            <div className="kpi">
              <div className="label">All-in cost</div>
              <div className="value">{usd.format(summary.totalCost)}</div>
            </div>
          </div>
        </section>

        {/* ===== COL 1: VIN DECODER ===== */}
        <section className="panel area-vin">
          <h2>Vin Decoder</h2>
          <label className="field">
            <span className="label">VIN</span>
            <input
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              placeholder="Enter VIN (e.g., 1HGCM82633A004352)"
            />
          </label>
          <button className="ghost primary vin-btn" onClick={onDecodeVin} disabled={vinLoading || !vin}>
            {vinLoading ? 'Decoding…' : 'DECODE VIN'}
          </button>
          {vinInfo && (
            <p className="vin-info">
              {vinInfo.year} {vinInfo.make} {vinInfo.model} {vinInfo.trim}
              {vinInfo.msrp ? ` — MSRP ${usd.format(vinInfo.msrp)}` : ''}
            </p>
          )}
          {vinError && <p className="vin-error">{vinError}</p>}
        </section>

        {/* ===== COL 2: VEHICLE & PRICING ===== */}
        <section className="panel area-vehicle">
          <h2>Vehicle & Pricing</h2>

          <NumberField label="Vehicle price" value={cfg.price} onChange={(v) => setCfg({ ...cfg, price: v })} />
          <NumberField label="Down payment" value={cfg.down} onChange={(v) => setCfg({ ...cfg, down: v })} />

          <div className="two">
            <NumberField label="Trade-in value" value={cfg.tradeIn} onChange={(v) => setCfg({ ...cfg, tradeIn: v })} />
            <NumberField label="Trade-in payoff" value={cfg.tradeInPayoff} onChange={(v) => setCfg({ ...cfg, tradeInPayoff: v })} />
          </div>

          <div className="two">
            <NumberField label="Sales tax %" step={0.25} value={cfg.taxRate} onChange={(v) => setCfg({ ...cfg, taxRate: v })} />
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

          <h3>Financing</h3>
          <div className="two">
            <NumberField label="APR %" step={0.1} value={cfg.apr} onChange={(v) => setCfg({ ...cfg, apr: v })} />
            <label className="field">
              <span className="label">Term (months)</span>
              <select
                value={cfg.termMonths}
                onChange={(e) => setCfg({ ...cfg, termMonths: Number(e.target.value) })}
              >
                {[36, 48, 60, 72, 84].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>

          <h3>Fees & Extras</h3>
          <div className="two">
            <NumberField
              label="Upfront fees"
              value={cfg.fees.upfront}
              onChange={(v) => setCfg({ ...cfg, fees: { ...cfg.fees, upfront: v } })}
            />
            <NumberField
              label="Financed fees"
              value={cfg.fees.financed}
              onChange={(v) => setCfg({ ...cfg, fees: { ...cfg.fees, financed: v } })}
            />
          </div>

          <div className="two">
            <NumberField
              label="Upfront extras"
              value={cfg.extras.upfront}
              onChange={(v) => setCfg({ ...cfg, extras: { ...cfg.extras, upfront: v } })}
            />
            <NumberField
              label="Financed extras"
              value={cfg.extras.financed}
              onChange={(v) => setCfg({ ...cfg, extras: { ...cfg.extras, financed: v } })}
            />
          </div>
        </section>

        {/* ===== COL 3: BORROWER + DECISION ===== */}
        <section className="panel area-borrower">
          <h2>Borrower</h2>
          <NumberField
            label="Monthly income"
            value={borrower.monthlyIncome}
            onChange={(v) => setBorrower({ ...borrower, monthlyIncome: v })}
          />
          <div className="two">
            <NumberField
              label="Housing cost"
              value={borrower.housingCost}
              onChange={(v) => setBorrower({ ...borrower, housingCost: v })}
            />
            <NumberField
              label="Other monthly debt"
              value={borrower.otherDebt}
              onChange={(v) => setBorrower({ ...borrower, otherDebt: v })}
            />
          </div>
          <label className="field">
            <span className="label">State</span>
            <input
              type="text"
              value={borrower.state ?? ''}
              onChange={(e) => setBorrower({ ...borrower, state: e.target.value })}
            />
          </label>

          <h2>Decision</h2>
          <div className="decision">
            {evalLoading && <span className="badge">Calculating…</span>}
            {!evalLoading && (
              <span className={`badge ${approved ? 'ok' : 'bad'}`}>
                {approved ? 'APPROVED' : 'DECLINED'}
              </span>
            )}

            <div className="kv"><span>LTV</span><strong>{pct(evalResult?.features.ltv ?? 0)}</strong></div>
            <div className="kv"><span>DTI</span><strong>{pct(evalResult?.features.dti ?? 0)}</strong></div>
            <div className="kv">
              <span>PD (risk)</span>
              <strong>{pct(evalResult?.risk.pd ?? 0)} <small>conf {pct(evalResult?.risk.confidence ?? 0)}</small></strong>
            </div>

            {evalError && <p className="vin-error">{evalError}</p>}
            {evalResult?.rules.violations.length ? (
              <ul className="violations">
                {evalResult.rules.violations.map((v) => (
                  <li key={v.code}><strong>{v.code}:</strong> {v.message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        {/* ===== COL 4: RESULTS + CHARTS + AMORTIZATION ===== */}
        <section className="panel area-results">
          <div className="results">
            <h2>{usd.format(summary.payment)}/mo</h2>
            <div className="summary">
              <div className="row"><span>Financed amount</span><strong>{usd.format(financedAmount)}</strong></div>
              <div className="row"><span>Sales tax</span><strong>{usd.format(salesTax)}</strong></div>
              <div className="row"><span>Total interest (life of loan)</span><strong>{usd.format(summary.totalInterest)}</strong></div>
              <div className="row"><span>All-in cost</span><strong>{usd.format(summary.totalCost)}</strong></div>
            </div>

            <div className="charts">
              <div className="chart-card">
                <div className="chart-title">Interest vs Principal</div>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Principal', value: financedAmount },
                          { name: 'Interest', value: summary.totalInterest },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="60%"
                        outerRadius="85%"
                        paddingAngle={2}
                      >
                        <Cell fill="#58a6ff" />
                        <Cell fill="#f2cc60" />
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0c1426', border: '1px solid #30363d', color: '#c9d1d9' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-title">Remaining Balance</div>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={schedule.map((r: AmortRow) => ({ month: r.period, balance: r.balance }))}
                      margin={{ top: 6, right: 12, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fill: '#8b949e', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#8b949e', fontSize: 12 }} />
                      <Tooltip
                        formatter={(v: any) => usd.format(v as number)}
                        labelFormatter={(l) => `Month ${l}`}
                        contentStyle={{ background: '#0c1426', border: '1px solid #30363d', color: '#c9d1d9' }}
                      />
                      <Line type="monotone" dataKey="balance" stroke="#58a6ff" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <h3>Amortization</h3>
            <div className="amort-wrap">
              <table className="amort">
                <thead>
                  <tr>
                    <th>Month</th><th>Payment</th><th>Interest</th><th>Principal</th><th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.slice(0, 60).map((r: AmortRow) => (
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
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
