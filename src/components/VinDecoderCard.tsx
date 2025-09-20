import { useState } from "react";
import type { VinInfo } from "../lib/vin";
import { decodeVin } from "../lib/vin";

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function VinDecoderCard({
  onPriceFromMsrp,
  onDecoded,
}: {
  onPriceFromMsrp?: (price: number) => void;
  onDecoded?: (info: VinInfo) => void;
}) {
  const [vin, setVin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<VinInfo | null>(null);

  async function onDecode() {
    if (!vin || vin.length !== 17) {
      setError("VIN must be 17 characters");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await decodeVin(vin.trim().toUpperCase());
      setInfo(data);
      onDecoded?.(data);
      if (data.msrp && onPriceFromMsrp) onPriceFromMsrp(data.msrp);
    } catch (e: any) {
      setInfo(null);
      setError(e?.message ?? "Failed to decode VIN");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel area-vin">
      <h2>Vin Decoder</h2>

      <label className="field">
        <span className="label">VIN</span>
        <input
          value={vin}
          onChange={(e) => setVin(e.target.value.toUpperCase())}
          placeholder="Enter VIN (e.g., 1HGCM82633A004352)"
        />
      </label>

      <button className="ghost primary vin-btn" onClick={onDecode} disabled={loading || !vin}>
        {loading ? "Decoding…" : "DECODE VIN"}
      </button>

      {error && <p className="vin-error" style={{ color: "#fda4a4", marginTop: 8 }}>{error}</p>}

      {info && (
        <div style={{ marginTop: 12, lineHeight: 1.4 }}>
          <div style={{ fontWeight: 600 }}>
            {info.title || [info.year, info.make, info.model, info.trim].filter(Boolean).join(" ")}
          </div>
          <div className="muted">
            {info.bodyClass ?? ""}{info.bodyClass ? " • " : ""}
            {info.fuelType ?? ""}{info.fuelType ? " • " : ""}
            {info.engineCylinders ? `${info.engineCylinders}-cyl` : ""}
            {info.displacementL ? ` ${info.displacementL}L` : ""}
            {info.engineHP ? ` • ${info.engineHP} HP` : ""}
          </div>
          {info.msrp != null && (
            <div className="muted">MSRP: <strong>{usd.format(info.msrp)}</strong></div>
          )}
          {info.summary && <p style={{ marginTop: 8 }}>{info.summary}</p>}
        </div>
      )}
    </section>
  );
}
