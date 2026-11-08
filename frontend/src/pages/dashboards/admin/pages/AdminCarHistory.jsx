import { useEffect, useMemo, useState } from "react";
import { AdminApi } from "../../../../api/adminApi";
import "../../../../styles/adminPages.css";

function get(o, ...keys) {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
}

function normHist(x) {
  return {
    carHistoryId: get(x, "carHistoryId", "CarHistoryId", "id", "Id"),
    carLabel: String(get(x, "carLabel", "CarLabel") ?? ""),
    clientName: String(get(x, "clientName", "ClientName") ?? ""),
    clientEmail: String(get(x, "clientEmail", "ClientEmail") ?? ""),
    serviceName: String(get(x, "serviceName", "ServiceName") ?? ""),
    serviceDate: get(x, "serviceDate", "ServiceDate"),
    mileage: get(x, "mileage", "Mileage"),
    title: String(get(x, "title", "Title") ?? ""),
    description: String(get(x, "description", "Description") ?? ""),
  };
}

function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString();
}

export default function AdminCarHistory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await AdminApi.getCarHistory();
      const list = Array.isArray(data) ? data.map(normHist) : [];
      list.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
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
    return items.filter((h) => {
      const owner = [h.clientName, h.clientEmail].join(" ").toLowerCase();
      return (
        h.serviceName.toLowerCase().includes(s) ||
        h.carLabel.toLowerCase().includes(s) ||
        owner.includes(s) ||
        String(h.title || "").toLowerCase().includes(s) ||
        String(h.description || "").toLowerCase().includes(s)
      );
    });
  }, [items, q]);

  async function onDelete(h) {
    if (!h?.carHistoryId) return;
    const title = `${h.serviceName || "Servis"} — ${h.carLabel || "Vozilo"} — ${fmtDateTime(h.serviceDate)}`;
    if (!window.confirm(`Obrisati servisnu evidenciju?\n${title}`)) return;

    setBusyId(h.carHistoryId);
    setErr("");
    try {
      await AdminApi.deleteCarHistory(h.carHistoryId);
      setItems((prev) => prev.filter((x) => x.carHistoryId !== h.carHistoryId));
    } catch (e) {
      setErr(e?.message || "Greška pri brisanju evidencije.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2 className="admin-page-title">Servisna evidencija</h2>
          <p className="admin-page-sub">Servis + vozilo + vlasnik + datum + km + opis.</p>
        </div>

        <div className="admin-actions">
          <input
            className="admin-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pretraga: servis, vozilo, vlasnik, naslov, opis…"
          />
          <button className="admin-btn admin-btn--primary" onClick={load} disabled={loading}>
            Osveži
          </button>
        </div>
      </div>

      {err ? <div className="admin-alert admin-alert--error">{err}</div> : null}

      {loading ? (
        <div className="admin-alert" style={{ marginTop: 12 }}>Učitavanje…</div>
      ) : filtered.length === 0 ? (
        <div className="admin-alert" style={{ marginTop: 12 }}>Nema podataka.</div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Servis</th>
                <th>Vozilo</th>
                <th>Vlasnik</th>
                <th style={{ width: 190 }}>Datum</th>
                <th style={{ width: 90 }}>Km</th>
                <th>Naslov</th>
                <th style={{ width: 160 }}>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => {
                const busy = busyId === h.carHistoryId;
                const owner = [h.clientName, h.clientEmail ? `(${h.clientEmail})` : ""].filter(Boolean).join(" ");
                return (
                  <tr key={h.carHistoryId || `${h.serviceName}-${h.carLabel}-${h.serviceDate}`}>
                    <td>{h.serviceName || "—"}</td>
                    <td>{h.carLabel || "—"}</td>
                    <td>{owner || "—"}</td>
                    <td>{fmtDateTime(h.serviceDate)}</td>
                    <td>{h.mileage ?? "—"}</td>
                    <td title={h.description || ""}>{h.title || "—"}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="admin-btn admin-btn--danger" onClick={() => onDelete(h)} disabled={busy}>
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
