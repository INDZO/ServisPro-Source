import { useEffect, useMemo, useState } from "react";
import { AdminApi } from "../../../../api/adminApi";
import "../../../../styles/adminPages.css";

function get(o, ...keys) {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
}

function normType(x) {
  return {
    id: get(x, "id", "Id"),
    name: String(get(x, "name", "Name") ?? ""),
  };
}

export default function AdminServiceTypes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const [newName, setNewName] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await AdminApi.getServiceTypes();
      const list = Array.isArray(data) ? data.map(normType).sort((a, b) => a.name.localeCompare(b.name)) : [];
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
    return items.filter((x) => x.name.toLowerCase().includes(s));
  }, [items, q]);

  async function add() {
    const name = newName.trim();
    if (!name) return;

    setErr("");
    setBusyId("new");
    try {
      const created = await AdminApi.createServiceType(name);
      const c = normType(created);
      setItems((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
    } catch (e) {
      setErr(e?.message || "Greška pri dodavanju.");
    } finally {
      setBusyId(null);
    }
  }

  async function rename(it) {
    const name = window.prompt("Novi naziv tipa usluge:", it.name);
    if (!name) return;

    setErr("");
    setBusyId(it.id);
    try {
      await AdminApi.updateServiceType(it.id, name.trim());
      setItems((prev) =>
        prev
          .map((x) => (x.id === it.id ? { ...x, name: name.trim() } : x))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (e) {
      setErr(e?.message || "Greška pri izmeni.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(it) {
    if (!window.confirm(`Obrisati tip usluge "${it.name}"?`)) return;

    setErr("");
    setBusyId(it.id);
    try {
      await AdminApi.deleteServiceType(it.id);
      setItems((prev) => prev.filter((x) => x.id !== it.id));
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
          <h2 className="admin-page-title">Tipovi usluga</h2>
          <p className="admin-page-sub">Šifarnik tipova usluga (dodaj/izmeni/obriši).</p>
        </div>

        <div className="admin-actions">
          <input
            className="admin-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pretraga tipova…"
          />
          <button className="admin-btn admin-btn--primary" onClick={load} disabled={loading}>
            Osveži
          </button>
        </div>
      </div>

      {err ? <div className="admin-alert admin-alert--error">{err}</div> : null}

      <div className="admin-card" style={{ marginTop: 12 }}>
        <div className="admin-card-top">
          <h3 className="admin-card-title">Dodaj novi tip</h3>
          <span className="admin-pill">{items.length}</span>
        </div>

        <div className="admin-actions">
          <input
            className="admin-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Npr. Mali servis"
          />
          <button className="admin-btn admin-btn--primary" onClick={add} disabled={busyId === "new"}>
            {busyId === "new" ? "Dodavanje…" : "Dodaj"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-alert" style={{ marginTop: 12 }}>
          Učitavanje…
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-alert" style={{ marginTop: 12 }}>
          Nema tipova usluga.
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Naziv</th>
                <th style={{ width: 220 }}>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const busy = busyId === it.id;
                return (
                  <tr key={it.id || it.name}>
                    <td>{it.name}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="admin-btn" onClick={() => rename(it)} disabled={busy}>
                          {busy ? "…" : "Izmeni"}
                        </button>
                        <button className="admin-btn admin-btn--danger" onClick={() => remove(it)} disabled={busy}>
                          {busy ? "…" : "Obriši"}
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