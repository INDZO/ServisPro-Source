import { useEffect, useMemo, useState } from "react";
import { AdminApi } from "../../../../api/adminApi";
import "../../../../styles/adminPages.css";

function get(o, ...keys) {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
}

function normPending(x) {
  return {
    serviceId: get(x, "serviceId", "ServiceId", "id", "Id"),
    name: String(get(x, "name", "Name") ?? ""),
    city: String(get(x, "city", "City") ?? ""),
    pib: String(get(x, "pib", "PIB") ?? ""),
    ownerFullName: String(get(x, "ownerFullName", "OwnerFullName") ?? ""),
    email: String(get(x, "email", "Email") ?? ""),
  };
}

export default function AdminPendingServices() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await AdminApi.getPendingServices();
      const list = Array.isArray(data) ? data.map(normPending) : [];
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
    return items.filter((x) => {
      return (
        x.name.toLowerCase().includes(s) ||
        x.city.toLowerCase().includes(s) ||
        x.email.toLowerCase().includes(s) ||
        x.ownerFullName.toLowerCase().includes(s) ||
        x.pib.toLowerCase().includes(s)
      );
    });
  }, [items, q]);

  async function approve(item) {
    if (!item?.serviceId) return;
    setBusyId(item.serviceId);
    setErr("");
    try {
      await AdminApi.approveService(item.serviceId);
      setItems((prev) => prev.filter((x) => x.serviceId !== item.serviceId));
    } catch (e) {
      setErr(e?.message || "Greška pri odobravanju.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(item) {
    if (!item?.serviceId) return;

    const reason = window.prompt(
      `Razlog odbijanja (opciono):\n${item.name}${item.email ? ` (${item.email})` : ""}`,
      ""
    );
    if (reason === null) {
      return;
    }

    setBusyId(item.serviceId);
    setErr("");
    try {
      await AdminApi.rejectService(item.serviceId, reason);
      setItems((prev) => prev.filter((x) => x.serviceId !== item.serviceId));
    } catch (e) {
      setErr(e?.message || "Greška pri odbijanju.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2 className="admin-page-title">Odobravanje servisa</h2>
          <p className="admin-page-sub">
            Servisi na čekanju se prikazuju kao kartice.
          </p>
        </div>

        <div className="admin-actions">
          <input
            className="admin-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pretraga: naziv, grad, email, vlasnik, PIB…"
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
          Trenutno nema servisa na čekanju.
        </div>
      ) : (
        <div className="admin-grid" style={{ marginTop: 12 }}>
          {filtered.map((s) => {
            const busy = busyId === s.serviceId;

            return (
              <div className="admin-card" key={s.serviceId || s.email || s.name}>
                <div className="admin-card-top">
                  <div>
                    <h3 className="admin-card-title">{s.name || "(bez naziva)"}</h3>
                    <div className="admin-muted">
                      {s.city || "—"}
                      {s.email ? ` • ${s.email}` : ""}
                    </div>
                  </div>
                  <span className="admin-pill">Na čekanju</span>
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
                    className="admin-btn admin-btn--approve"
                    onClick={() => approve(s)}
                    disabled={busy}
                    title="Odobri servis"
                  >
                    {busy ? "Obrada…" : "Odobri"}
                  </button>

                  <button
                    className="admin-btn admin-btn--reject"
                    onClick={() => reject(s)}
                    disabled={busy}
                    title="Odbij servis"
                  >
                    {busy ? "Obrada…" : "Odbij"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}