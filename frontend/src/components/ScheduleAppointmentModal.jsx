import { DEMO_MODE } from "../api/baseUrl";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

import { ClientAppointmentsApi } from "../api/clientAppointmentsApi";
import { getServiceTypes } from "../api/publicServicesApi";
import { ClientCarsApi } from "../api/clientCars";

function isoDay(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

function toStartOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isNeradanReason(reason) {
  const r = String(reason || "").trim().toLowerCase();
  return r.includes("neradan");
}

function parseWorkingDaysToSet(raw) {
  const set = new Set();

  if (raw == null) return set;

  const mapEngFull = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const mapEngShort = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };

  const mapSrShort = {
    ned: 0,
    pon: 1,
    uto: 2,
    sre: 3,
    cet: 4,
    čet: 4,
    pet: 5,
    sub: 6,
  };

  const mapSrFull = {
    nedelja: 0,
    ponedeljak: 1,
    utorak: 2,
    sreda: 3,
    cetvrtak: 4,
    četvrtak: 4,
    petak: 5,
    subota: 6,
  };

  const tokens = (() => {
    if (Array.isArray(raw)) return raw;
    const s = String(raw).trim();
    if (!s) return [];
    return s.split(/[,\s]+/g);
  })();

  for (const t0 of tokens) {
    const t = String(t0 || "").trim();
    if (!t) continue;

    if (/^\d+$/.test(t)) {
      const n = Number(t);

      if (n >= 0 && n <= 6) {
        set.add(n);
        continue;
      }

      if (n >= 1 && n <= 7) {
        const js = n === 7 ? 0 : n; 
        set.add(js);
        continue;
      }
    }

    const key = t.toLowerCase();

    if (mapSrShort[key] !== undefined) {
      set.add(mapSrShort[key]);
      continue;
    }

    if (mapSrFull[key] !== undefined) {
      set.add(mapSrFull[key]);
      continue;
    }

    if (mapEngShort[key] !== undefined) {
      set.add(mapEngShort[key]);
      continue;
    }

    if (mapEngFull[key] !== undefined) {
      set.add(mapEngFull[key]);
      continue;
    }
  }

  return set;
}

