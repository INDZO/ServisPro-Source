import { useEffect, useMemo, useState } from "react";
import { ServiceCarsApi } from "../../../../api/serviceCarsApi";
import "../../../../styles/clientCars.css";

const PAGE_SIZE = 12;

function cls(...p) {
  return p.filter(Boolean).join(" ");
}

function toTime(v) {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
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


function getSortTime(car) {
  const candidates = [
    car.lastWorkedAt,
    car.LastWorkedAt,
    car.lastServiceDate,
    car.LastServiceDate,
    car.lastAppointmentDate,
    car.LastAppointmentDate,
    car.appointmentDate,
    car.AppointmentDate,
    car.updatedAt,
    car.UpdatedAt,
    car.createdAt,
    car.CreatedAt,
  ];

  for (const c of candidates) {
    const t = toTime(c);
    if (t) return t;
  }
  return 0;
}


function CanvasMileageChart({ points, anomaly }) {
  const [sizeKey, setSizeKey] = useState(0);

  useEffect(() => {
    const onResize = () => setSizeKey((k) => k + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const canvas = document.getElementById("service-cars-mileage-canvas");
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
  }, [points, anomaly, sizeKey]);

  return <canvas id="service-cars-mileage-canvas" className="cars-canvas" />;
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


function NotFoundModal({ open, onClose, vin }) {
  if (!open) return null;

  return (
    <div className="cars-modalOverlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="cars-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cars-modalHead">
          <div className="cars-modalTitle">Vozilo nije pronađeno</div>
          <button type="button" className="cars-modalClose" onClick={onClose} aria-label="Zatvori">
            ×
          </button>
        </div>

        <div className="cars-alert cars-alert--err" style={{ marginBottom: 12 }}>
          Ne postoji vozilo u sistemu sa VIN brojem: <b>{vin || "-"}</b>
        </div>

        <div className="cars-actions">
          <button type="button" className="cars-btn cars-btn--solid" onClick={onClose}>
            U redu
          </button>
        </div>
      </div>
    </div>
  );
}


function CarDetailsInlineRO({ vin, onBack }) {
  const [details, setDetails] = useState(null);
  const [mileage, setMileage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!vin) return;

    (async () => {
      setErr("");
      setLoading(true);
      try {
        const d = await ServiceCarsApi.getDetailsByVin(vin);
        const mh = await ServiceCarsApi.getMileageHistoryByVin(vin);
        setDetails(d || null);
        setMileage(Array.isArray(mh) ? mh : []);
      } catch (e) {
        setErr(e?.message || "Greška pri učitavanju vozila.");
      } finally {
        setLoading(false);
      }
    })();
  }, [vin]);

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
              : "Vozilo"}
          </div>
          <div className="cars-detailSub">Detalji i istorija</div>
        </div>

        <div style={{ width: 92 }} />
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


export default function ServiceCars() {
  const [cars, setCars] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [vinSearch, setVinSearch] = useState("");
  const [listFilter, setListFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [selectedVin, setSelectedVin] = useState("");
  const [nfOpen, setNfOpen] = useState(false);
  const [nfVin, setNfVin] = useState("");

  const loadList = async () => {
    setErr("");
    setMsg("");
    setLoadingList(true);
    try {
      const list = await ServiceCarsApi.listInService();
      setCars(Array.isArray(list) ? list : []);
      setVisibleCount(PAGE_SIZE);
    } catch (e) {
      setErr(e?.message || "Greška pri učitavanju liste vozila.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const openNotFound = (vin) => {
    setNfVin(vin);
    setNfOpen(true);
  };

  const onTopSearch = async () => {
    const v = (vinSearch || "").trim();
    if (!v) return;

    setErr("");
    setMsg("");

    try {
      await ServiceCarsApi.getDetailsByVin(v);
      setSelectedVin(v);
    } catch {
      openNotFound(v);
    }
  };

  const sortedCars = useMemo(() => {
    const copy = Array.isArray(cars) ? cars.slice() : [];
    copy.sort((a, b) => getSortTime(b) - getSortTime(a));
    return copy;
  }, [cars]);

  const filteredCars = useMemo(() => {
    const q = (listFilter || "").trim().toLowerCase();
    if (!q) return sortedCars;

    return sortedCars.filter((c) => {
      const vin = String(c.vin ?? c.VIN ?? "").toLowerCase();
      const brand = String(c.brand ?? c.Brand ?? c.brandName ?? c.BrandName ?? "").toLowerCase();
      const model = String(c.model ?? c.Model ?? c.modelName ?? c.ModelName ?? "").toLowerCase();
      return vin.includes(q) || brand.includes(q) || model.includes(q);
    });
  }, [sortedCars, listFilter]);

  const visibleCars = useMemo(() => filteredCars.slice(0, visibleCount), [filteredCars, visibleCount]);

  if (selectedVin) {
    return <CarDetailsInlineRO vin={selectedVin} onBack={() => setSelectedVin("")} />;
  }

  const totalCount = filteredCars.length;

  return (
    <div className="cars-page">
      <div className="cars-head">
        <div>
          <h1 className="cars-title">Vozila</h1>
          <div className="cars-sub">Vozila koja su rađena u servisu + pretraga po VIN broju</div>
        </div>
      </div>

      {(msg || err) ? (
        <div className={cls("cars-alert", err ? "cars-alert--err" : "cars-alert--ok")}>{err || msg}</div>
      ) : null}

      <div className="cars-toolbar">
        <div className="cars-search">
          <input
            value={vinSearch}
            onChange={(e) => setVinSearch(e.target.value)}
            placeholder="Unesi VIN (broj šasije) i pretraži celu bazu…"
            onKeyDown={(e) => {
              if (e.key === "Enter") onTopSearch();
            }}
          />
          <button type="button" className="cars-btn cars-btn--ghost" onClick={onTopSearch} disabled={!vinSearch.trim()}>
            Traži VIN
          </button>
        </div>

        <div className="cars-count">
          Prikazujem: <b>{Math.min(visibleCount, totalCount)}</b> / <b>{totalCount}</b>
        </div>
      </div>

      <div className="cars-toolbar" style={{ marginTop: 10 }}>
        <div className="cars-search" style={{ flex: 1 }}>
          <input
            value={listFilter}
            onChange={(e) => {
              setListFilter(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Filtriraj listu (brand/model/VIN)…"
          />
          <button
            type="button"
            className="cars-btn cars-btn--ghost"
            onClick={() => {
              setListFilter("");
              setVisibleCount(PAGE_SIZE);
            }}
            disabled={!listFilter.trim()}
          >
            Reset
          </button>
        </div>

        <button type="button" className="cars-btn cars-btn--solid" onClick={loadList} style={{ cursor: "pointer" }}>
          Osveži listu
        </button>
      </div>

      {loadingList ? (
        <div className="cars-muted">Učitavanje...</div>
      ) : totalCount === 0 ? (
        <div className="cars-empty">
          <div className="cars-emptyTitle">Nema vozila</div>
          <div className="cars-emptySub">
            {listFilter.trim() ? "Nema rezultata za zadati filter." : "Trenutno nema vozila u servisu."}
          </div>
        </div>
      ) : (
        <>
          <div className="cars-grid">
            {visibleCars.map((c) => {
              const vin = c.vin ?? c.VIN ?? "-";
              const brand = c.brand ?? c.Brand ?? c.brandName ?? c.BrandName ?? "";
              const model = c.model ?? c.Model ?? c.modelName ?? c.ModelName ?? "";
              const appt = c.appointmentDate ?? c.AppointmentDate ?? c.lastAppointmentDate ?? c.LastAppointmentDate ?? null;
              const year = c.year ?? c.Year ?? "";
              const sortT = getSortTime(c);

              return (
                <button
                  key={`${vin}-${sortT}`}
                  type="button"
                  className="cars-itemCard"
                  onClick={() => setSelectedVin(String(vin))}
                >
                  <div className="cars-itemTop">
                    <div className="cars-itemTitle" title={`${brand} ${model}`.trim()}>
                      {(brand || model) ? `${brand} ${model}`.trim() : "Vozilo"}
                    </div>
                    {year ? <div className="cars-year">{year}</div> : null}
                  </div>

                  <div className="cars-itemSub" title={vin}>
                    VIN: {vin}
                  </div>

                  {appt ? (
                    <div className="cars-itemSub" title={String(appt)}>
                      Termin: {formatDate(appt)}
                    </div>
                  ) : sortT ? (
                    <div className="cars-itemSub" title="Poslednja aktivnost">
                      Poslednje: {formatDate(sortT)}
                    </div>
                  ) : null}

                  <div className="cars-itemHint">Klikni za detalje</div>
                </button>
              );
            })}
          </div>

          {totalCount > visibleCount ? (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
              <button
                type="button"
                className="cars-btn cars-btn--solid"
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                style={{ cursor: "pointer" }}
              >
                Učitaj još ({Math.min(PAGE_SIZE, totalCount - visibleCount)})
              </button>
            </div>
          ) : null}
        </>
      )}

      <NotFoundModal open={nfOpen} vin={nfVin} onClose={() => setNfOpen(false)} />
    </div>
  );
}