import { useEffect, useMemo, useState } from "react";
import { ServiceCarHistoryApi } from "../../../../api/serviceCarHistoryApi";
import "../../../../styles/clientCars.css"; 
import "../../../../styles/serviceWorkHistory.css";

function get(o, ...keys) {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
}

function norm(x) {
  return {
    id: get(x, "id", "Id"),
    carId: get(x, "carId", "CarId"),
    vin: String(get(x, "carVin", "CarVin", "vin", "VIN") ?? ""),
    brand: String(get(x, "carBrand", "CarBrand") ?? ""),
    model: String(get(x, "carModel", "CarModel") ?? ""),
    appointmentId: get(x, "appointmentId", "AppointmentId"),
    serviceTypeId: get(x, "serviceTypeId", "ServiceTypeId"),
    serviceTypeName: String(get(x, "serviceTypeName", "ServiceTypeName") ?? ""),
    title: String(get(x, "title", "Title") ?? ""),
    description: String(get(x, "description", "Description") ?? ""),
    mileage: get(x, "mileage", "Mileage"),
    serviceDate: get(x, "serviceDate", "ServiceDate"),
    canUpdate: Boolean(get(x, "canUpdate", "CanUpdate")),
  };
}

function toTime(v) {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("sr-RS");
}

function fmtMileage(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? `${n.toLocaleString("sr-RS")} km` : "—";
}

