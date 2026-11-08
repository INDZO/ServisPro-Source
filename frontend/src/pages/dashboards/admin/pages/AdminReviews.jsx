import { useEffect, useMemo, useState } from "react";
import { AdminApi } from "../../../../api/adminApi";
import "../../../../styles/adminPages.css";

function get(o, ...keys) {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
}

function normReview(x) {
  return {
    reviewId: get(x, "reviewId", "ReviewId", "id", "Id"),
    serviceName: String(get(x, "serviceName", "ServiceName") ?? ""),
    clientName: String(get(x, "clientName", "ClientName") ?? ""),
    clientEmail: String(get(x, "clientEmail", "ClientEmail") ?? ""),
    rating: Number(get(x, "rating", "Rating") ?? 0),
    comment: String(get(x, "comment", "Comment") ?? ""),
    reviewDate: get(x, "reviewDate", "ReviewDate"),
  };
}

function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString();
}

export default function AdminReviews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await AdminApi.getReviews();
      const list = Array.isArray(data) ? data.map(normReview) : [];
      list.sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());
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
    return items.filter((r) => {
      const who = [r.clientName, r.clientEmail].join(" ").toLowerCase();
      return (
        r.serviceName.toLowerCase().includes(s) ||
        who.includes(s) ||
        String(r.comment || "").toLowerCase().includes(s)
      );
    });
  }, [items, q]);

  async function onDelete(r) {
    if (!r?.reviewId) return;
    const title = `${r.serviceName || "Servis"} — ${r.clientName || "Klijent"} — ${r.rating}/5`;
    if (!window.confirm(`Obrisati recenziju?\n${title}`)) return;

    setBusyId(r.reviewId);
    setErr("");
    try {
      await AdminApi.deleteReview(r.reviewId);
      setItems((prev) => prev.filter((x) => x.reviewId !== r.reviewId));
    } catch (e) {
      setErr(e?.message || "Greška pri brisanju recenzije.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2 className="admin-page-title">Recenzije</h2>
          <p className="admin-page-sub">Servis naziv + klijent (ime/email) + ocena + komentar + datum.</p>
        </div>

        <div className="admin-actions">
          <input
            className="admin-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pretraga: servis, klijent, email, komentar…"
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
                <th>Klijent</th>
                <th style={{ width: 90 }}>Ocena</th>
                <th>Komentar</th>
                <th style={{ width: 190 }}>Datum</th>
                <th style={{ width: 160 }}>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const busy = busyId === r.reviewId;
                const client = [r.clientName, r.clientEmail ? `(${r.clientEmail})` : ""].filter(Boolean).join(" ");
                return (
                  <tr key={r.reviewId || `${r.serviceName}-${r.clientEmail}-${r.reviewDate}`}>
                    <td>{r.serviceName || "—"}</td>
                    <td>{client || "—"}</td>
                    <td>{Number.isFinite(r.rating) ? r.rating : "—"}</td>
                    <td title={r.comment || ""}>{r.comment || "—"}</td>
                    <td>{fmtDateTime(r.reviewDate)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="admin-btn admin-btn--danger" onClick={() => onDelete(r)} disabled={busy}>
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