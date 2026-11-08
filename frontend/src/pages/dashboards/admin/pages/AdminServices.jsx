import { useEffect, useMemo, useState } from "react";
import { AdminApi } from "../../../../api/adminApi";
import "../../../../styles/adminPages.css";

function get(o, ...keys) {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
}

function normService(x) {
  return {
    serviceId: get(x, "serviceId", "ServiceId", "id", "Id"),
    name: String(get(x, "name", "Name") ?? ""),
    city: String(get(x, "city", "City") ?? ""),
    pib: String(get(x, "pib", "PIB") ?? ""),
    ownerFullName: String(get(x, "ownerFullName", "OwnerFullName") ?? ""),
    email: String(get(x, "email", "Email") ?? ""),
    isActive: Boolean(get(x, "isActive", "IsActive")),
    isApproved: Boolean(get(x, "isApproved", "IsApproved")),
  };
}

export default function AdminServices() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await AdminApi.getServices();
      setItems(Array.isArray(data) ? data.map(normService) : []);
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
    return items.filter((x) => {
      return (
        x.name.toLowerCase().includes(s) ||
        x.city.toLowerCase().includes(s) ||
        x.email.toLowerCase().includes(s) ||
        x.ownerFullName.toLowerCase().includes(s)
      );
    });
  }, [items, q]);

  async function toggleActive(svc) {
    const id = svc.serviceId;
    if (!id) return;

    const actionLabel = svc.isActive ? "deaktivacije" : "aktivacije";
    const reason = window.prompt(
      `Napomena / razlog ${actionLabel} (opciono):\n${svc.name}${svc.email ? ` (${svc.email})` : ""}`,
      ""
    );
    if (reason === null) return;

    setBusyId(id);
    setErr("");
    try {
      if (svc.isActive) await AdminApi.deactivateService(id, reason);
      else await AdminApi.activateService(id, reason);
      await load();
    } catch (e) {
      setErr(e?.message || "Greška.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2 className="admin-page-title">Servisi</h2>
          <p className="admin-page-sub">Pregled statusa (odobren/aktivan) i aktivacija/deaktivacija.</p>
        </div>

        <div className="admin-actions">
          <input
            className="admin-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pretraga: naziv, grad, email, vlasnik…"
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
        <div className="admin-grid" style={{ marginTop: 12 }}>
          {filtered.map((s) => {
            const busy = busyId === s.serviceId;
            const approvedPill = s.isApproved ? "admin-pill admin-pill--green" : "admin-pill admin-pill--red";
            const activePill = s.isActive ? "admin-pill admin-pill--green" : "admin-pill admin-pill--red";

            return (
              <div className="admin-card" key={s.serviceId || s.email || s.name}>
                <div className="admin-card-top">
                  <div>
                    <h3 className="admin-card-title">{s.name || "(bez naziva)"}</h3>
                    <div className="admin-muted">{s.city || "—"}{s.email ? ` • ${s.email}` : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className={approvedPill}>{s.isApproved ? "Odobren" : "Nije odobren"}</span>
                    <span className={activePill}>{s.isActive ? "Aktivan" : "Neaktivan"}</span>
                  </div>
                </div>

                <dl className="admin-kv">
                  <div className="admin-kv-row">
                    <dt className="admin-kv-k">Vlasnik</dt>
                    <dd className="admin-kv-v">{s.ownerFullName || "—"}</dd>
                  </div>
                  <div className="admin-kv-row">
                    <dt className="admin-kv-k">PIB</dt>
                    <dd className="admin-kv-v">{s.pib || "—"}</dd>
                  </div>
                </dl>

                <div className="admin-card-actions">
                  <button
                    className="admin-btn"
                    onClick={() => toggleActive(s)}
                    disabled={busy}
                    title={s.isActive ? "Deaktiviraj servis" : "Aktiviraj servis"}
                  >
                    {busy ? "Obrada…" : (s.isActive ? "Deaktiviraj" : "Aktiviraj")}
                  </button>
                  <div />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}