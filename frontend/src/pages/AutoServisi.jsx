import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api/baseUrl";
import { getPublicServices, getServiceTypes } from "../api/publicServicesApi";
import { ChatApi } from "../api/chatApi";
import { getAuth, isAuthenticated } from "../auth/auth";
import "../styles/Servisi.css";
import StarRating from "../components/StarRating";
import AppointmentSchedulerModal from "../components/ScheduleAppointmentModal.jsx";

const WORKING_DAYS = [
  { value: "", label: "Svi dani" },
  { value: "pon", label: "Ponedeljak" },
  { value: "uto", label: "Utorak" },
  { value: "sre", label: "Sreda" },
  { value: "cet", label: "Četvrtak" },
  { value: "pet", label: "Petak" },
  { value: "sub", label: "Subota" },
  { value: "ned", label: "Nedelja" },
];

const SORT_OPTIONS = [
  { value: "name|asc", label: "Naziv (rastuće)" },
  { value: "name|desc", label: "Naziv (opadajuće)" },
  { value: "rating|asc", label: "Ocena (rastuće)" },
  { value: "rating|desc", label: "Ocena (opadajuće)" },
  { value: "reviews|asc", label: "Broj recenzija (rastuće)" },
  { value: "reviews|desc", label: "Broj recenzija (opadajuće)" },
];

function normalizeImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function clampText(str, max) {
  if (!str) return "";
  if (str.length <= max) return str;
  return str.slice(0, max).trim() + "...";
}