export default function AppointmentSchedulerModal({
  isOpen,
  onClose,
  serviceId,
  serviceName,
  serviceTypeNames = [],
}) {
  const navigate = useNavigate();

  const [step, setStep] = useState("calendar"); 
  const [selectedDate, setSelectedDate] = useState(""); 

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [calendar, setCalendar] = useState(null);
  const [cars, setCars] = useState([]);
  const [types, setTypes] = useState([]);

  const [carId, setCarId] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);

  const allowedTypeNameSet = useMemo(() => {
    return new Set((serviceTypeNames || []).map(normalizeName).filter(Boolean));
  }, [serviceTypeNames]);

  const filteredTypes = useMemo(() => {
    if (!Array.isArray(types) || !types.length) return [];
    if (!allowedTypeNameSet.size) return types;
    return types.filter((t) => allowedTypeNameSet.has(normalizeName(t?.name)));
  }, [types, allowedTypeNameSet]);

  
  const range = useMemo(() => {
    const today = toStartOfDay(new Date());
    const lastInclusive = addDays(today, 30);
    const endExclusive = addDays(lastInclusive, 1);
    return { today, lastInclusive, endExclusive };
  }, []);

  
  const workingDaysSet = useMemo(() => {
    const raw =
      calendar?.workingDays ??
      calendar?.WorkingDays ??
      calendar?.serviceWorkingDays ??
      calendar?.ServiceWorkingDays ??
      calendar?.workDays ??
      calendar?.WorkDays ??
      null;

    return parseWorkingDaysToSet(raw);
  }, [calendar]);

  
  const unavailableAll = useMemo(() => {
    return Array.isArray(calendar?.unavailableDays) ? calendar.unavailableDays : [];
  }, [calendar]);

  const unavailableSet = useMemo(() => {
    const set = new Set();
    unavailableAll.forEach((u) => {
      const key = isoDay(u?.date);
      if (key) set.add(key);
    });
    return set;
  }, [unavailableAll]);

  
  const closedReasonByDay = useMemo(() => {
    const map = new Map();
    unavailableAll.forEach((u) => {
      const key = isoDay(u?.date);
      if (!key) return;
      const reason = u?.reason || "";
      if (isNeradanReason(reason)) return;
      map.set(key, String(reason || "").trim() || "Zatvoreno");
    });
    return map;
  }, [unavailableAll]);

  useEffect(() => {
    if (!isOpen) return;

    setStep("calendar");
    setSelectedDate("");
    setError("");
    setSuccessMsg("");
    setTimeStr("");
    setDescription("");

    let mounted = true;
    setLoading(true);

    Promise.all([
      ClientAppointmentsApi.getServiceCalendar(serviceId),
      ClientCarsApi.list(),
      getServiceTypes(),
    ])
      .then(([cal, carList, allTypes]) => {
        if (!mounted) return;

        setCalendar(cal || null);
        setCars(Array.isArray(carList) ? carList : []);
        setTypes(Array.isArray(allTypes) ? allTypes : []);

        const firstCarId =
          Array.isArray(carList) && carList.length ? String(carList[0].id) : "";
        setCarId(firstCarId);

        const ft = Array.isArray(allTypes) ? allTypes : [];
        const possible = allowedTypeNameSet.size
          ? ft.filter((t) => allowedTypeNameSet.has(normalizeName(t?.name)))
          : ft;

        setServiceTypeId(possible.length ? String(possible[0].id) : "");
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || "Greška pri učitavanju kalendara/vozila/usluga.");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [isOpen, serviceId, allowedTypeNameSet]);

  function close() {
    if (saving) return;
    onClose?.();
  }

  function isOutOfRange(dayStr) {
    const d = toStartOfDay(new Date(dayStr));
    if (Number.isNaN(d.getTime())) return true;
    if (d < range.today) return true;
    if (d > range.lastInclusive) return true;
    return false;
  }

  function isNotWorkingDay(dayStr) {
    if (!workingDaysSet.size) return false;

    const d = toStartOfDay(new Date(dayStr));
    if (Number.isNaN(d.getTime())) return false;

    return !workingDaysSet.has(d.getDay());
  }

  function onDateClick(arg) {
    const day = arg?.dateStr; 
    if (!day) return;

    if (isOutOfRange(day)) return;

    if (isNotWorkingDay(day)) return;

    
    if (unavailableSet.has(day)) {
      const reason = closedReasonByDay.get(day);
      if (reason) {
        setSuccessMsg("");
        setError(reason);
      }
      return;
    }

    setError("");
    setSuccessMsg("");
    setSelectedDate(day);
    setStep("form");
  }

  function goBack() {
    setError("");
    setSuccessMsg("");
    setStep("calendar");
  }

  function goToCars() {
    close();
    navigate("/dashboard/cars");
  }

  async function submit() {
    setError("");
    setSuccessMsg("");

    if (!selectedDate) return setError("Izaberi datum.");
    if (!carId) return setError("Izaberi automobil.");
    if (!serviceTypeId) return setError("Izaberi uslugu.");

    const t = String(timeStr || "").trim();
    if (t && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) {
      return setError("Vreme mora biti u formatu HH:mm (npr. 09:30).");
    }

    try {
      setSaving(true);

      await ClientAppointmentsApi.create({
        serviceId,
        carId,
        serviceTypeId,
        dateStr: selectedDate,
        timeStr: t || null,
        description,
      });

      
      const car = (cars || []).find((c) => String(c?.id ?? c?.Id) === String(carId));

      const brand = car?.brandName ?? "";
      const model = car?.modelName ?? "";

      const vin = car?.vin ?? car?.VIN ?? car?.Vin ?? "";
      const plate =
        car?.licensePlate ??
        car?.LicensePlate ??
        car?.plateNumber ??
        car?.PlateNumber ??
        "";

      const carName = `${brand} ${model}`.trim();
      const carText = carName || vin || plate || "—";

      
      const st =
        (filteredTypes || []).find((x) => String(x?.id ?? x?.Id) === String(serviceTypeId)) ||
        (types || []).find((x) => String(x?.id ?? x?.Id) === String(serviceTypeId));

      const serviceTypeText = st?.name ?? st?.Name ?? "-";

      setStep("success");
      setSuccessMsg(
        `Termin je uspešno zakazan.\n\n` +
          `Datum: ${new Date(selectedDate).toLocaleDateString()}\n` +
          `Automobil: ${carText}${vin && carName ? ` — VIN: ${vin}` : ""}\n` +
          `Usluga: ${serviceTypeText}\n` +
          (t ? `Vreme: ${t}\n` : "") +
          (String(description || "").trim() ? `Opis: ${String(description).trim()}` : "")
      );
    } catch (e) {
      setSuccessMsg("");
      setError(e?.message || "Greška pri zakazivanju termina.");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="sp-modalOverlay" role="dialog" aria-modal="true">
      <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sp-modalHeader">
          <div className="sp-modalTitle">
            Zakaži termin{serviceName ? ` — ${serviceName}` : ""}
          </div>
          <button type="button" className="sp-modalClose" onClick={close} aria-label="Zatvori">
            ×
          </button>
        </div>

        <div className="sp-modalBody">
          {loading ? <div className="panel">Učitavanje...</div> : null}
          {!loading && error ? <div className="panel panel--error">{error}</div> : null}
          {!loading && successMsg ? <div className="panel panel--success">{successMsg}</div> : null}

          {!loading && step === "calendar" ? (
            <>
              <div className="sp-calendarWrap">
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{ left: "prev,next", center: "title", right: "" }}
                  height="auto"
                  fixedWeekCount={false}
                  showNonCurrentDates={false}
                  firstDay={1}
                  validRange={{ start: range.today, end: range.endExclusive }}
                  dateClick={onDateClick}
                  dayCellContent={DEMO_MODE ? (arg) => {
                    const day = isoDay(arg.date);
                    const disabled = isOutOfRange(day) || isNotWorkingDay(day) || unavailableSet.has(day);
                    return <button type="button" className="demo-day" aria-label={"Izaberi " + day}
                      disabled={disabled} onClick={(event) => { event.stopPropagation(); onDateClick({ dateStr: day }); }}>
                      {arg.dayNumberText}
                    </button>;
                  } : undefined}
                  dayCellClassNames={(arg) => {
                    const key = isoDay(arg.date);

                    if (isOutOfRange(key)) return ["sp-fcDayOutRange"];
                    if (isNotWorkingDay(key)) return ["sp-fcDayNotWorking"];
                    if (unavailableSet.has(key)) return ["sp-fcDayDisabled"];
                    return ["sp-fcDayEnabled"];
                  }}
                  dayCellDidMount={(info) => {
                    const key = isoDay(info.date);
                    if (!key) return;

                    
                    const reason = closedReasonByDay.get(key);
                    if (!reason) return;

                    
                    info.el.setAttribute("title", reason);

                    const top = info.el.querySelector?.(".fc-daygrid-day-bottom");
                    if (!top) return;

                    
                    const existing = info.el.querySelector?.(".sp-dayClosedTag");
                    if (existing) existing.remove();

                    const tag = document.createElement("span");
                    tag.className = "sp-dayClosedTag";
                    tag.innerHTML = `
                      <span class="sp-dayClosedTagText">${String(reason)}</span>
                      <span class="sp-dayClosedTagIcon" aria-hidden="true">×</span>
                    `;
                    top.appendChild(tag);
                  }}
                />
              </div>
            </>
          ) : null}

          {!loading && step === "form" ? (
            <>
              <div className="sp-formGrid">
                <div className="sp-formRow">
                  <div className="sp-formLabel">Datum</div>
                  <div className="sp-formValue">
                    <b>{new Date(selectedDate).toLocaleDateString()}</b>
                  </div>
                </div>

                <div className="sp-formRow">
                  <label className="sp-formLabel" htmlFor="appt-car">
                    Automobil
                  </label>
                  <div className="sp-formValue">
                    <select
                      id="appt-car"
                      className="side-select"
                      value={carId}
                      onChange={(e) => setCarId(e.target.value)}
                    >
                      {cars.map((c) => {
                        const id = c?.id ?? c?.Id;
                        const brand =
                          c?.brandName ?? c?.BrandName ?? c?.carBrand ?? c?.CarBrand ?? "";
                        const model =
                          c?.modelName ?? c?.ModelName ?? c?.carModel ?? c?.CarModel ?? "";
                        const vin = c?.vin ?? c?.VIN ?? c?.Vin ?? "";

                        return (
                          <option key={id} value={id}>
                            {`${brand} ${model}`.trim() || "Automobil"}
                            {vin ? ` - VIN: ${vin}` : ""}
                          </option>
                        );
                      })}
                    </select>

                    {!cars.length ? (
                      <div className="muted" style={{ marginTop: 6 }}>
                        Nemaš nijedan automobil. Dodaj novi da bi mogao da zakažeš.
                      </div>
                    ) : null}

                    {!DEMO_MODE && <button type="button" className="btn-ghost" onClick={goToCars}>
                      Dodaj/uredi automobile
                    </button>}
                  </div>
                </div>

                <div className="sp-formRow">
                  <label className="sp-formLabel" htmlFor="appt-type">
                    Usluga
                  </label>
                  <div className="sp-formValue">
                    <select
                      id="appt-type"
                      className="side-select"
                      value={serviceTypeId}
                      onChange={(e) => setServiceTypeId(e.target.value)}
                    >
                      {filteredTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>

                    {!filteredTypes.length ? (
                      <div className="muted" style={{ marginTop: 6 }}>
                        Ovaj servis nema definisane usluge (ili nije moguće upariti nazive).
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="sp-formRow">
                  <label className="sp-formLabel" htmlFor="appt-time">
                    Vreme (opciono)
                  </label>
                  <div className="sp-formValue">
                    <input
                      id="appt-time"
                      className="side-input"
                      value={timeStr}
                      onChange={(e) => setTimeStr(e.target.value)}
                      placeholder="HH:mm (npr. 09:30) ili prazno"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                {!DEMO_MODE && <div className="sp-formRow">
                  <label className="sp-formLabel" htmlFor="appt-desc">
                    Opis (opciono)
                  </label>
                  <div className="sp-formValue">
                    <textarea
                      id="appt-desc"
                      className="side-input"
                      style={{ minHeight: 90, resize: "vertical" }}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Npr. škripanje, vibracije, servis..."
                    />
                  </div>
                </div>}
              </div>

              <div className="sp-modalFooter">
                <div className="sp-modalFooterRight">
                  <button type="button" className="btn-ghost" onClick={goBack} disabled={saving}>
                    Nazad
                  </button>
                  <button type="button" className="btn-primary" onClick={submit} disabled={saving}>
                    {saving ? "Slanje..." : "Pošalji zahtev"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <button type="button" className="sp-modalOverlayClick" onClick={close} aria-label="Zatvori" />
    </div>
  );
}