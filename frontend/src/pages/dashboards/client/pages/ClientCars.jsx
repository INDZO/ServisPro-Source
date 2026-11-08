import { useEffect, useMemo, useState } from "react";
import { ClientCarsApi } from "../../../../api/clientCars.js";
import "../../../../styles/clientCars.css";

function cls(...p) {
  return p.filter(Boolean).join(" ");
}

function formatDate(dt) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleDateString("sr-RS");
  } catch {
    return "-";
  }
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}


function CanvasMileageChart({ points, anomaly }) {
  const [sizeKey, setSizeKey] = useState(0);

  useEffect(() => {
    const onResize = () => setSizeKey((k) => k + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const canvas = document.getElementById("cars-mileage-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 600;
    const cssH = canvas.clientHeight || 220;

    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, cssW, cssH);

    const xs = points
      .map((p) => new Date(p.serviceDate || p.ServiceDate).getTime())
      .filter((t) => Number.isFinite(t) && t > 0);

    const ys = points.map((p) => safeNum(p.mileage ?? p.Mileage));

    if (xs.length < 2) return;

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const padL = 42;
    const padR = 16;
    const padT = 14;
    const padB = 28;

    const W = cssW - padL - padR;
    const H = cssH - padT - padB;

    const xAt = (t) => padL + ((t - minX) / (maxX - minX || 1)) * W;
    const yAt = (v) => padT + (1 - (v - minY) / (maxY - minY || 1)) * H;

    ctx.fillStyle = anomaly ? "rgba(220,0,0,0.04)" : "rgba(0,140,0,0.04)";
    ctx.fillRect(padL, padT, W, H);

    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (H * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + W, y);
      ctx.stroke();
    }

    ctx.fillStyle = "#444";
    ctx.font = "12px system-ui";
    ctx.fillText(String(maxY), 8, padT + 10);
    ctx.fillText(String(minY), 8, padT + H);

    const pts = points.map((p) => {
      const t = new Date(p.serviceDate || p.ServiceDate).getTime();
      const v = safeNum(p.mileage ?? p.Mileage);
      return { x: xAt(t), y: yAt(v), t, v };
    });

    ctx.beginPath();
    pts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.lineTo(pts[pts.length - 1].x, padT + H);
    ctx.lineTo(pts[0].x, padT + H);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, padT, 0, padT + H);
    if (anomaly) {
      grad.addColorStop(0, "rgba(220,0,0,0.18)");
      grad.addColorStop(1, "rgba(220,0,0,0.02)");
    } else {
      grad.addColorStop(0, "rgba(0,140,0,0.16)");
      grad.addColorStop(1, "rgba(0,140,0,0.02)");
    }
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    ctx.fillStyle = "rgba(0,0,0,0.85)";
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    const first = new Date(minX).toLocaleDateString("sr-RS");
    const last = new Date(maxX).toLocaleDateString("sr-RS");
    ctx.fillStyle = "#444";
    ctx.font = "12px system-ui";
    ctx.fillText(first, padL, cssH - 10);
    const w = ctx.measureText(last).width;
    ctx.fillText(last, padL + W - w, cssH - 10);
  }, [points, sizeKey, anomaly]);

  return <canvas id="cars-mileage-canvas" className="cars-canvas" />;
}

function MileageSection({ points }) {
  const data = Array.isArray(points) ? points : [];

  const anomaly = useMemo(() => {
    if (data.length < 2) return null;

    const sorted = data
      .slice()
      .sort(
        (a, b) =>
          new Date(a.serviceDate || a.ServiceDate).getTime() -
          new Date(b.serviceDate || b.ServiceDate).getTime()
      );

    for (let i = 1; i < sorted.length; i++) {
      const prev = safeNum(sorted[i - 1].mileage ?? sorted[i - 1].Mileage);
      const cur = safeNum(sorted[i].mileage ?? sorted[i].Mileage);
      if (cur && prev && cur < prev) {
        return { prev, cur, at: sorted[i].serviceDate || sorted[i].ServiceDate };
      }
    }
    return null;
  }, [data]);

  const hasEnough = data.length >= 2;

  return (
    <div className="cars-card">
      <div className="cars-cardTitle">Kilometraža kroz vreme</div>

      {!hasEnough ? (
        <div className="cars-alert cars-alert--neutral" style={{ margin: "8px 0 12px" }}>
          Nema podataka o kilometraži (ili nema dovoljno tačaka za graf).
        </div>
      ) : anomaly ? (
        <div className="cars-alert cars-alert--err" style={{ margin: "8px 0 12px" }}>
          Upozorenje: primećen je pad kilometraže ({anomaly.prev} → {anomaly.cur}) na datum {formatDate(anomaly.at)}.
        </div>
      ) : (
        <div className="cars-alert cars-alert--ok" style={{ margin: "8px 0 12px" }}>
          OK: nema uočenog pada kilometraže u istoriji.
        </div>
      )}

      {!hasEnough ? null : <CanvasMileageChart points={data} anomaly={!!anomaly} />}
    </div>
  );
}


