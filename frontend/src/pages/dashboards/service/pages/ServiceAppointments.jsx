import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

import "../../../../styles/serviceAppointments.css";

import { ServiceAppointmentsApi } from "../../../../api/serviceAppointmentsApi";
import { ServiceCalendarApi } from "../../../../api/serviceCalendarApi";
import { ServiceProfileApi } from "../../../../api/serviceProfileApi";

const STATUS_LABEL = {
  Requested: "Na čekanju",
  Accepted: "Prihvaćen",
  InService: "U servisu",
  InProgress: "U radu",
  Completed: "Završen",
  Canceled: "Otkazan",
  Rejected: "Odbijen",
};

const DAILY_FILTERS = [
  { key: "AllActive", label: "Aktivni (danas)" },
  { key: "Accepted", label: "Prihvaćeni" },
  { key: "InService", label: "U servisu" },
  { key: "InProgress", label: "U radu" },
];

const DAY_TABS = [
  { key: "Requested", label: "Zahtevi" },
  { key: "Active", label: "Aktivni" },
  { key: "Completed", label: "Završeni" },
  { key: "Rejected", label: "Odbijeni/Otkazani" },
  { key: "All", label: "Svi" },
];

function pick(obj, ...keys) {
  for (const k of keys) if (obj && obj[k] !== undefined) return obj[k];
  return undefined;
}

function fmtDate(dateLike) {
  if (!dateLike) return "-";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("sr-RS");
}