export default function ServiceWorkHistory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [onlyUpdatable, setOnlyUpdatable] = useState(false);
  const [range, setRange] = useState("30"); 
  const [typeId, setTypeId] = useState("all");

  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", mileage: "" });
  const [mileageError, setMileageError] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await ServiceCarHistoryApi.listMyWork();
      const list = Array.isArray(data) ? data.map(norm) : [];
      list.sort((a, b) => toTime(b.serviceDate) - toTime(a.serviceDate));
      setItems(list);
    } catch (e) {
      setErr(e?.message || "Greška pri učitavanju urađenih poslova.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const serviceTypes = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const id = it.serviceTypeId;
      const name = it.serviceTypeName;
      if (id === undefined || id === null) continue;
      if (!map.has(String(id))) map.set(String(id), name || `Tip #${id}`);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "sr"));
  }, [items]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const now = Date.now();
    const days = range === "all" ? null : Number(range);
    const minT = days ? now - days * 24 * 60 * 60 * 1000 : null;

    return items.filter((it) => {
      if (onlyUpdatable && !it.canUpdate) return false;
      if (typeId !== "all" && String(it.serviceTypeId) !== String(typeId)) return false;

      const t = toTime(it.serviceDate);
      if (minT && t && t < minT) return false;

      if (!s) return true;

      const hay = [
        it.title,
        it.description,
        it.vin,
        it.brand,
        it.model,
        it.serviceTypeName,
        String(it.mileage ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [items, q, onlyUpdatable, range, typeId]);

  function openEdit(it) {
    setEditErr("");
    setMileageError("");
    setEditItem(it);
    setForm({
      title: it?.title || "",
      description: it?.description || "",
      mileage: it?.mileage ?? "",
    });
    setEditOpen(true);
  }


  function closeEdit() {
    if (editBusy) return;
    setEditOpen(false);
    setEditItem(null);
    setEditErr("");
  }

  async function onSave() {
    if (mileageError) return;
    if (!editItem?.id) return;
    setEditBusy(true);
    setEditErr("");
    try {
      const payload = {
        title: String(form.title || "").trim(),
        description: String(form.description || "").trim(),
        mileage: form.mileage === "" ? null : Number(form.mileage),
      };

      await ServiceCarHistoryApi.updateWork(editItem.id, payload);

      setItems((prev) =>
        prev.map((x) =>
          x.id === editItem.id
            ? {
                ...x,
                title: payload.title,
                description: payload.description,
                mileage: payload.mileage,
              }
            : x
        )
      );

      setEditOpen(false);
      setEditItem(null);
    } catch (e) {
      setEditErr(e?.message || "Greška pri čuvanju.");
    } finally {
      setEditBusy(false);
    }
  }

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panelHead">
        <h2 className="panelTitle">Urađeni poslovi</h2>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="workhist-btn" onClick={load} disabled={loading}>
            Osveži
          </button>
        </div>
      </div>

      <div className="cars-toolbar" style={{ marginTop: 0 }}>
        <div className="cars-search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pretraga: VIN, vozilo, naslov, opis, tip usluge…"
          />
        </div>

        <div className="cars-count">
          {filtered.length} / {items.length}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <select
          className="workhist-input"
          value={range}
          onChange={(e) => setRange(e.target.value)}
          style={{ width: 180 }}
        >
          <option value="7">Poslednjih 7 dana</option>
          <option value="30">Poslednjih 30 dana</option>
          <option value="90">Poslednjih 90 dana</option>
          <option value="all">Sve</option>
        </select>

        <select
          className="workhist-input"
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          style={{ width: 220 }}
        >
          <option value="all">Svi tipovi usluga</option>
          {serviceTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <label
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)" }}
        >
          <input type="checkbox" checked={onlyUpdatable} onChange={(e) => setOnlyUpdatable(e.target.checked)} />
          Samo izmenjivi
        </label>
      </div>

      {err ? <div className="cars-alert cars-alert--err">{err}</div> : null}
      {loading ? <div className="cars-alert cars-alert--neutral">Učitavanje…</div> : null}

      {!loading && filtered.length === 0 ? (
        <div className="cars-alert cars-alert--neutral">Nema urađenih poslova po izabranim filterima.</div>
      ) : null}

      <div className="workhist-grid">
        {filtered.map((it) => {
          const carLabel = [it.brand, it.model].filter(Boolean).join(" ") || "Vozilo";
          return (
            <div key={it.id || `${it.vin}-${it.serviceDate}`} className="workhist-card">
              <div className="workhist-top">
                <div style={{ minWidth: 0 }}>
                  <h3 className="workhist-headline" title={it.title}>
                      {it.title}
                  </h3>
                  <h4 className="workhist-title" title={carLabel}>
                    {carLabel}
                  </h4>
                  <div className="workhist-meta">
                    <span>{fmtDateTime(it.serviceDate)}</span>
                    <span>•</span>
                    <span>{fmtMileage(it.mileage)}</span>
                    <span>•</span>
                    <span title={it.vin}>VIN: {it.vin}</span>
                  </div>
                </div>

                {it.canUpdate ? <span className="workhist-chip">Izmenjivo danas</span> : null}
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {it.serviceTypeName ? <span className="workhist-chip">{it.serviceTypeName}</span> : null}
              </div>

              {it.description ? <p className="workhist-desc">{it.description}</p> : null}

              <div className="workhist-actions">
                {it.canUpdate ? (
                  <button
                    type="button"
                    className="workhist-btn workhist-btn--primary"
                    onClick={() => openEdit(it)}
                    title={!it.canUpdate ? "Izmena je dozvoljena samo na dan kada je evidencija kreirana." : ""}
                  >
                    Izmeni
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {editOpen ? (
        <div className="workhist-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={closeEdit}>
          <div className="workhist-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="workhist-modal-head">
              <h3 className="workhist-modal-title">Izmena urađenog posla</h3>
              <button type="button" className="workhist-btn" onClick={closeEdit} disabled={editBusy}>
                Zatvori
              </button>
            </div>

            <div className="workhist-modal-body">
              {editErr ? <div className="cars-alert cars-alert--err">{editErr}</div> : null}

              <div className="workhist-form">
                <label className="workhist-label">
                  Naslov
                  <input
                    className="workhist-input"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="npr. Zamena ulja i filtera"
                  />
                </label>

                <label className="workhist-label">
                  Opis
                  <textarea
                    className="workhist-textarea"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Detalji rada…"
                  />
                </label>

                <label className="workhist-label">
                  Kilometraža
                  <input
                    className={`workhist-input ${mileageError ? "is-error" : ""}`}
                    value={form.mileage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((p) => ({ ...p, mileage: val }));

                      if (!/^\d+$/.test(val)) {
                        setMileageError("Kilometraža mora biti ceo broj.");
                      } else if (Number(val) <= 0) {
                        setMileageError("Kilometraža mora biti veća od 0.");
                      } else {
                        setMileageError("");
                      }
                    }}
                    placeholder="npr. 184500"
                  />

                  {mileageError && (
                    <div className="workhist-fieldError">
                      {mileageError}
                    </div>
                  )}
                </label>

              </div>
            </div>

            <div className="workhist-modal-actions">
              <button type="button" className="workhist-btn" onClick={closeEdit} disabled={editBusy}>
                Otkaži
              </button>
              <button type="button" className="workhist-btn workhist-btn--primary" onClick={onSave} disabled={editBusy || !!mileageError}>
                {editBusy ? "Čuvanje…" : "Sačuvaj"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}