export default function AutoServisi() {
  const navigate = useNavigate();

  const isClient =
    isAuthenticated() && String(getAuth().role || "").toLowerCase() === "client";

  const getServiceUserId = (s) =>
    Number(s?.serviceUserId ?? s?.ServiceUserId ?? s?.userId ?? s?.UserId ?? 0) || 0;

  async function openChatWithService(service) {
    if (!isClient) return;

    const { userId } = getAuth();
    const clientUserId = Number(userId || 0);
    const serviceUserId = getServiceUserId(service);

    if (!clientUserId) {
      window.alert("Nedostaje ID ulogovanog korisnika (userId). Proveri login i localStorage.");
      return;
    }

    if (!serviceUserId) {
      window.alert(
        "Nedostaje serviceUserId (korisnički ID servisa). Backend treba da ga vrati u listi servisa (npr. serviceUserId)."
      );
      return;
    }

    try {
      const res = await ChatApi.getBetween({ serviceUserId, clientUserId });
      const conversationId = Number(res?.conversationId ?? 0) || 0;

      navigate("/dashboard/chat", {
        state: {
          conversationId,
          receiverUserId: conversationId ? 0 : serviceUserId,
          receiverName: service?.name || "Servis",
        },
      });
    } catch (e) {
      window.alert(e?.message || "Greška pri otvaranju chata.");
    }
  }

  const [types, setTypes] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nameSearch, setNameSearch] = useState("");
  const [sortValue, setSortValue] = useState("name|asc");

  const [workingDay, setWorkingDay] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [pageSize, setPageSize] = useState(6);
  const [selectedTypeIds, setSelectedTypeIds] = useState([]);

  const [typesOpen, setTypesOpen] = useState(false);
  const [typeSearch, setTypeSearch] = useState("");

  const [pageNumber, setPageNumber] = useState(1);
  const [paged, setPaged] = useState(null);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleService, setScheduleService] = useState(null);

  useEffect(() => {
    getServiceTypes()
      .then(setTypes)
      .catch(() => setTypes([]));
  }, []);

  const filteredTypes = useMemo(() => {
    const q = typeSearch.trim().toLowerCase();
    if (!q) return types;
    return (types || []).filter((t) => String(t?.name || "").toLowerCase().includes(q));
  }, [types, typeSearch]);

  const { sortBy, sortDirection } = useMemo(() => {
    const [sb, sd] = String(sortValue).split("|");
    return { sortBy: sb, sortDirection: sd };
  }, [sortValue]);

  const query = useMemo(() => {
    return {
      search: nameSearch.trim() || undefined,
      city: citySearch.trim() || undefined,
      workingDay: workingDay || undefined,
      serviceTypeIds: selectedTypeIds.length ? selectedTypeIds : undefined,
      sortBy,
      sortDirection,
      pageNumber,
      pageSize,
    };
  }, [
    nameSearch,
    citySearch,
    workingDay,
    selectedTypeIds,
    sortBy,
    sortDirection,
    pageNumber,
    pageSize,
  ]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    getPublicServices(query)
      .then((res) => mounted && setPaged(res))
      .catch((e) => {
        if (!mounted) return;
        setPaged(null);
        setError(e?.message || "Greška pri učitavanju servisa.");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [query]);

  function toggleType(id) {
    setPageNumber(1);
    setSelectedTypeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function resetAll() {
    setPageNumber(1);
    setNameSearch("");
    setCitySearch("");
    setWorkingDay("");
    setSelectedTypeIds([]);
    setSortValue("name|asc");
    setPageSize(6);
    setTypesOpen(false);
    setTypeSearch("");
  }

  const items = paged?.items || [];
  const totalPages = paged?.totalPages || 1;

  return (
    <div className="services-page">
      <div className="container services-wrap">
        <h1 className="services-title">Auto Servisi</h1>

        <div className="services-main">
          <aside className="services-side">
            <div className="side-block">
              <label className="side-label">Radni dan</label>
              <select
                className="side-select"
                value={workingDay}
                onChange={(e) => {
                  setPageNumber(1);
                  setWorkingDay(e.target.value);
                }}
              >
                {WORKING_DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="side-block">
              <label className="side-label">Grad</label>
              <input
                className="side-input"
                value={citySearch}
                onChange={(e) => {
                  setPageNumber(1);
                  setCitySearch(e.target.value);
                }}
                placeholder="Pretraga po gradu..."
              />
            </div>

            <div className="side-block">
              <label className="side-label">Kartica po strani</label>
              <select
                className="side-select"
                value={pageSize}
                onChange={(e) => {
                  setPageNumber(1);
                  setPageSize(Number(e.target.value));
                }}
              >
                <option value={6}>6</option>
                <option value={9}>9</option>
                <option value={12}>12</option>
              </select>
            </div>

            <div className="side-divider" />

            <div className="side-block">
              <button
                type="button"
                className="serviceTypesToggle"
                onClick={() => setTypesOpen((v) => !v)}
                aria-expanded={typesOpen}
              >
                <span>Tipovi usluga</span>
                <span className={typesOpen ? "serviceTypesChevron open" : "serviceTypesChevron"}>
                  ▾
                </span>
              </button>

              {typesOpen ? (
                <div className="serviceTypesPanel">
                  <input
                    className="serviceTypesSearch"
                    value={typeSearch}
                    onChange={(e) => setTypeSearch(e.target.value)}
                    placeholder="Pretraga usluga..."
                    aria-label="Pretraga tipova usluga"
                  />

                  <div className="serviceTypesList">
                    {filteredTypes.map((t) => (
                      <label key={t.id} className="serviceTypesItem">
                        <input
                          type="checkbox"
                          checked={selectedTypeIds.includes(t.id)}
                          onChange={() => toggleType(t.id)}
                        />
                        <span className="serviceTypesText">{t.name}</span>
                      </label>
                    ))}

                    {!types.length && (
                      <div className="muted">Tipovi usluga nisu dostupni.</div>
                    )}

                    {!!types.length && filteredTypes.length === 0 && (
                      <div className="muted">Nema rezultata za “{typeSearch}”.</div>
                    )}
                  </div>
                </div>
              ) : null}

              <button className="side-reset" onClick={resetAll} type="button" style={{ marginTop: 10 }}>
                Reset
              </button>
            </div>
          </aside>

          <section className="services-content">
            <div className="services-toolbar">
              <div className="searchbar">
                <input
                  className="searchbar-input"
                  value={nameSearch}
                  onChange={(e) => {
                    setPageNumber(1);
                    setNameSearch(e.target.value);
                  }}
                  placeholder="Pretraga po nazivu..."
                />
                <span className="searchbar-icon" aria-hidden="true">
                  ⌕
                </span>
              </div>

              <select
                className="sort-select"
                value={sortValue}
                onChange={(e) => {
                  setPageNumber(1);
                  setSortValue(e.target.value);
                }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {loading && <div className="panel">Učitavanje...</div>}
            {!!error && <div className="panel panel--error">{error}</div>}

            {!loading && !error && (
              <>
                <div className="services-list">
                  {items.map((s) => {
                    const img = normalizeImageUrl(s.imageUrl);

                    return (
                      <article key={s.id} className="service-row">
                        <div className="service-row__thumb">
                          <img src={img} alt={s.name} loading="lazy" />
                        </div>

                        <div className="service-row__body">
                          <div className="service-row__title" title={s.name}>
                            {s.name}
                          </div>

                          <div className="service-row__meta">
                            <span className="meta-pill">{s.city}</span>
                            <span className="meta-pill">
                              <span className="metaLabel">Ocena:</span>
                              <StarRating value={s.averageRating || 0} readOnly size="sm" />
                              <b className="metaNumber">
                                {typeof s.averageRating === "number"
                                  ? s.averageRating.toFixed(1)
                                  : "—"}
                              </b>
                            </span>

                            <span className="meta-pill">
                              Recenzije: <b>{s.reviewsCount}</b>
                            </span>
                          </div>

                          {s.description ? (
                            <div className="service-row__desc">{clampText(s.description, 140)}</div>
                          ) : null}

                          <div className="service-row__tags">
                            {(s.serviceTypes || []).slice(0, 5).map((t) => (
                              <span key={t} className="tag">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="service-row__actions">
                          <Link className="btn-primary" to={`/auto-servis/${s.id}`}>
                            Detalji
                          </Link>

                          {isClient ? (
                            <>
                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => openChatWithService(s)}
                              >
                                Pošalji poruku
                              </button>

                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => {
                                  setScheduleService({
                                    id: s.id,
                                    name: s.name,
                                    serviceTypes: Array.isArray(s.serviceTypes) ? s.serviceTypes : [],
                                  });
                                  setScheduleOpen(true);
                                }}
                              >
                                Zakaži termin
                              </button>
                            </>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}

                  {items.length === 0 && (
                    <div className="panel">Nema servisa za zadate filtere.</div>
                  )}
                </div>

                <div className="pager">
                  <button
                    className="btn-ghost"
                    disabled={pageNumber <= 1}
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  >
                    Prethodna
                  </button>

                  <div className="pager-info">
                    Strana <b>{pageNumber}</b> / <b>{totalPages}</b>
                  </div>

                  <button
                    className="btn-ghost"
                    disabled={pageNumber >= totalPages}
                    onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                  >
                    Sledeća
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {isClient && scheduleOpen && scheduleService ? (
        <AppointmentSchedulerModal
          isOpen={scheduleOpen}
          onClose={() => {
            setScheduleOpen(false);
            setScheduleService(null);
          }}
          serviceId={scheduleService.id}
          serviceName={scheduleService.name}
          serviceTypeNames={scheduleService.serviceTypes}
        />
      ) : null}
    </div>
  );
}