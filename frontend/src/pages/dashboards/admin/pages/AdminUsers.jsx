import { useEffect, useMemo, useState } from "react";
import { AdminApi } from "../../../../api/adminApi";
import "../../../../styles/adminPages.css";

function get(o, ...keys) {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
}

function normUser(u) {
  return {
    userId: get(u, "userId", "UserId", "id", "Id"),
    email: String(get(u, "email", "Email") ?? ""),
    role: String(get(u, "role", "Role") ?? ""),
    isApproved: Boolean(get(u, "isApproved", "IsApproved")),
  };
}

const ROLE_OPTIONS = [
  { value: "", label: "Sve uloge" },
  { value: "Client", label: "Klijenti" },
  { value: "Service", label: "Servisi" },
  { value: "Admin", label: "Admin" },
];

function roleLabel(value) {
  const v = String(value ?? "").trim();
  const normalized = v === "0" ? "Client" : v === "1" ? "Service" : v === "2" ? "Admin" : v;
  const opt = ROLE_OPTIONS.find((o) => o.value === normalized);
  return opt?.label || normalized || "—";
}

export default function AdminUsers() {
  const [role, setRole] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await AdminApi.getUsers(role || undefined);
      setItems(Array.isArray(data) ? data.map(normUser) : []);
    } catch (e) {
      setErr(e?.message || "Greška pri učitavanju.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [role]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => {
      const roleText = roleLabel(x.role).toLowerCase();
      return x.email.toLowerCase().includes(s) || roleText.includes(s) || String(x.role || "").toLowerCase().includes(s);
    });
  }, [items, q]);

  async function onDelete(u) {
    if (!u?.userId) return;
    if (!window.confirm(`Obrisati korisnika: ${u.email}?`)) return;

    const reason = window.prompt(`Razlog brisanja (opciono):\n${u.email}`, "");
    if (reason === null) return;

    setBusyId(u.userId);
    setErr("");
    try {
      await AdminApi.deleteUser(u.userId, reason);
      setItems((prev) => prev.filter((x) => x.userId !== u.userId));
    } catch (e) {
      setErr(e?.message || "Greška pri brisanju.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2 className="admin-page-title">Korisnici</h2>
          <p className="admin-page-sub">Primarno po email-u i ulozi (ID je interna stvar).</p>
        </div>

        <div className="admin-actions">
          <select className="admin-input" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <input
            className="admin-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pretraga: email ili uloga"
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
        <div className="admin-alert" style={{ marginTop: 12 }}>Nema rezultata.</div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th style={{ width: 120 }}>Uloga</th>
                <th style={{ width: 120 }}>Odobren</th>
                <th style={{ width: 160 }}>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const busy = busyId === u.userId;
                return (
                  <tr key={u.userId || u.email}>
                    <td>{u.email || "—"}</td>
                    <td>{roleLabel(u.role)}</td>
                    <td>{u.isApproved ? "Da" : "Ne"}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="admin-btn admin-btn--danger" onClick={() => onDelete(u)} disabled={busy}>
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