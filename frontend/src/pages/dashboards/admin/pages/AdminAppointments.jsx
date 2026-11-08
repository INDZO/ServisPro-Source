import { useEffect, useMemo, useState } from "react";
import { AdminApi } from "../../../../api/adminApi";
import "../../../../styles/adminPages.css";

function get(o, ...keys) {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
}

function normAppt(x) {
  return {
    appointmentId: get(x, "appointmentId", "AppointmentId", "id", "Id"),
    serviceName: String(get(x, "serviceName", "ServiceName") ?? ""),
    clientName: String(get(x, "clientName", "ClientName") ?? ""),
    clientEmail: String(get(x, "clientEmail", "ClientEmail") ?? ""),
    appointmentDate: get(x, "appointmentDate", "AppointmentDate"),
    appointmentTime: String(get(x, "appointmentTime", "AppointmentTime") ?? ""),
    status: String(get(x, "status", "Status") ?? ""),
    description: String(get(x, "description", "Description") ?? ""),
  };
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString();
}

function fmtDateTime(d, t) {
  const date = fmtDate(d);
  const time = (t || "").trim();
  return time ? `${date} • ${time}` : date;
}

function statusLabel(s) {
  const raw = String(s ?? "").trim();
  if (!raw) return "—";

  const map = {
    Requested: "Na čekanju",
    Accepted: "Prihvaćen",
    InService: "U servisu",
    InProgress: "U radu",
    Completed: "Završen",
    Canceled: "Otkazan",
    Cancelled: "Otkazan",
    Rejected: "Odbijen",
  };

  const normalized =
    raw === "0" ? "Requested" :
    raw === "1" ? "Accepted" :
    raw === "2" ? "InService" :
    raw === "3" ? "InProgress" :
    raw === "4" ? "Completed" :
    raw === "5" ? "Canceled" :
    raw === "6" ? "Rejected" :
    raw;

  if (map[normalized]) return map[normalized];

  const v = normalized.toLowerCase();
  if (v.includes("request") || v.includes("pending") || v.includes("na") || v.includes("ceka")) return "Na čekanju";
  if (v.includes("accept") || v.includes("odob") || v.includes("approve")) return "Prihvaćen";
  if (v.includes("inservice") || v.includes("servis")) return "U servisu";
  if (v.includes("progress") || v.includes("work") || v.includes("rad")) return "U radu";
  if (v.includes("complete") || v.includes("finish") || v.includes("zavr")) return "Završen";
  if (v.includes("cancel") || v.includes("otkaz")) return "Otkazan";
  if (v.includes("reject") || v.includes("odbi")) return "Odbijen";

  return normalized;
}

export default function AdminAppointments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await AdminApi.getAppointments();
      const list = Array.isArray(data) ? data.map(normAppt) : [];
      list.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
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
    return items.filter((a) => {
      const who = [a.clientName, a.clientEmail].join(" ").toLowerCase();
      return (
        a.serviceName.toLowerCase().includes(s) ||
        who.includes(s) ||
        statusLabel(a.status).toLowerCase().includes(s) ||
        String(a.description || "").toLowerCase().includes(s)
      );
    });
  }, [items, q]);

  async function onDelete(a) {
    if (!a?.appointmentId) return;
    const title = `${a.serviceName || "Servis"} — ${a.clientName || "Klijent"} — ${fmtDateTime(a.appointmentDate, a.appointmentTime)}`;
    if (!window.confirm(`Obrisati termin?\n${title}`)) return;

    setBusyId(a.appointmentId);
    setErr("");
    try {
      await AdminApi.deleteAppointment(a.appointmentId);
      setItems((prev) => prev.filter((x) => x.appointmentId !== a.appointmentId));
    } catch (e) {
      setErr(e?.message || "Greška pri brisanju termina.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2 className="admin-page-title">Termini</h2>
          <p className="admin-page-sub">Naziv servisa + klijent (ime/email) + datum/vreme + status.</p>
        </div>

        <div className="admin-actions">
          <input
            className="admin-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pretraga: servis, klijent, email, status, opis…"
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
                <th style={{ width: 170 }}>Datum/Vreme</th>
                <th style={{ width: 140 }}>Status</th>
                <th>Opis</th>
                <th style={{ width: 160 }}>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const busy = busyId === a.appointmentId;
                const client = [a.clientName, a.clientEmail ? `(${a.clientEmail})` : ""].filter(Boolean).join(" ");
                return (
                  <tr key={a.appointmentId || `${a.serviceName}-${a.clientEmail}-${a.appointmentDate}`}>
                    <td>{a.serviceName || "—"}</td>
                    <td>{client || "—"}</td>
                    <td>{fmtDateTime(a.appointmentDate, a.appointmentTime)}</td>
                    <td>{statusLabel(a.status)}</td>
                    <td>{a.description || "—"}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="admin-btn admin-btn--danger" onClick={() => onDelete(a)} disabled={busy}>
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