function fmtDateISO(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtTime(timeSpan) {
  if (!timeSpan) return "";
  const m = String(timeSpan).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function badgeClass(status) {
  return `sappt-badge is-${String(status || "").toLowerCase()}`;
}

function normalizeDaily(raw) {
  return {
    id: pick(raw, "id", "Id"),
    appointmentDate: pick(raw, "appointmentDate", "AppointmentDate"),
    appointmentTime: pick(raw, "appointmentTime", "AppointmentTime"),
    status: pick(raw, "status", "Status"),
    clientFullName: pick(raw, "clientFullName", "ClientFullName"),
    clientEmail: pick(raw, "clientEmail", "ClientEmail"),
    carBrand: pick(raw, "carBrand", "CarBrand"),
    carModel: pick(raw, "carModel", "CarModel"),
    carVin: pick(raw, "carVin", "CarVin"),
    serviceTypeName: pick(raw, "serviceTypeName", "ServiceTypeName"),
    description: pick(raw, "description", "Description"),
  };
}

function normalizeCalendarResponse(raw) {
  return {
    workingDays: pick(raw, "workingDays", "WorkingDays") || [],
    closedDays: pick(raw, "closedDays", "ClosedDays") || [],
    days: pick(raw, "days", "Days") || [],
  };
}

function normalizeCalendarDay(d) {
  return {
    date: pick(d, "date", "Date"),
    appointments: (pick(d, "appointments", "Appointments") || []).map((a) => ({
      id: pick(a, "id", "Id"),
      title: pick(a, "title", "Title"),
      start: pick(a, "start", "Start"),
      status: pick(a, "status", "Status"),
      color: pick(a, "color", "Color"),
      description: pick(a, "description", "Description"),
    })),
  };
}

function isActiveStatus(s) {
  return s === "Accepted" || s === "InService" || s === "InProgress";
}

function isRejectedLike(s) {
  return s === "Rejected" || s === "Canceled";
}

function isGreenLike(s) {
  return isActiveStatus(s) || s === "Completed";
}

export default function ServiceAppointments() {
  const [serviceId, setServiceId] = useState(null);

 
  const [dailyFilter, setDailyFilter] = useState("AllActive");
  const [dailyList, setDailyList] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyErr, setDailyErr] = useState("");

 
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

 
  const [calOpen, setCalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState({ year: null, month: null });
  const [calLoading, setCalLoading] = useState(false);
  const [calErr, setCalErr] = useState("");
  const [calData, setCalData] = useState({ workingDays: [], closedDays: [], days: [] });

  const [selectedDate, setSelectedDate] = useState(fmtDateISO(new Date()));
  const [dayTab, setDayTab] = useState("Requested");

 
  const [manageReason, setManageReason] = useState("");
  const [manageOpen, setManageOpen] = useState(false);

 
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeId, setCompleteId] = useState(null);
  const [completeTitle, setCompleteTitle] = useState("");
  const [completeDesc, setCompleteDesc] = useState("");
  const [completeMileage, setCompleteMileage] = useState("");
  const [completeMileageError, setCompleteMileageError] = useState("");


  const calendarRef = useRef(null);
  const dayListRef = useRef(null);
  const lastCalFetchKeyRef = useRef("");

  const clearFeedback = () => {
    setActionError("");
    setActionSuccess("");
    setCalErr("");
    setDailyErr("");
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await ServiceProfileApi.get();
        const id = pick(p, "serviceId", "ServiceId", "id", "Id");
        if (!cancelled) setServiceId(Number(id) || 1);
      } catch {
        if (!cancelled) setServiceId(1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDaily = async () => {
    setDailyErr("");
    setDailyLoading(true);
    try {
      const data = await ServiceAppointmentsApi.daily({ filter: dailyFilter });
      setDailyList(Array.isArray(data) ? data.map(normalizeDaily) : []);
    } catch (e) {
      setDailyErr(e?.message || "Greška pri učitavanju termina.");
    } finally {
      setDailyLoading(false);
    }
  };

  useEffect(() => {
    loadDaily();
  }, [dailyFilter]);

  const loadCalendar = async ({ year, month } = {}) => {
    if (!serviceId) return;

    const y = Number(year);
    const m = Number(month);
    if (!y || !m) return;

    const fetchKey = `${y}-${String(m).padStart(2, "0")}`;
    if (lastCalFetchKeyRef.current === fetchKey) return;
    lastCalFetchKeyRef.current = fetchKey;

    setCalErr("");
    setCalLoading(true);
    try {
      const data = await ServiceCalendarApi.getCalendar({ year: y, month: m });
      const norm = normalizeCalendarResponse(data);

      const closedDays = (norm.closedDays || [])
        .map((x) => (typeof x === "string" ? x.slice(0, 10) : fmtDateISO(x)))
        .filter(Boolean);

      const days = (norm.days || []).map(normalizeCalendarDay);

      setCalData({
        ...norm,
        closedDays,
        days,
      });

      const day = days.find((d) => d.date === selectedDate);
      const hasRequested = (day?.appointments || []).some((a) => a.status === "Requested");
      setDayTab(hasRequested ? "Requested" : "Completed");
    } catch (e) {
      setCalErr(e?.message || "Greška pri učitavanju kalendara.");
    } finally {
      setCalLoading(false);
    }
  };

  useEffect(() => {
    if (!serviceId) return;
    const now = new Date();
    setCalendarMonth({ year: now.getFullYear(), month: now.getMonth() + 1 });
  }, [serviceId]);

  const selectedDay = useMemo(() => {
    return calData.days.find((d) => d.date === selectedDate) || { date: selectedDate, appointments: [] };
  }, [calData.days, selectedDate]);

  const dayIsClosed = useMemo(() => {
    return (calData.closedDays || []).includes(selectedDate);
  }, [calData.closedDays, selectedDate]);

  const dayList = useMemo(() => {
    const all = selectedDay.appointments || [];
    if (dayTab === "Requested") return all.filter((a) => a.status === "Requested");
    if (dayTab === "Active") return all.filter((a) => isActiveStatus(a.status));
    if (dayTab === "Completed") return all.filter((a) => a.status === "Completed");
    if (dayTab === "Rejected") return all.filter((a) => isRejectedLike(a.status));
    return all;
  }, [selectedDay.appointments, dayTab]);

  const dayCounts = useMemo(() => {
    const map = new Map();
    for (const d of calData.days || []) {
      const key = d.date;
      const counts = { blue: 0, green: 0, red: 0 };
      for (const a of d.appointments || []) {
        if (a.status === "Requested") counts.blue += 1;
        else if (isGreenLike(a.status)) counts.green += 1;
        else if (isRejectedLike(a.status)) counts.red += 1;
      }
      map.set(key, counts);
    }
    return map;
  }, [calData.days]);

  const runAction = async (fn, successMsg) => {
    setActionError("");
    setActionSuccess("");
    setCalErr("");

    setBusy(true);
    try {
      await fn();
      setActionSuccess(successMsg || "Uspešno sačuvano.");

      await loadDaily();
      if (calendarMonth.year && calendarMonth.month && calOpen) {
        lastCalFetchKeyRef.current = "";
        await loadCalendar({ year: calendarMonth.year, month: calendarMonth.month });
      }
    } catch (e) {
      setActionError(e?.message || "Greška.");
    } finally {
      setBusy(false);
    }
  };

  const openCalendar = () => {
    clearFeedback();
    setCalOpen(true);

    setManageOpen(false);
    setManageReason("");

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    setCalendarMonth({ year, month });
    lastCalFetchKeyRef.current = "";
    loadCalendar({ year, month });

    setTimeout(() => {
      try {
        calendarRef.current?.getApi?.()?.updateSize?.();
      } catch {}
    }, 0);
  };

  const closeCalendar = () => {
    if (busy) return;
    setCalOpen(false);
  };

  const onCalendarDatesSet = (arg) => {
    const d = arg?.view?.currentStart;
    if (!d) return;

    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    if (calendarMonth.year === year && calendarMonth.month === month) return;

    setCalendarMonth({ year, month });
    lastCalFetchKeyRef.current = "";
    loadCalendar({ year, month });
  };

  const ensureDefaultDayTab = (dateStr) => {
    const day = calData.days.find((d) => d.date === dateStr);
    const hasRequested = (day?.appointments || []).some((a) => a.status === "Requested");
    setDayTab(hasRequested ? "Requested" : "Completed");
  };

  const scrollToDayList = () => {
    requestAnimationFrame(() => {
      try {
        dayListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {}
    });
  };

  const onCalendarDateClick = (info) => {
    const dateStr = info?.dateStr;
    if (!dateStr) return;
    setSelectedDate(dateStr);
    ensureDefaultDayTab(dateStr);
    scrollToDayList();
  };

  const dayCellClassNames = (arg) => {
    const dateStr = fmtDateISO(arg.date);
    const classes = [];
    if (dateStr === selectedDate) classes.push("sappt-daySelected");
    if ((calData.closedDays || []).includes(dateStr)) classes.push("sappt-dayClosed");
    return classes;
  };

  const dayCellContent = (arg) => {
    const dateStr = fmtDateISO(arg.date);
    const counts = dayCounts.get(dateStr) || { blue: 0, green: 0, red: 0 };
    const isClosed = (calData.closedDays || []).includes(dateStr);

    const hasAny = counts.blue || counts.green || counts.red;

    return (
      <div className="sappt-dayCell">
        <div className="sappt-dayCellTop">
          {isClosed ? <div className="sappt-dayClosedLabel">ZATVORENO</div> : null}
          <div className="sappt-dayNum">{arg.dayNumberText}</div>
        </div>

        <div className="sappt-dayCellBottom">
          {hasAny ? (
            <div className="sappt-dayBadges">
              {counts.blue ? <span className="sappt-dayBadge is-blue">{counts.blue}</span> : null}
              {counts.green ? <span className="sappt-dayBadge is-green">{counts.green}</span> : null}
              {counts.red ? <span className="sappt-dayBadge is-red">{counts.red}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const toggleSelectedDay = async () => {
    if (!serviceId || !selectedDate) return;

    const isClosedNow = (calData.closedDays || []).includes(selectedDate);

    if (!isClosedNow) {
      await runAction(
        () =>
          ServiceCalendarApi.closeDay({
            dateStr: selectedDate,
            reason: (manageReason || "").trim() || null, 
          }),
        "Dan je zatvoren. Svi pending zahtevi za taj dan su odbijeni."
      );
      setManageReason("");
      return;
    }

    await runAction(async () => {
      const data = await ServiceCalendarApi.getClosedDayId({ dateStr: selectedDate });
      const id = Number(pick(data, "id", "Id")) || 0;
      if (!id) throw new Error("Ne mogu da otvorim dan jer backend ne vraća ID zatvorenog dana.");
      await ServiceCalendarApi.deleteClosedDay(id);
    }, "Dan je ponovo otvoren.");
  };

  const openCancel = (id) => {
    setActionError("");
    setActionSuccess("");
    setCancelOpen(true);
    setCancelId(id);
    setCancelReason("");
  };

  const openReject = (id) => {
    setActionError("");
    setActionSuccess("");
    setRejectOpen(true);
    setRejectId(id);
    setRejectReason("");
  };

  const openComplete = (id) => {
    setActionError("");
    setActionSuccess("");
    setCompleteOpen(true);
    setCompleteId(id);
    setCompleteTitle("");
    setCompleteDesc("");
    setCompleteMileage("");
    setCompleteMileageError("");
  };


  const closeAllModals = () => {
    if (busy) return;
    setCancelOpen(false);
    setCancelId(null);
    setRejectOpen(false);
    setRejectId(null);
    setCompleteOpen(false);
    setCompleteId(null);
  };

  const canCancel = (status) => {
    return status !== "Completed" && status !== "Canceled" && status !== "Rejected";
  };

  const showTopFeedback = !calOpen && !cancelOpen && !rejectOpen && !completeOpen;

  return (
    <div className="sappt">
      <div className="sappt-head">
        <div>
          <h1 className="sappt-title">Termini</h1>
          <div className="sappt-tabs" style={{ marginTop: 8 }}>
            {DAILY_FILTERS.map((f) => (
              <button
                key={f.key}
                className={`sappt-pill ${dailyFilter === f.key ? "is-active" : ""}`}
                onClick={() => setDailyFilter(f.key)}
                type="button"
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sappt-headRight">
          <button type="button" className="sappt-btn is-primary" onClick={openCalendar}>
            Kalendar
          </button>
          <button type="button" className="sappt-btn" onClick={loadDaily} disabled={dailyLoading}>
            Osveži
          </button>
        </div>
      </div>

      {showTopFeedback ? (
        <>
          {dailyErr ? <div className="sappt-alert is-error">{dailyErr}</div> : null}
          {actionError ? <div className="sappt-alert is-error">{actionError}</div> : null}
          {actionSuccess ? <div className="sappt-alert">{actionSuccess}</div> : null}
        </>
      ) : null}

      <section>
        {dailyLoading ? (
          <div className="sappt-alert">Učitavanje…</div>
        ) : dailyList.length === 0 ? (
          <div className="sappt-alert">Nema termina za prikaz (za ovaj filter).</div>
        ) : (
          <div className="sappt-list">
            {dailyList.map((a) => (
              <article key={a.id} className="sappt-item sappt-item--nice">
                <div className="sappt-itemTop">
                  <div style={{ width: "100%" }}>
                    <div className="sappt-itemHeaderRow">
                      <h3 className="sappt-itemTitle">
                        {fmtDate(a.appointmentDate)} {fmtTime(a.appointmentTime)}
                      </h3>
                      <div className={badgeClass(a.status)}>{STATUS_LABEL[a.status] || a.status}</div>
                    </div>

                    <div className="sappt-meta sappt-meta--grid">
                      <div className="sappt-metaRow">
                        <span className="sappt-metaLabel">Klijent</span>
                        <span className="sappt-metaVal">
                          {a.clientFullName || "—"}
                          {a.clientEmail ? ` (${a.clientEmail})` : ""}
                        </span>
                      </div>

                      <div className="sappt-metaRow">
                        <span className="sappt-metaLabel">Vozilo</span>
                        <span className="sappt-metaVal">
                          {[a.carBrand, a.carModel].filter(Boolean).join(" ") || "—"}
                          {a.carVin ? ` (${a.carVin})` : ""}
                        </span>
                      </div>

                      <div className="sappt-metaRow">
                        <span className="sappt-metaLabel">Usluga</span>
                        <span className="sappt-metaVal">{a.serviceTypeName || "—"}</span>
                      </div>

                      {a.description ? (
                        <div className="sappt-metaRow sappt-metaRow--full">
                          <span className="sappt-metaLabel">Napomena</span>
                          <span className="sappt-metaVal">{a.description}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="sappt-actions">
                  {a.status === "Accepted" ? (
                    <button
                      type="button"
                      className="sappt-btn is-primary"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          () => ServiceAppointmentsApi.arrived(a.id),
                          "Vozilo je označeno kao stiglo (InService)."
                        )
                      }
                    >
                      Vozilo stiglo
                    </button>
                  ) : null}

                  {a.status === "InService" ? (
                    <button
                      type="button"
                      className="sappt-btn is-primary"
                      disabled={busy}
                      onClick={() => runAction(() => ServiceAppointmentsApi.start(a.id), "Rad je započet (InProgress).")}
                    >
                      Započni rad
                    </button>
                  ) : null}

                  {a.status === "InProgress" ? (
                    <>
                      <button
                        type="button"
                        className="sappt-btn"
                        disabled={busy}
                        onClick={() => runAction(() => ServiceAppointmentsApi.pause(a.id), "Rad je pauziran (InService).")}
                      >
                        Pauziraj
                      </button>
                      <button type="button" className="sappt-btn is-primary" disabled={busy} onClick={() => openComplete(a.id)}>
                        Završi termin
                      </button>
                    </>
                  ) : null}

                  {canCancel(a.status) ? (
                    <button type="button" className="sappt-btn is-danger" disabled={busy} onClick={() => openCancel(a.id)}>
                      Otkaži
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {calOpen && (
        <div className="sappt-modalOverlay" onMouseDown={closeCalendar}>
          <div className="sappt-modal sappt-modal--wide" onMouseDown={(e) => e.stopPropagation()}>
            <div className="sappt-calHeader">
              <div>
                <h3 className="sappt-modalTitle" style={{ margin: 0 }}>
                  Kalendar termina
                </h3>
                <div className="sappt-calSub">
                  Izabran dan: <strong>{selectedDate}</strong>{" "}
                  <span className={`sappt-dayState ${dayIsClosed ? "is-closed" : "is-open"}`}>
                    {dayIsClosed ? "ZATVOREN" : "OTVOREN"}
                  </span>
                </div>
              </div>

              <div className="sappt-calHeaderActions">
                <button
                  type="button"
                  className="sappt-btn"
                  onClick={() => setManageOpen((v) => !v)}
                  disabled={busy}
                >
                  {manageOpen ? "Sakrij upravljanje" : "Upravljanje danom"}
                </button>
                <button type="button" className="sappt-btn" onClick={closeCalendar} disabled={busy}>
                  Zatvori
                </button>
              </div>
            </div>

            {calErr ? <div className="sappt-alert is-error">{calErr}</div> : null}
            {calLoading ? <div className="sappt-alert">Učitavanje kalendara…</div> : null}
            {actionError ? <div className="sappt-alert is-error">{actionError}</div> : null}
            {actionSuccess ? <div className="sappt-alert">{actionSuccess}</div> : null}

            {manageOpen && (
              <div className="sappt-manageDay">
                <div className="sappt-manageLeft">
                  <div className="sappt-label">Razlog (opciono, samo pri zatvaranju dana)</div>
                  <input
                    className="sappt-input"
                    value={manageReason}
                    onChange={(e) => setManageReason(e.target.value)}
                    disabled={busy || dayIsClosed}
                    placeholder={dayIsClosed ? "Razlog nije potreban za otvaranje." : "Npr. godišnji odmor, radovi..."}
                  />
                </div>

                <div className="sappt-manageRight">
                  <button
                    type="button"
                    className={`sappt-btn ${dayIsClosed ? "is-primary" : "is-danger"}`}
                    disabled={busy || !serviceId}
                    onClick={toggleSelectedDay}
                    title="Zatvori ili otvori trenutno izabrani dan"
                  >
                    {dayIsClosed ? "Otvori dan" : "Zatvori dan"}
                  </button>
                </div>
              </div>
            )}

            <div className="sappt-calWrap" style={{ marginTop: 10 }}>
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                firstDay={1}
                height="auto"
                events={[]}
                eventDisplay="none"
                dayMaxEventRows={0}
                datesSet={onCalendarDatesSet}
                dateClick={onCalendarDateClick}
                dayCellClassNames={dayCellClassNames}
                dayCellContent={dayCellContent}
                headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
              />
            </div>

            <div className="sappt-divider" />

            <div ref={dayListRef} className="sappt-panelTitle">
              Termini za dan: {selectedDate}
            </div>

            <div className="sappt-tabs" style={{ marginBottom: 10 }}>
              {DAY_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`sappt-pill ${dayTab === t.key ? "is-active" : ""}`}
                  onClick={() => setDayTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {dayList.length === 0 ? (
              <div className="sappt-alert">Nema termina za izabrani filter.</div>
            ) : (
              <div className="sappt-list">
                {dayList.map((a) => (
                  <article key={a.id} className="sappt-item sappt-item--compact">
                    <div className="sappt-itemTop">
                      <div style={{ width: "100%" }}>
                        <div className="sappt-itemHeaderRow">
                          <h3 className="sappt-itemTitle">{a.title || `Termin #${a.id}`}</h3>
                          <div className={badgeClass(a.status)}>{STATUS_LABEL[a.status] || a.status}</div>
                        </div>

                        <div className="sappt-meta">
                          <div>
                            <strong>Vreme:</strong> {fmtDate(a.start)}{" "}
                            {new Date(a.start).toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          {a.description ? (
                            <div>
                              <strong>Opis:</strong> {a.description}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {a.status === "Requested" ? (
                      <div className="sappt-actions">
                        <button
                          type="button"
                          className="sappt-btn is-primary"
                          disabled={busy}
                          onClick={() =>
                            runAction(
                              () => ServiceCalendarApi.decide({ appointmentId: a.id, isAccepted: true }),
                              "Zahtev je prihvaćen."
                            )
                          }
                        >
                          Prihvati
                        </button>
                        <button type="button" className="sappt-btn is-danger" disabled={busy} onClick={() => openReject(a.id)}>
                          Odbij
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {cancelOpen && (
        <div className="sappt-modalOverlay" onMouseDown={closeAllModals}>
          <div className="sappt-modal" onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(560px, 100%)" }}>
            <h3 className="sappt-modalTitle">Otkazivanje termina</h3>

            {actionError ? <div className="sappt-alert is-error">{actionError}</div> : null}
            {actionSuccess ? <div className="sappt-alert">{actionSuccess}</div> : null}

            <div className="sappt-field" style={{ marginTop: 0 }}>
              <div className="sappt-label">Razlog (opciono)</div>
              <textarea
                className="sappt-textarea"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                disabled={busy}
                placeholder="Npr. nema slobodnih resursa..."
              />
            </div>

            <div className="sappt-modalActions">
              <button type="button" className="sappt-btn" onClick={closeAllModals} disabled={busy}>
                Odustani
              </button>
              <button
                type="button"
                className="sappt-btn is-danger"
                disabled={busy}
                onClick={() =>
                  runAction(() => ServiceAppointmentsApi.cancel(cancelId, cancelReason || null), "Termin je otkazan.").then(() => {
                    setCancelOpen(false);
                    setCancelId(null);
                    setCancelReason("");
                  })
                }
              >
                Otkaži termin
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectOpen && (
        <div className="sappt-modalOverlay" onMouseDown={closeAllModals}>
          <div className="sappt-modal" onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(560px, 100%)" }}>
            <h3 className="sappt-modalTitle">Odbijanje zahteva</h3>

            {actionError ? <div className="sappt-alert is-error">{actionError}</div> : null}
            {actionSuccess ? <div className="sappt-alert">{actionSuccess}</div> : null}

            <div className="sappt-field" style={{ marginTop: 0 }}>
              <div className="sappt-label">Razlog (obavezno)</div>
              <textarea
                className="sappt-textarea"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={busy}
                placeholder="Npr. servis je zatvoren..."
              />
            </div>

            <div className="sappt-modalActions">
              <button type="button" className="sappt-btn" onClick={closeAllModals} disabled={busy}>
                Odustani
              </button>
              <button
                type="button"
                className="sappt-btn is-danger"
                disabled={busy || !rejectReason.trim()}
                onClick={() =>
                  runAction(() => ServiceAppointmentsApi.reject(rejectId, rejectReason.trim()), "Zahtev je odbijen.").then(() => {
                    setRejectOpen(false);
                    setRejectId(null);
                    setRejectReason("");
                  })
                }
              >
                Odbij zahtev
              </button>
            </div>
          </div>
        </div>
      )}

      {completeOpen && (
        <div className="sappt-modalOverlay" onMouseDown={closeAllModals}>
          <div className="sappt-modal" onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(620px, 100%)" }}>
            <h3 className="sappt-modalTitle">Završetak termina (unos u istoriju)</h3>

            {actionError ? <div className="sappt-alert is-error">{actionError}</div> : null}
            {actionSuccess ? <div className="sappt-alert">{actionSuccess}</div> : null}

            <div className="sappt-field" style={{ marginTop: 0 }}>
              <div className="sappt-label">Naslov (obavezno)</div>
              <input
                className="sappt-input"
                value={completeTitle}
                onChange={(e) => setCompleteTitle(e.target.value)}
                disabled={busy}
                placeholder="Npr. Mali servis"
              />
            </div>

            <div className="sappt-field">
              <div className="sappt-label">Opis (obavezno)</div>
              <textarea
                className="sappt-textarea"
                value={completeDesc}
                onChange={(e) => setCompleteDesc(e.target.value)}
                disabled={busy}
                placeholder="Šta je urađeno..."
              />
            </div>

            <div className="sappt-field">
              <div className="sappt-label">Kilometraža (obavezno)</div>
              <input
                className={`sappt-input ${completeMileageError ? "is-error" : ""}`}
                value={completeMileage}
                onChange={(e) => {
                  const val = e.target.value;
                  setCompleteMileage(val);

                  if (!/^\d+$/.test(val)) {
                    setCompleteMileageError("Kilometraža mora biti ceo broj.");
                  } else if (Number(val) <= 0) {
                    setCompleteMileageError("Kilometraža mora biti veća od 0.");
                  } else {
                    setCompleteMileageError("");
                  }
                }}
                disabled={busy}
                inputMode="numeric"
                placeholder="Npr. 153200"
              />
              {completeMileageError && (
                <div className="sappt-fieldError">
                  {completeMileageError}
                </div>
              )}

            </div>

            <div className="sappt-modalActions">
              <button type="button" className="sappt-btn" onClick={closeAllModals} disabled={busy}>
                Odustani
              </button>
              <button
                type="button"
                className="sappt-btn is-primary"
                disabled={
                  busy ||
                  !completeTitle.trim() ||
                  !completeDesc.trim() ||
                  !!completeMileageError
                }
                onClick={() =>
                  runAction(
                    () =>
                      ServiceAppointmentsApi.complete(completeId, {
                        title: completeTitle.trim(),
                        description: completeDesc.trim(),
                        mileage: Number(completeMileage),
                      }),
                    "Termin je završen i upisan u istoriju vozila."
                  ).then(() => {
                    setCompleteOpen(false);
                    setCompleteId(null);
                  })
                }
              >
                Sačuvaj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}