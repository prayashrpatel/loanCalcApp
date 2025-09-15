import { useEffect, useMemo, useState } from 'react';
import './App.css';

import type { LoanConfig, BorrowerProfile, EvaluationResult, Offer } from './lib/models';
import { computeSalesTax, computeFinancedAmount, buildAmortization, computeSummary } from './lib/loan';
import { evaluateApplication } from './lib/pipeline';
import { getTaxPreset } from './lib/tax';
import { fetchOffers } from './lib/lendersGateway';
import { decodeVin, type VinInfo } from './lib/vehicle';

// NEW: features + risk (backend)
import { computeFeatures } from './lib/affordability';
import { scoreRisk, type RiskScore } from './lib/risk';

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
  const schedule = useMemo(() => buildAmortization(cfg), [cfg]);

  // === NEW: compute features locally ===
  const features = useMemo(() => computeFeatures(cfg, borrower), [cfg, borrower]);

  // === NEW: backend risk (PD/conf) ===
  const [risk, setRisk] = useState<RiskScore>({ pd: 0.3, confidence: 0.6 });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await scoreRisk(cfg, borrower, { ltv: features.ltv, dti: features.dti });
        if (alive) setRisk(r);
      } catch {
        // keep prior risk if call fails
      }
    })();
    // re-score only when the meaningful inputs change
  }, [cfg.apr, cfg.termMonths, borrower.monthlyIncome, features.ltv, features.dti]); // eslint-disable-line

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
      <div className="layout">
        {/* ===== HERO KPI STRIP ===== */}
        <section className="hero area-hero">
          <h1 className="hero-title">Auto Loan Calculator</h1>
          <div className="hero-kpis">
            <div className="kpi kpi-main">
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

        {/* ===== LEFT: Vehicle & Pricing ===== */}
        <section className="panel area-inputs">
          <h2>Vehicle & Pricing</h2>

          {/* VIN row */}
          <div className="vin-row">
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
              {vinLoading ? 'Decoding…' : 'Decode VIN'}
            </button>
          </div>
          {vinInfo && (
            <p className="vin-info">
              {vinInfo.year} {vinInfo.make} {vinInfo.model} {vinInfo.trim}
              {vinInfo.msrp ? ` — MSRP ${usd.format(vinInfo.msrp)}` : ''}
            </p>
          )}
          {vinError && <p className="vin-error">{vinError}</p>}

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
                {[36, 48, 60, 72, 84].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
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

        {/* ===== MIDDLE: Borrower + Decision ===== */}
        <section className="panel area-decision">
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
            <div className="kv"><span>LTV</span><strong>{pct(features.ltv)}</strong></div>
            <div className="kv"><span>DTI</span><strong>{pct(features.dti)}</strong></div>
            <div className="kv">
              <span>PD (risk)</span>
              <strong>
                {pct(risk.pd)} <small>conf {pct(risk.confidence)}</small>
              </strong>
            </div>
            {evalError && <p className="vin-error">{evalError}</p>}
            {evalResult?.rules.violations.length
              ? (
                <ul className="violations">
                  {evalResult.rules.violations.map(v => (
                    <li key={v.code}><strong>{v.code}:</strong> {v.message}</li>
                  ))}
                </ul>
              )
              : null}
          </div>
        </section>

        {/* ===== RIGHT: Results + Charts + Offers + Amortization ===== */}
        <section className="panel area-results">
          <div className="results">
            <h2>{usd.format(summary.payment)}/mo</h2>
            <div className="summary">
              <div className="row"><span>Financed amount</span><strong>{usd.format(financedAmount)}</strong></div>
              <div className="row"><span>Sales tax</span><strong>{usd.format(salesTax)}</strong></div>
              <div className="row"><span>Total interest (life of loan)</span><strong>{usd.format(summary.totalInterest)}</strong></div>
              <div className="row"><span>All-in cost</span><strong>{usd.format(summary.totalCost)}</strong></div>
            </div>

            {/* Charts */}
            <div className="charts">
              {/* Donut: interest vs principal */}
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
                      <Tooltip
                        contentStyle={{ background: '#0c1426', border: '1px solid #30363d', color: '#c9d1d9' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Line: remaining balance */}
              <div className="chart-card">
                <div className="chart-title">Remaining Balance</div>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={schedule.map(r => ({ month: r.period, balance: r.balance }))}
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

            <h3>Offers</h3>
            {offersLoading ? (
              <p className="muted">Fetching offers…</p>
            ) : approved && offers.length > 0 ? (
              <div className="offers">
                {offers.map(o => (
                  <div className="offer" key={o.lenderId}>
                    <div className="offer-head">
                      <strong>{o.lenderName}</strong>
                      <span className="muted">{o.termMonths} mo</span>
                    </div>
                    <div className="offer-grid">
                      <div><div className="muted">APR</div><div>{o.apr.toFixed(2)}%</div></div>
                      <div><div className="muted">Risk-Adj APR</div><div>{o.riskAdjustedApr.toFixed(2)}%</div></div>
                      <div><div className="muted">Monthly</div><div>{usd.format(o.monthlyPayment)}</div></div>
                      <div><div className="muted">Total Cost</div><div>{usd.format(o.totalCost)}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">
                {approved ? 'No eligible offers found.' : 'No offers because the application is declined.'}
              </p>
            )}

            <h3>Amortization</h3>
            <div className="amort-wrap">
              <table className="amort">
                <thead>
                  <tr>
                    <th>Month</th><th>Payment</th><th>Interest</th><th>Principal</th><th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.slice(0, 60).map(r => (
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
