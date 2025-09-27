import { useEffect, useMemo, useState } from "react";
import "./App.css";

import type {
  LoanConfig,
  BorrowerProfile,
  EvaluationResult,
  Offer,
} from "./lib/models";
import {
  computeSalesTax,
  computeFinancedAmount,
  buildAmortization,
  computeSummary,
} from "./lib/loan";
import { evaluateApplication } from "./lib/pipeline";
import { getTaxPreset } from "./lib/tax";
import { fetchOffers } from "./lib/lendersGateway";
import { decodeVin, type VinInfo } from "./lib/vehicle";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/* -------------------- number format helpers -------------------- */
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/* -------------------- defaults -------------------- */
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
  taxRule: "price_minus_tradein",
};

const DEFAULT_BORROWER: BorrowerProfile = {
  monthlyIncome: 5200,
  housingCost: 1800,
  otherDebt: 250,
  state: "CA",
};

/* -------------------- small field component -------------------- */
function NumberField({
  label,
  value,
  onChange,
  step = 100,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

/* ======================== APP ======================== */
export default function App() {
  const [cfg, setCfg] = useState<LoanConfig>(DEFAULT_CFG);
  const [borrower, setBorrower] = useState<BorrowerProfile>(DEFAULT_BORROWER);

  // VIN UI
  const [vin, setVin] = useState("");
  const [vinInfo, setVinInfo] = useState<VinInfo | null>(null);
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState<string | null>(null);
  const [priceDirty, setPriceDirty] = useState(false);

  // Optional offers
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);

  // Evaluation (rules + risk)
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Local math
  const salesTax = useMemo(() => computeSalesTax(cfg), [cfg]);
  const financedAmount = useMemo(
    () => computeFinancedAmount(cfg, salesTax),
    [cfg, salesTax]
  );
  const summary = useMemo(() => computeSummary(cfg), [cfg]);
  const schedule = useMemo(() => buildAmortization(cfg), [cfg]);

  /* -------------------- evaluation -------------------- */
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
          setEvalError(e?.message ?? "Failed to evaluate application");
        }
      } finally {
        if (alive) setEvalLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [cfg, borrower]);

  /* -------------------- tax preset by state -------------------- */
  useEffect(() => {
    const p = getTaxPreset(borrower.state);
    if (p) setCfg((c) => ({ ...c, taxRate: p.ratePct, taxRule: p.rule }));
  }, [borrower.state]);

  /* -------------------- mock offers when approved -------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!evalResult?.rules.approved) {
        setOffers([]);
        return;
      }
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

  /* -------------------- VIN handler -------------------- */
  async function onDecodeVin() {
    if (!vin) return;
    setVinError(null);
    setVinLoading(true);
    try {
      const { vehicle } = await decodeVin(vin);
      setVinInfo(vehicle);

      if (!priceDirty && vehicle.msrp) {
        setCfg((c) => ({ ...c, price: vehicle.msrp! }));
        // tiny toast
        const el = document.createElement("div");
        el.textContent = `Price set from VIN: ${usd.format(vehicle.msrp)}`;
        Object.assign(el.style, {
          position: "fixed",
          right: "16px",
          bottom: "16px",
          padding: "10px 12px",
          background: "#0c1426",
          color: "#e6edf3",
          border: "1px solid #30363d",
          borderRadius: "10px",
          zIndex: 9999,
        });
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1800);
      }
      setPriceDirty(false);
    } catch (e: any) {
      const msg =
        e?.name === "AbortError"
          ? "VIN request timed out"
          : typeof e?.message === "string"
          ? e.message
          : "Failed to decode VIN";
      setVinError(msg);
    } finally {
      setVinLoading(false);
    }
  }

  const approved = evalResult?.rules.approved ?? false;

  /* ======================== RENDER ======================== */
  return (
    <div className="page">
      {/* -------- Top Nav -------- */}
      <header className="topnav">
        <div className="brand">Auto <strong>Loan Calculator</strong></div>
        <nav className="links">
          <a>Home</a>
          <a>Features</a>
          <a>Contact</a>
        </nav>
        <div className="auth"><button className="btn small ghost">Log in</button></div>
      </header>

      {/* ======= Unified grid for HERO + BODY ======= */}
      <div className="content-grid">
        {/* HERO LEFT: spans columns 1–2 */}
        <section className="hero-left">
          <div className="hero-amount">
            {usd.format(summary.payment)} <span className="unit">/mo</span>
          </div>
          <p className="hero-sub">Estimated monthly payment</p>
          <button className="btn primary">See details</button>
        </section>

        {/* HERO RIGHT: the three mini-cards aligned with right column */}
        <aside className="hero-right">
          <div className="mini-card">
            <div className="mini-label">Financed amount</div>
            <div className="mini-value">{usd.format(financedAmount)}</div>
          </div>
          <div className="mini-card">
            <div className="mini-label">APR</div>
            <div className="mini-value">{cfg.apr.toFixed(3)}%</div>
          </div>
          <div className="mini-card">
            <div className="mini-label">Total cost</div>
            <div className="mini-value">{usd.format(summary.totalCost)}</div>
          </div>
        </aside>

        {/* BODY: Left column (VIN) */}
        <section className="panel col-1">
          <div className="panel-head">
            <h3 className="panel-title">VIN Decoder</h3>
          </div>

          <div className="vin-row">
            <label className="field" style={{ margin: 0 }}>
              <span className="label">VIN</span>
              <input
                type="text"
                value={vin}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setVin(val);
                  if (vinError) setVinError(null);
                }}
                placeholder="Enter 17-char VIN (e.g., 1HGCM82633A004352)"
                maxLength={17}
                spellCheck={false}
                aria-invalid={!!vinError}
              />
            </label>

            <button
              className="btn ghost"
              onClick={onDecodeVin}
              disabled={vinLoading || vin.trim().length !== 17}
              title={vin.trim().length !== 17 ? "VIN must be 17 characters" : ""}
              aria-busy={vinLoading}
            >
              {vinLoading ? "Decoding…" : "Decode VIN"}
            </button>
          </div>

          <div className="vin-samples">
            <button
              type="button"
              className="chip"
              onClick={() => setVin("1HGCM82633A004352")}
              title="Use sample VIN"
            >
              Try sample VIN
            </button>
          </div>

          {vinError && <p className="vin-error" role="alert">{String(vinError)}</p>}

          {vinInfo && (
            <div className="vin-card">
              <div className="vin-title">
                <div className="title">
                  {vinInfo.title ??
                    `${vinInfo.year ?? "—"} ${vinInfo.make ?? ""} ${vinInfo.model ?? ""}`.trim()}
                </div>
                <div className="sub">
                  VIN: <code>{vinInfo.vin}</code>
                  <button
                    className="copy"
                    onClick={() => navigator.clipboard.writeText(vinInfo.vin)}
                    title="Copy VIN"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {vinInfo.summary && <p className="vin-summary">{vinInfo.summary}</p>}

              <dl className="vin-kv">
                <dt>Year</dt><dd>{vinInfo.year ?? "—"}</dd>
                <dt>Make</dt><dd>{vinInfo.make ?? "—"}</dd>
                <dt>Model</dt><dd>{vinInfo.model ?? "—"}</dd>
                <dt>Trim</dt><dd>{vinInfo.trim ?? "—"}</dd>

                <dt>Body</dt><dd>{vinInfo.body ?? "—"}</dd>
                <dt>Doors</dt><dd>{vinInfo.doors ?? "—"}</dd>
                <dt>Drive</dt><dd>{vinInfo.drive ?? "—"}</dd>
                <dt>Transmission</dt><dd>{vinInfo.transmission ?? "—"}</dd>

                <dt>Fuel</dt><dd>{vinInfo.fuel ?? "—"}</dd>
                <dt>Cylinders</dt><dd>{vinInfo.cylinders ?? "—"}</dd>
                <dt>Displacement (L)</dt><dd>{vinInfo.displacement ?? "—"}</dd>
                <dt>Engine HP</dt><dd>{vinInfo.engineHp ?? "—"}</dd>

                <dt>MSRP</dt><dd>{vinInfo.msrp != null ? `$${vinInfo.msrp.toLocaleString()}` : "—"}</dd>
              </dl>
            </div>
          )}
        </section>

        {/* BODY: Center column (Vehicle & Pricing) */}
        <section className="panel col-2">
          <div className="panel-head">
            <h3 className="panel-title">Vehicle & Pricing</h3>
          </div>

          <NumberField
            label="Vehicle price"
            value={cfg.price}
            onChange={(v) => { setCfg({ ...cfg, price: v }); setPriceDirty(true); }}
          />
          <NumberField
            label="Down payment"
            value={cfg.down}
            onChange={(v) => setCfg({ ...cfg, down: v })}
          />

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
                onChange={(e) => setCfg({ ...cfg, taxRule: e.target.value as LoanConfig["taxRule"] })}
              >
                <option value="price_minus_tradein">Tax price − trade-in</option>
                <option value="price_full">Tax full price</option>
              </select>
            </label>
          </div>
        </section>

        {/* BODY: Right column (Decision + Charts) */}
        <section className="right-col col-3">
          <div className="mini-card">
            <div className="mini-label">Decision</div>
            <div className={`badge ${evalLoading ? "" : approved ? "ok" : "bad"}`}>
              {evalLoading ? "Calculating…" : approved ? "APPROVED" : "DECLINED"}
            </div>
            <div className="mini-grid">
              <div><span>LTV</span><strong>{pct(evalResult?.features.ltv ?? 0)}</strong></div>
              <div><span>DTI</span><strong>{pct(evalResult?.features.dti ?? 0)}</strong></div>
              <div><span>PD</span><strong>{pct(evalResult?.risk.pd ?? 0)} <small>conf {pct(evalResult?.risk.confidence ?? 0)}</small></strong></div>
            </div>
            {evalError && <p className="vin-error">{evalError}</p>}
          </div>

          <div className="mini-card">
            <div className="mini-label">Interest vs. Principal</div>
            <div className="chart-box donut">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Principal", value: financedAmount },
                      { name: "Interest", value: summary.totalInterest },
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
                    contentStyle={{
                      background: "#0c1426",
                      border: "1px solid #30363d",
                      color: "#c9d1d9",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mini-card">
            <div className="mini-label">Remaining Balance</div>
            <div className="chart-box line">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={schedule.map((r) => ({ month: r.period, balance: r.balance }))}
                  margin={{ top: 6, right: 12, left: -10, bottom: 0 }}
                >
                  <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fill: "#8b949e", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#8b949e", fontSize: 12 }} />
                  <Tooltip
                    formatter={(v: any) => usd.format(v as number)}
                    labelFormatter={(l) => `Month ${l}`}
                    contentStyle={{
                      background: "#0c1426",
                      border: "1px solid #30363d",
                      color: "#c9d1d9",
                    }}
                  />
                  <Line type="monotone" dataKey="balance" stroke="#58a6ff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>

      {/* -------- Amortization (full width) -------- */}
      <section className="panel wide">
        <div className="panel-head">
          <h3 className="panel-title">Amortization schedule</h3>
        </div>
        <div className="amort-wrap">
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
              {schedule.map((r) => (
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
      </section>
    </div>
  );
}
