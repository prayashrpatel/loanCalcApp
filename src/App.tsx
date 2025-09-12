import { useMemo, useState } from 'react';
import './App.css';

import type { LoanConfig, BorrowerProfile, EvaluationResult } from './lib/models';
import { computeSalesTax, computeFinancedAmount, buildAmortization, computeSummary } from './lib/loan';
import { evaluateApplication } from './lib/pipeline';

import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const usd = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

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

function NumberInput({ label, value, onChange, step = 100, min = 0, hint }: {
  label: string; value: number; onChange: (v:number)=>void; step?: number; min?: number; hint?: string;
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

/* HERO */
function HeroSummary({ monthly, financed, termMonths, totalCost }:{
  monthly: number; financed: number; termMonths: number; totalCost: number;
}) {
  const usd = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
  return (
    <div className="hero area-hero" role="region" aria-label="Loan summary">
      <div className="hero-title">Auto Loan Calculator</div>
      <div className="hero-kpis">
        <div className="kpi kpi-main">
          <div className="label">Monthly payment</div>
          <div className="value">{usd.format(monthly)}<span className="unit">/mo</span></div>
        </div>
        <div className="kpi">
          <div className="label">Financed amount</div>
          <div className="value">{usd.format(financed)}</div>
        </div>
        <div className="kpi">
          <div className="label">Term</div>
          <div className="value">{termMonths} mo</div>
        </div>
        <div className="kpi">
          <div className="label">All-in cost</div>
          <div className="value">{usd.format(totalCost)}</div>
        </div>
      </div>
    </div>
  );
}

/* Gauges helpers */
function clamp01(x:number){ return Math.max(0, Math.min(1, x)); }
function statusByThreshold(valuePct:number, limits:{good:number; warn:number}) {
  if (valuePct <= limits.good) return 'good';
  if (valuePct <= limits.warn) return 'warn';
  return 'bad';
}
function GaugeBar({ label, valuePct, limits, ariaNote }:{
  label:string; valuePct:number; limits:{good:number; warn:number}; ariaNote?:string;
}) {
  const status = statusByThreshold(valuePct, limits);
  const width = `${clamp01(valuePct / Math.max(limits.warn, 1)) * 100}%`;
  return (
    <div className="kv" role="group" aria-label={`${label} ${valuePct.toFixed(1)}% ${ariaNote ?? ''}`}>
      <span>{label}</span>
      <strong>{valuePct.toFixed(1)}%</strong>
      <div className={`gauge gauge-${status}`} aria-hidden="true" style={{ width: '100%' }}>
        <i style={{ width }} />
      </div>
    </div>
  );
}

type OfferSortKey = 'recommended' | 'monthly' | 'apr' | 'riskAdjApr' | 'totalCost' | 'term';

export default function App() {
  const [cfg, setCfg] = useState<LoanConfig>(DEFAULT_CFG);
  const [borrower, setBorrower] = useState<BorrowerProfile>(DEFAULT_BORROWER);
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<OfferSortKey>('recommended');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');

  // math
  const salesTax = useMemo(() => computeSalesTax(cfg), [cfg]);
  const financedAmount = useMemo(() => computeFinancedAmount(cfg, salesTax), [cfg, salesTax]);
  const summary = useMemo(() => computeSummary(cfg), [cfg]);
  const table = useMemo(() => buildAmortization(cfg), [cfg]);

  // pipeline
  const evalResult: EvaluationResult = useMemo(() => evaluateApplication(cfg, borrower), [cfg, borrower]);

  // charts
  const principalPaid = useMemo(() => table.reduce((s, r) => s + r.principal, 0), [table]);
  const donutData = useMemo(() => ([
    { name: 'Principal', value: principalPaid },
    { name: 'Interest', value: summary.totalInterest },
  ]), [principalPaid, summary.totalInterest]);
  const balanceSeries = useMemo(() => table.map(r => ({ month: r.period, balance: r.balance })), [table]);

  // offers sorting
  const sortedOffers = useMemo(() => {
    if (!evalResult.rules.approved || evalResult.offers.length === 0) return [];
    if (sortBy === 'recommended') return evalResult.offers;
    const get = (k:OfferSortKey, o:(typeof evalResult.offers)[number]) =>
      k==='monthly'?o.monthlyPayment: k==='apr'?o.apr: k==='riskAdjApr'?o.riskAdjustedApr:
      k==='totalCost'?o.totalCost: k==='term'?o.termMonths: 0;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...evalResult.offers].sort((a,b)=> (get(sortBy,a)-get(sortBy,b))*dir);
  }, [evalResult, sortBy, sortDir]);

  function exportAmortCsv() {
    const header = ['Month','Payment','Interest','Principal','Balance'];
    const rows = (showAll?table:table.slice(0,24)).map(r=>[
      r.period, usd.format(r.payment), usd.format(r.interest), usd.format(r.principal), usd.format(r.balance)
    ]);
    const csv = [header, ...rows].map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download='amortization.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container">
      {/* HERO across the top */}
      <HeroSummary
        monthly={summary.payment}
        financed={financedAmount}
        termMonths={cfg.termMonths}
        totalCost={summary.totalCost}
      />

      <main className="layout">
        {/* LEFT: Inputs */}
        <section className="panel area-inputs">
          <h2>Vehicle & Pricing</h2>
          <NumberInput label="Vehicle price" value={cfg.price} onChange={(v)=>setCfg({...cfg, price:v})}/>
          <NumberInput label="Down payment" value={cfg.down} onChange={(v)=>setCfg({...cfg, down:v})}/>
          <div className="two">
            <NumberInput label="Trade-in value" value={cfg.tradeIn} onChange={(v)=>setCfg({...cfg, tradeIn:v})}/>
            <NumberInput label="Trade-in payoff" value={cfg.tradeInPayoff} onChange={(v)=>setCfg({...cfg, tradeInPayoff:v})}/>
          </div>

          <div className="two">
            <NumberInput label="Sales tax %" step={0.25} value={cfg.taxRate} onChange={(v)=>setCfg({...cfg, taxRate:v})}/>
            <label className="field">
              <span className="label">Tax rule</span>
              <select value={cfg.taxRule} onChange={(e)=>setCfg({...cfg, taxRule:e.target.value as LoanConfig['taxRule']})}>
                <option value="price_minus_tradein">Tax price − trade-in</option>
                <option value="price_full">Tax full price</option>
              </select>
            </label>
          </div>

          <h2>Financing</h2>
          <div className="two">
            <NumberInput label="APR %" step={0.1} value={cfg.apr} onChange={(v)=>setCfg({...cfg, apr:v})}/>
            <label className="field">
              <span className="label">Term (months)</span>
              <select value={cfg.termMonths} onChange={(e)=>setCfg({...cfg, termMonths:Number(e.target.value)})}>
                {[36,48,60,72,84].map(n=> <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>

          <h2>Fees & Extras</h2>
          <div className="two">
            <NumberInput label="Upfront fees" value={cfg.fees.upfront} onChange={(v)=>setCfg({...cfg, fees:{...cfg.fees, upfront:v}})}/>
            <NumberInput label="Financed fees" value={cfg.fees.financed} onChange={(v)=>setCfg({...cfg, fees:{...cfg.fees, financed:v}})}/>
          </div>
          <div className="two">
            <NumberInput label="Upfront extras" value={cfg.extras.upfront} onChange={(v)=>setCfg({...cfg, extras:{...cfg.extras, upfront:v}})}/>
            <NumberInput label="Financed extras" value={cfg.extras.financed} onChange={(v)=>setCfg({...cfg, extras:{...cfg.extras, financed:v}})}/>
          </div>
        </section>

        {/* MIDDLE: Borrower + Decision */}
        <section className="panel area-decision">
          <h2>Borrower</h2>
          <NumberInput label="Monthly income" value={borrower.monthlyIncome} onChange={(v)=>setBorrower({...borrower, monthlyIncome:v})}/>
          <div className="two">
            <NumberInput label="Housing cost" value={borrower.housingCost} onChange={(v)=>setBorrower({...borrower, housingCost:v})}/>
            <NumberInput label="Other monthly debt" value={borrower.otherDebt} onChange={(v)=>setBorrower({...borrower, otherDebt:v})}/>
          </div>
          <label className="field">
            <span className="label">State</span>
            <input type="text" value={borrower.state ?? ''} onChange={(e)=>setBorrower({...borrower, state:e.target.value})}/>
          </label>

          <h2>Decision</h2>
          <div className="decision">
            <span className={`badge ${evalResult.rules.approved ? 'ok' : 'bad'}`}>
              {evalResult.rules.approved ? 'APPROVED' : 'DECLINED'}
            </span>

            <GaugeBar label="LTV" valuePct={evalResult.features.ltv * 100} limits={{good:100, warn:120}} ariaNote="Target ≤ 100%"/>
            <GaugeBar label="DTI" valuePct={evalResult.features.dti * 100} limits={{good:40, warn:50}} ariaNote="Target ≤ 50%"/>

            <div className="kv">
              <span>PD (risk)</span>
              <strong>{pct(evalResult.risk.pd)} <small>conf {pct(evalResult.risk.confidence)}</small></strong>
            </div>

            {evalResult.rules.violations.length > 0 && (
              <ul className="violations">
                {evalResult.rules.violations.map(v => (
                  <li key={v.code}><strong>{v.code}:</strong> {v.message}</li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* RIGHT: Results + Charts + Offers + Amort */}
        <section className="panel area-results results">
          <div className="summary">
            <div className="big">{usd.format(summary.payment)}/mo</div>
            <div className="row"><span>Financed amount</span><strong>{usd.format(financedAmount)}</strong></div>
            <div className="row"><span>Sales tax</span><strong>{usd.format(salesTax)}</strong></div>
            <div className="row"><span>Total interest</span><strong>{usd.format(summary.totalInterest)}</strong></div>
            <div className="row"><span>All-in cost</span><strong>{usd.format(summary.totalCost)}</strong></div>
          </div>

          {/* Charts */}
          <div className="charts">
            <div className="chart-card">
              <div className="chart-title">Interest vs Principal</div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      <Cell fill="#66d1ff" />  {/* Principal */}
                      <Cell fill="#f2c94c" />  {/* Interest */}
                    </Pie>
                    <Tooltip formatter={(v:any)=>usd.format(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-title">Remaining Balance</div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={balanceSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeOpacity={0.15} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8ba0bf' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#8ba0bf' }} tickFormatter={(n)=>`$${(n/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v:any)=>usd.format(Number(v))} />
                    <Line type="monotone" dataKey="balance" stroke="#66d1ff" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Offers */}
          <h3>Offers</h3>
          {evalResult.rules.approved && evalResult.offers.length > 0 ? (
            <>
              <div className="offers-toolbar" role="group" aria-label="Sort offers">
                <label className="field compact">
                  <span className="label">Sort by</span>
                  <select value={sortBy} onChange={(e)=>setSortBy(e.target.value as OfferSortKey)}>
                    <option value="recommended">Recommended</option>
                    <option value="monthly">Monthly payment</option>
                    <option value="apr">APR</option>
                    <option value="riskAdjApr">Risk-Adj APR</option>
                    <option value="totalCost">Total cost</option>
                    <option value="term">Term</option>
                  </select>
                </label>
                <button className="ghost sortdir" onClick={()=>setSortDir(d=>d==='asc'?'desc':'asc')}>
                  {sortDir === 'asc' ? '↑' : '↓'}
                </button>
                <span className="muted count">{sortedOffers.length} offers</span>
              </div>

              <div className="offers">
                {sortedOffers.map(o=>(
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
            </>
          ) : (
            <p className="muted">
              {evalResult.rules.approved ? 'No eligible offers found.' : 'No offers because the application is declined.'}
            </p>
          )}

          {/* Amortization */}
          <h3>Amortization</h3>
          <div className="amort-wrap">
            <table className="amort" aria-label="Amortization schedule">
              <thead>
                <tr>
                  <th>Month</th><th>Payment</th><th>Interest</th><th>Principal</th><th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {(showAll ? table : table.slice(0, 24)).map(r=>(
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
          <div className="actions">
            {table.length > 24 && (
              <button className="ghost" onClick={()=>setShowAll(s=>!s)}>
                {showAll ? 'Show first 24 months' : `Show all ${table.length} months`}
              </button>
            )}
            <button className="ghost" onClick={exportAmortCsv}>Export CSV</button>
          </div>
        </section>
      </main>

      <footer>
        <small>Edge cases: 0% APR, rounding, negative equity protection.</small>
      </footer>
    </div>
  );
}
