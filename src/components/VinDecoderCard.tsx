import { useState } from "react";
import { decodeVin, type VinInfo, show } from "../lib/vehicle";

export default function VinDecoderCard() {
  const [vinInput, setVinInput] = useState("");
  const [vehicle, setVehicle] = useState<VinInfo | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onDecode() {
    setLoading(true);
    setErr(null);
    try {
      const { vehicle, meta } = await decodeVin(vinInput.trim());
      setVehicle(vehicle);
      setMeta(meta ?? null);
    } catch (e: any) {
      setErr(e?.message || "Failed to decode VIN");
      setVehicle(null);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  function trySample() {
    setVinInput("1HGCM82633A004352"); // sample VIN
  }

  return (
    <div className="panel">
      <div className="row" style={{ gap: 8 }}>
        <input
          value={vinInput}
          onChange={(e) => setVinInput(e.target.value.toUpperCase())}
          placeholder="Enter 17-char VIN"
          maxLength={17}
        />
        <button onClick={onDecode} disabled={loading || vinInput.length !== 17}>
          {loading ? "Decoding…" : "Decode VIN"}
        </button>
        <button onClick={trySample} disabled={loading}>Try sample VIN</button>
      </div>

      {err && <div className="error">{err}</div>}

      {vehicle && (
        <div className="card">
          <h3>— {vehicle.make ? `${vehicle.make} ${vehicle.model ?? ""}`.trim() : "Vehicle"}</h3>
          <div className="vin">VIN: {show(vehicle.vin)}</div>

          <ul className="specs">
            <li><b>Year</b> {show(vehicle.year)}</li>
            <li><b>Make</b> {show(vehicle.make)}</li>
            <li><b>Model</b> {show(vehicle.model)}</li>
            <li><b>Trim</b> {show(vehicle.trim)}</li>
            <li><b>Body</b> {show(vehicle.body)}</li>
            <li><b>Doors</b> {show(vehicle.doors)}</li>
            <li><b>Drive</b> {show(vehicle.drive)}</li>
            <li><b>Transmission</b> {show(vehicle.transmission)}</li>
            <li><b>Fuel</b> {show(vehicle.fuel)}</li>
            <li><b>Cylinders</b> {show(vehicle.cylinders)}</li>
            <li><b>Displacement (L)</b> {show(vehicle.displacement)}</li>
            <li><b>Engine HP</b> {show(vehicle.engineHp)}</li>
            <li><b>Manufacturer</b> {show(vehicle.manufacturer)}</li>
            <li><b>Plant Country</b> {show(vehicle.plantCountry)}</li>
            <li><b>MSRP</b> {vehicle.msrp != null ? `$${vehicle.msrp}` : "—"}</li>
          </ul>

          {meta?.ai?.attempted && (
            <div className="ai-note">
              {meta.ai.ok ? "AI Enriched ✓" : "AI enrichment unavailable"}
              {meta.ai.model ? ` (${meta.ai.model})` : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
