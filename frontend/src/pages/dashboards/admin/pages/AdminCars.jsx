import { useEffect, useMemo, useState } from "react";
import { AdminApi } from "../../../../api/adminApi";
import "../../../../styles/adminPages.css";

function get(o, ...keys) {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
}

function normCar(x) {
  return {
    carId: get(x, "carId", "CarId", "id", "Id"),
    vin: String(get(x, "vin", "VIN") ?? ""),
    year: Number(get(x, "year", "Year") ?? 0),
    brandName: String(get(x, "brandName", "BrandName") ?? ""),
    modelName: String(get(x, "modelName", "ModelName") ?? ""),
    clientId: get(x, "clientId", "ClientId"),
    clientName: String(get(x, "clientName", "ClientName") ?? ""),
    clientEmail: String(get(x, "clientEmail", "ClientEmail") ?? ""),
  };
}

function carLabel(c) {
  const make = [c.brandName, c.modelName].filter(Boolean).join(" ");
  const bits = [];
  if (make) bits.push(make);
  if (c.year) bits.push(String(c.year));
  if (c.vin) bits.push(`VIN: ${c.vin}`);
  return bits.join(" • ") || "Vozilo";
}

export default function AdminCars() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await AdminApi.getCars();
      const list = Array.isArray(data) ? data.map(normCar) : [];
      setItems(list);
    } catch (e) {
      setErr(e?.message || "Greška pri učitavanju.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((c) => {
      return (
        carLabel(c).toLowerCase().includes(s) ||
        c.clientName.toLowerCase().includes(s) ||
        c.clientEmail.toLowerCase().includes(s)
      );
    });
  }, [items, q]);

  async function onDelete(c) {
    if (!c?.carId) return;
    if (!window.confirm(`Obrisati vozilo: ${carLabel(c)}?`)) return;

    setBusyId(c.carId);
    setErr("");
    try {
      await AdminApi.deleteCar(c.carId);
      setItems((prev) => prev.filter((x) => x.carId !== c.carId));
    } catch (e) {
      setErr(e?.message || "Greška pri brisanju vozila.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2 className="admin-page-title">Vozila</h2>
          <p className="admin-page-sub">Prikaz vozila sa vlasnikom (ime + email).</p>
        </div>

        <div className="admin-actions">
          <input
            className="admin-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pretraga: marka/model/VIN ili klijent/email…"
          />
          <button className="admin-btn admin-btn--primary" onClick={load} disabled={loading}>
            Osveži
          </button>
        </div>
      </div>

      {err ? <div className="admin-alert admin-alert--error">{err}</div> : null}

      {loading ? (
        <div className="admin-alert" style={{ marginTop: 12 }}>
          Učitavanje…
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-alert" style={{ marginTop: 12 }}>
          Nema podataka.
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Vozilo</th>
                <th>Vlasnik</th>
                <th style={{ width: 160 }}>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const busy = busyId === c.carId;
                const owner = [c.clientName, c.clientEmail ? `(${c.clientEmail})` : ""].filter(Boolean).join(" ");
                return (
                  <tr key={c.carId || c.vin || `${c.brandName}-${c.modelName}-${c.clientEmail}`}>
                    <td>{carLabel(c)}</td>
                    <td>{owner || "—"}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="admin-btn admin-btn--danger" onClick={() => onDelete(c)} disabled={busy}>
                          {busy ? "Brisanje…" : "Obriši"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}