import { useEffect, useMemo, useState } from "react";
import { AdminApi } from "../../../../api/adminApi";
import "../../../../styles/adminPages.css";

function get(o, ...keys) {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
}

function normBrand(b) {
  return { id: get(b, "id", "Id"), name: String(get(b, "name", "Name") ?? "") };
}

function normModel(m) {
  return {
    id: get(m, "id", "Id"),
    name: String(get(m, "name", "Name") ?? ""),
    carBrandId: get(m, "carBrandId", "CarBrandId"),
  };
}

export default function AdminCarCatalog() {
  const [brands, setBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [models, setModels] = useState([]);

  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [err, setErr] = useState("");

  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");

  const [brandSearch, setBrandSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");

  async function loadBrands(pickFirst = true) {
    setLoadingBrands(true);
    setErr("");
    try {
      const data = await AdminApi.getCarBrands();
      const list = Array.isArray(data)
        ? data.map(normBrand).sort((a, b) => a.name.localeCompare(b.name))
        : [];
      setBrands(list);

      if (pickFirst) {
        const first = list[0]?.id ?? null;
        setSelectedBrandId((prev) => prev ?? first);
      }
    } catch (e) {
      setErr(e?.message || "Greška pri učitavanju marki.");
    } finally {
      setLoadingBrands(false);
    }
  }

  async function loadModels(brandId) {
    if (!brandId) {
      setModels([]);
      return;
    }
    setLoadingModels(true);
    setErr("");
    try {
      const data = await AdminApi.getCarModelsByBrand(brandId);
      const list = Array.isArray(data)
        ? data.map(normModel).sort((a, b) => a.name.localeCompare(b.name))
        : [];
      setModels(list);
    } catch (e) {
      setErr(e?.message || "Greška pri učitavanju modela.");
    } finally {
      setLoadingModels(false);
    }
  }

  useEffect(() => {
    loadBrands(true);
  }, []);

  useEffect(() => {
    loadModels(selectedBrandId);
    setModelSearch(""); 
  }, [selectedBrandId]);

  const selectedBrand = useMemo(
    () => brands.find((b) => b.id === selectedBrandId) || null,
    [brands, selectedBrandId]
  );

  const filteredBrands = useMemo(() => {
    const s = brandSearch.trim().toLowerCase();
    if (!s) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(s));
  }, [brands, brandSearch]);

  const filteredModels = useMemo(() => {
    const s = modelSearch.trim().toLowerCase();
    if (!s) return models;
    return models.filter((m) => m.name.toLowerCase().includes(s));
  }, [models, modelSearch]);

  async function addBrand() {
    const name = newBrand.trim();
    if (!name) return;
    setErr("");
    try {
      await AdminApi.createCarBrand(name);
      setNewBrand("");
      await loadBrands(false);
    } catch (e) {
      setErr(e?.message || "Greška pri dodavanju marke.");
    }
  }

  async function renameBrand(b) {
    const name = window.prompt("Novi naziv marke:", b.name);
    if (!name) return;
    setErr("");
    try {
      await AdminApi.updateCarBrand(b.id, name.trim());
      await loadBrands(false);
    } catch (e) {
      setErr(e?.message || "Greška pri izmeni marke.");
    }
  }

  async function deleteBrand(b) {
    if (!window.confirm(`Obrisati marku "${b.name}"?`)) return;
    setErr("");
    try {
      await AdminApi.deleteCarBrand(b.id);
      if (selectedBrandId === b.id) setSelectedBrandId(null);
      await loadBrands(true);
    } catch (e) {
      setErr(e?.message || "Greška pri brisanju marke.");
    }
  }

  async function addModel() {
    const name = newModel.trim();
    if (!name || !selectedBrandId) return;
    setErr("");
    try {
      await AdminApi.createCarModel(name, selectedBrandId);
      setNewModel("");
      await loadModels(selectedBrandId);
    } catch (e) {
      setErr(e?.message || "Greška pri dodavanju modela.");
    }
  }

  async function renameModel(m) {
    const name = window.prompt("Novi naziv modela:", m.name);
    if (!name) return;
    setErr("");
    try {
      await AdminApi.updateCarModel(m.id, name.trim(), m.carBrandId);
      await loadModels(selectedBrandId);
    } catch (e) {
      setErr(e?.message || "Greška pri izmeni modela.");
    }
  }

  async function deleteModel(m) {
    if (!window.confirm(`Obrisati model "${m.name}"?`)) return;
    setErr("");
    try {
      await AdminApi.deleteCarModel(m.id);
      await loadModels(selectedBrandId);
    } catch (e) {
      setErr(e?.message || "Greška pri brisanju modela.");
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2 className="admin-page-title">Marke i modeli</h2>
          <p className="admin-page-sub">
            Katalog automobila dostupnih na sajtu.
          </p>
        </div>

        <div className="admin-actions">
          <button
            className="admin-btn admin-btn--primary"
            onClick={() => loadBrands(false)}
            disabled={loadingBrands}
          >
            Osveži
          </button>
        </div>
      </div>

      {err ? <div className="admin-alert admin-alert--error">{err}</div> : null}

      <div className="admin-split" style={{ marginTop: 12 }}>
        <div className="admin-card">
          <div
            style={{
              position: "sticky",
              top: 0,
              background: "#fff",
              zIndex: 2,
              paddingBottom: 10,
              marginBottom: 10,
              borderBottom: "1px solid var(--card-border)",
            }}
          >
            <div className="admin-card-top">
              <h3 className="admin-card-title">Marke</h3>
              <span className="admin-pill">{brands.length}</span>
            </div>

            <div className="admin-actions" style={{ marginTop: 10 }}>
              <input
                className="admin-input"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Pretraga marki…"
              />
            </div>

            <div className="admin-actions" style={{ marginTop: 10 }}>
              <input
                className="admin-input"
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder="Nova marka (npr. BMW)"
              />
              <button className="admin-btn admin-btn--primary" onClick={addBrand}>
                Dodaj
              </button>
            </div>
          </div>

          {loadingBrands ? (
            <div className="admin-alert">Učitavanje marki…</div>
          ) : filteredBrands.length === 0 ? (
            <div className="admin-alert">Nema marki.</div>
          ) : (
            <div className="admin-list" role="list">
              {filteredBrands.map((b) => (
                <div
                  key={b.id}
                  className={`admin-list-item ${b.id === selectedBrandId ? "is-active" : ""}`}
                  onClick={() => setSelectedBrandId(b.id)}
                  role="listitem"
                  title="Klikni da izabereš marku"
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {b.name || "—"}
                    </div>
                    <div className="admin-muted">Klik za modele</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="admin-btn" onClick={(e) => (e.stopPropagation(), renameBrand(b))}>
                      Izmeni
                    </button>
                    <button
                      className="admin-btn admin-btn--danger"
                      onClick={(e) => (e.stopPropagation(), deleteBrand(b))}
                    >
                      Obriši
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-card">
          <div
            style={{
              position: "sticky",
              top: 0,
              background: "#fff",
              zIndex: 2,
              paddingBottom: 10,
              marginBottom: 10,
              borderBottom: "1px solid var(--card-border)",
            }}
          >
            <div className="admin-card-top">
              <h3 className="admin-card-title">Modeli</h3>
              <span className="admin-pill">{selectedBrand ? selectedBrand.name : "Izaberi marku"}</span>
            </div>

            <div className="admin-actions" style={{ marginTop: 10 }}>
              <input
                className="admin-input"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder={selectedBrand ? "Pretraga modela…" : "Izaberi marku"}
                disabled={!selectedBrandId}
              />
            </div>

            <div className="admin-actions" style={{ marginTop: 10 }}>
              <input
                className="admin-input"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                placeholder={selectedBrand ? "Novi model (npr. 320d)" : "Prvo izaberi marku"}
                disabled={!selectedBrandId}
              />
              <button className="admin-btn admin-btn--primary" onClick={addModel} disabled={!selectedBrandId}>
                Dodaj
              </button>
            </div>
          </div>

          {loadingModels ? (
            <div className="admin-alert">Učitavanje modela…</div>
          ) : !selectedBrandId ? (
            <div className="admin-alert">Izaberi marku da vidiš modele.</div>
          ) : filteredModels.length === 0 ? (
            <div className="admin-alert">Nema modela (ili pretraga nema pogodak).</div>
          ) : (
            <div style={{ maxHeight: 520, overflow: "auto" }}>
              <table className="admin-table admin-table--inside-overflow">
                <thead>
                  <tr>
                    <th>Naziv modela</th>
                    <th style={{ width: 200 }}>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModels.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>
                        <div className="admin-row-actions">
                          <button className="admin-btn" onClick={() => renameModel(m)}>
                            Izmeni
                          </button>
                          <button className="admin-btn admin-btn--danger" onClick={() => deleteModel(m)}>
                            Obriši
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}