function AddCarModal({ open, onClose, onCreate, busy }) {
  const [vin, setVin] = useState("");
  const [year, setYear] = useState("");

  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);

  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;

    setVin("");
    setYear("");
    setBrandId("");
    setModelId("");
    setModels([]);
    setErr("");

    (async () => {
      setLoadingBrands(true);
      try {
        const data = await ClientCarsApi.getBrands();
        setBrands(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e?.message || "Ne mogu da učitam marke.");
      } finally {
        setLoadingBrands(false);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const bid = Number(brandId);
    if (!bid) {
      setModels([]);
      setModelId("");
      return;
    }

    (async () => {
      setLoadingModels(true);
      try {
        const data = await ClientCarsApi.getModelsByBrand(bid);
        setModels(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e?.message || "Ne mogu da učitam modele za izabranu marku.");
      } finally {
        setLoadingModels(false);
      }
    })();
  }, [brandId, open]);

  const submit = async (e) => {
    e.preventDefault();

    const v = (vin || "").trim();
    if (!v) return setErr("VIN je obavezan.");
    if (v.length < 6) return setErr("VIN deluje prekratko.");

    const y = year ? Number(year) : null;
    if (year && (!Number.isFinite(y) || y < 1950 || y > 2100)) return setErr("Godina nije validna.");

    const b = Number(brandId);
    const m = Number(modelId);
    if (!Number.isFinite(b) || b <= 0) return setErr("Odaberi marku.");
    if (!Number.isFinite(m) || m <= 0) return setErr("Odaberi model.");

    setErr("");
    await onCreate({
      vin: v,
      year: year ? y : null,
      carBrandId: b,
      carModelId: m,
    });
  };

  if (!open) return null;

  return (
    <div className="cars-modalOverlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="cars-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cars-modalHead">
          <div className="cars-modalTitle">Dodaj automobil</div>
          <button type="button" className="cars-modalClose" onClick={onClose} aria-label="Zatvori">
            ×
          </button>
        </div>

        {err ? <div className="cars-alert cars-alert--err">{err}</div> : null}

        <form onSubmit={submit} className="cars-form">
          <label className="cars-field">
            <span>VIN</span>
            <input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="npr. WVWZZZ..." />
          </label>

          <label className="cars-field">
            <span>Godina (opciono)</span>
            <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="npr. 2016" />
          </label>

          <label className="cars-field">
            <span>Marka</span>
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)} disabled={loadingBrands || busy}>
              <option value="">{loadingBrands ? "Učitavanje..." : "Odaberi marku"}</option>
              {brands.map((b) => (
                <option key={b.id ?? b.Id} value={b.id ?? b.Id}>
                  {b.name ?? b.Name}
                </option>
              ))}
            </select>
          </label>

          <label className="cars-field">
            <span>Model</span>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              disabled={!brandId || loadingModels || busy}
            >
              <option value="">
                {!brandId ? "Prvo odaberi marku" : loadingModels ? "Učitavanje..." : "Odaberi model"}
              </option>
              {models.map((m) => (
                <option key={m.id ?? m.Id} value={m.id ?? m.Id}>
                  {m.name ?? m.Name}
                </option>
              ))}
            </select>
          </label>

          <div className="cars-actions">
            <button type="button" className="cars-btn cars-btn--ghost" onClick={onClose} disabled={busy}>
              Otkaži
            </button>
            <button type="submit" className="cars-btn cars-btn--solid" disabled={busy}>
              {busy ? "Čuvanje..." : "Dodaj"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function CarDetailsInline({ carId, onBack, onDeleted }) {
  const [details, setDetails] = useState(null);
  const [mileage, setMileage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [busyDelete, setBusyDelete] = useState(false);

  useEffect(() => {
    if (!carId) return;

    (async () => {
      setErr("");
      setLoading(true);
      try {
        const d = await ClientCarsApi.getById(carId);
        const mh = await ClientCarsApi.getMileageHistory(carId);
        setDetails(d || null);
        setMileage(Array.isArray(mh) ? mh : []);
      } catch (e) {
        setErr(e?.message || "Greška pri učitavanju automobila.");
      } finally {
        setLoading(false);
      }
    })();
  }, [carId]);

  const onDelete = async () => {
    const ok = window.confirm("Da li ste sigurni da želite da obrišete ovaj automobil?");
    if (!ok) return;

    setBusyDelete(true);
    setErr("");

    try {
      await ClientCarsApi.remove(carId);
      onDeleted?.();
    } catch (e) {
      setErr(e?.message || "Greška pri brisanju automobila.");
    } finally {
      setBusyDelete(false);
    }
  };

  const history = details?.history ?? details?.History ?? [];

  return (
    <div className="cars-detailPage">
      <div className="cars-detailTop">
        <button type="button" className="cars-btn cars-btn--ghost" onClick={onBack}>
          ← Nazad
        </button>

        <div className="cars-detailTitleWrap">
          <div className="cars-detailTitle">
            {details
              ? `${details.brandName ?? details.BrandName ?? ""} ${details.modelName ?? details.ModelName ?? ""}`.trim()
              : "Automobil"}
          </div>
          <div className="cars-detailSub">Detalji i istorija</div>
        </div>

        <button type="button" className="cars-btn cars-btn--danger" onClick={onDelete} disabled={busyDelete}>
          {busyDelete ? "Brisanje..." : "Obriši"}
        </button>
      </div>

      {err ? <div className="cars-alert cars-alert--err">{err}</div> : null}

      {loading ? (
        <div className="cars-muted">Učitavanje...</div>
      ) : !details ? (
        <div className="cars-muted">Nema podataka.</div>
      ) : (
        <div className="cars-detailWrap">
          <div className="cars-card">
            <div className="cars-cardTitle">Osnovno</div>
            <div className="cars-kv">
              <div className="cars-k">VIN</div>
              <div className="cars-v">{details.vin ?? details.VIN ?? "-"}</div>

              <div className="cars-k">Godina</div>
              <div className="cars-v">{details.year ?? details.Year ?? "-"}</div>

              <div className="cars-k">Brend</div>
              <div className="cars-v">{details.brandName ?? details.BrandName ?? "-"}</div>

              <div className="cars-k">Model</div>
              <div className="cars-v">{details.modelName ?? details.ModelName ?? "-"}</div>
            </div>
          </div>

          <MileageSection points={mileage} />

          <div className="cars-card cars-card--full">
            <div className="cars-cardTitle">Istorija servisiranja</div>

            {Array.isArray(history) && history.length ? (
              <div className="cars-history">
                {history.map((h) => {
                  const id = h.id ?? h.Id ?? `${h.title ?? ""}-${h.serviceDate ?? ""}`;
                  const title = h.title ?? h.Title ?? "Servis";
                  const desc = h.description ?? h.Description ?? "";
                  const km = h.mileage ?? h.Mileage ?? 0;
                  const date = h.serviceDate ?? h.ServiceDate ?? null;
                  const serviceName = h.serviceName ?? h.ServiceName ?? "";
                  const stName = h.serviceTypeName ?? h.ServiceTypeName ?? "";

                  return (
                    <div key={id} className="cars-historyItem">
                      <div className="cars-historyTop">
                        <div className="cars-historyTitle" title={title}>
                          {title}
                        </div>
                        <div className="cars-historyMeta">
                          <span>{formatDate(date)}</span>
                          <span className="cars-dot">•</span>
                          <span>{km} km</span>
                        </div>
                      </div>

                      {(serviceName || stName) ? (
                        <div className="cars-historySub" title={`${serviceName} ${stName}`.trim()}>
                          {serviceName}
                          {serviceName && stName ? " — " : ""}
                          {stName}
                        </div>
                      ) : null}

                      {desc ? <div className="cars-historyDesc">{desc}</div> : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="cars-muted">Nema istorije.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientCars() {
  const [cars, setCars] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [searchVin, setSearchVin] = useState("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [addOpen, setAddOpen] = useState(false);

  const [selectedCarId, setSelectedCarId] = useState(0);

  const [busyCreate, setBusyCreate] = useState(false);

  const count = useMemo(() => cars.length, [cars]);

  const loadList = async () => {
    setErr("");
    setMsg("");
    setLoadingList(true);
    try {
      const list = await ClientCarsApi.list({ vin: (searchVin || "").trim() || undefined });
      setCars(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e?.message || "Greška pri učitavanju liste automobila.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);
  useEffect(() => {
  if (searchVin.trim() === "") {
    loadList();
  }
}, [searchVin]);


  const onCreate = async (payload) => {
    setErr("");
    setMsg("");
    setBusyCreate(true);
    try {
      const created = await ClientCarsApi.create(payload);
      setMsg("Automobil je uspešno dodat.");
      setAddOpen(false);
      await loadList();

      const newId = Number(created?.id ?? created?.Id ?? 0);
      if (newId) setSelectedCarId(newId);
    } catch (e) {
      setErr(e?.message || "Greška pri dodavanju automobila.");
    } finally {
      setBusyCreate(false);
    }
  };

  if (selectedCarId) {
    return (
      <CarDetailsInline
        carId={selectedCarId}
        onBack={() => setSelectedCarId(0)}
        onDeleted={async () => {
          setMsg("Automobil je obrisan.");
          setSelectedCarId(0);
          await loadList();
        }}
      />
    );
  }

  return (
    <div className="cars-page">
      <div className="cars-head">
        <div>
          <h1 className="cars-title">Automobili</h1>
          <div className="cars-sub">Pretraga, dodavanje i pregled automobila</div>
        </div>

        <button type="button" className="cars-btn cars-btn--solid" onClick={() => setAddOpen(true)}>
          Dodaj automobil
        </button>
      </div>

      {(msg || err) ? (
        <div className={cls("cars-alert", err ? "cars-alert--err" : "cars-alert--ok")}>{err || msg}</div>
      ) : null}

      <div className="cars-toolbar">
        <div className="cars-search">
          <input value={searchVin} onChange={(e) => setSearchVin(e.target.value)} placeholder="Pretraga po VIN..." />
          <button type="button" className="cars-btn cars-btn--ghost" onClick={loadList} disabled={loadingList}>
            {loadingList ? "..." : "Traži"}
          </button>
        </div>

        <div className="cars-count">
          Ukupno: <b>{count}</b>
        </div>
      </div>

      {loadingList ? (
        <div className="cars-muted">Učitavanje...</div>
      ) : cars.length === 0 ? (
        <div className="cars-empty">
          <div className="cars-emptyTitle">Nema automobila</div>
          <div className="cars-emptySub">Dodaj automobil ili promeni kriterijum pretrage.</div>
        </div>
      ) : (
        <div className="cars-grid">
          {cars.map((c) => {
            const id = Number(c.id ?? c.Id);
            const vin = c.vin ?? c.VIN ?? c.Vin ?? "-";
            const year = c.year ?? c.Year ?? null;
            const brand = c.brandName ?? c.BrandName ?? "";
            const model = c.modelName ?? c.ModelName ?? "";

            return (
              <button key={id} type="button" className="cars-itemCard" onClick={() => setSelectedCarId(id)}>
                <div className="cars-itemTop">
                  <div className="cars-itemTitle" title={`${brand} ${model}`.trim()}>
                    {(brand || model) ? `${brand} ${model}`.trim() : "Automobil"}
                  </div>
                  {year ? <div className="cars-year">{year}</div> : null}
                </div>
                <div className="cars-itemSub" title={vin}>
                  VIN: {vin}
                </div>
                <div className="cars-itemHint">Klikni za detalje</div>
              </button>
            );
          })}
        </div>
      )}

      <AddCarModal open={addOpen} onClose={() => setAddOpen(false)} onCreate={onCreate} busy={busyCreate} />
    </div>
  );
}