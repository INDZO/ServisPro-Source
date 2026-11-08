import { useEffect, useMemo, useState } from "react";
import { ClientAppointmentsApi } from "../../../../api/clientAppointmentsApi";
import "../../../../styles/clientAppointments.css";

const STATUS_LABEL = {
  Requested: "Na čekanju",
  Accepted: "Prihvaćen",
  InService: "U servisu",
  InProgress: "U radu",
  Completed: "Završen",
  Canceled: "Otkazan",
  Rejected: "Odbijen",
};

const FILTERS = [
  { key: "active", label: "Aktivni" },
  { key: "all", label: "Svi" },
  { key: "Requested", label: STATUS_LABEL.Requested },
  { key: "Accepted", label: STATUS_LABEL.Accepted },
  { key: "InService", label: STATUS_LABEL.InService },
  { key: "InProgress", label: STATUS_LABEL.InProgress },
  { key: "Completed", label: STATUS_LABEL.Completed },
  { key: "Canceled", label: STATUS_LABEL.Canceled },
  { key: "Rejected", label: STATUS_LABEL.Rejected },
];

function fmtDate(dateLike) {
  if (!dateLike) return "-";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("sr-RS");
}

function fmtTime(timeSpan) {
  if (!timeSpan) return "";
  const m = String(timeSpan).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function isActiveStatus(status) {
  return status !== "Completed" && status !== "Canceled" && status !== "Rejected";
}

function canCancel(status) {
  return status === "Requested" || status === "Accepted";
}

function badgeClass(status) {
  return `cappt-badge is-${String(status || "").toLowerCase()}`;
}

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined) return obj[k];
  }
}

function normalizeAppointment(raw) {
  return {
    id: pick(raw, "id", "Id"),
    appointmentDate: pick(raw, "appointmentDate", "AppointmentDate"),
    appointmentTime: pick(raw, "appointmentTime", "AppointmentTime"),
    status: pick(raw, "status", "Status"),
    serviceName: pick(raw, "serviceName", "ServiceName"),
    carBrand: pick(raw, "brandName", "BrandName", "carBrand", "CarBrand"),
    carModel: pick(raw, "modelName", "ModelName", "carModel", "CarModel"),
    carVin: pick(raw, "carVin", "CarVin", "VIN", "vin"),
    serviceTypeName: pick(raw, "serviceTypeName", "ServiceTypeName"),
  };
}

export default function ClientAppointments() {
  const [filter, setFilter] = useState("active");
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);

  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const status = filter !== "active" && filter !== "all" ? filter : undefined;
      const data = await ClientAppointmentsApi.list({ status });
      setAll(Array.isArray(data) ? data.map(normalizeAppointment) : []);
    } catch (e) {
      setErr(e?.message || "Greška pri učitavanju termina.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const list = useMemo(() => {
    if (filter === "active") return all.filter((a) => isActiveStatus(a.status));
    return all;
  }, [all, filter]);

  const openCancel = (id) => {
    setCancelId(id);
    setCancelReason("");
    setCancelError("");
    setCancelSuccess(false);
    setCancelOpen(true);
  };

  const closeCancel = () => {
    if (cancelBusy) return;
    setCancelOpen(false);
    setCancelId(null);
    setCancelReason("");
    setCancelError("");
    setCancelSuccess(false);
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    setCancelBusy(true);
    setCancelError("");

    try {
      await ClientAppointmentsApi.cancel({
        id: cancelId,
        reason: cancelReason || null,
      });

      setAll((prev) =>
        prev.map((x) => (x.id === cancelId ? { ...x, status: "Canceled" } : x))
      );

      setCancelSuccess(true);
    } catch (e) {
      setCancelError(e?.message || "Termin nije moguće otkazati.");
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <div className="cappt">
      <div className="cappt-head">
        <h1 className="cappt-title">Termini</h1>

        <div className="cappt-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`cappt-pill ${filter === f.key ? "is-active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {err && <div className="cappt-alert is-error">{err}</div>}

      {loading ? (
        <div className="cappt-alert">Učitavanje…</div>
      ) : list.length === 0 ? (
        <div className="cappt-alert">Nema termina.</div>
      ) : (
        <div className="cappt-list">
          {list.map((a) => (
            <article key={a.id} className="cappt-item">
              <div className="cappt-item-top">
                <div>
                  <h3 className="cappt-service">{a.serviceName}</h3>
                  <div className="cappt-meta">
                    <div>
                      <strong>Datum:</strong> {fmtDate(a.appointmentDate)}{" "}
                      {fmtTime(a.appointmentTime)}
                    </div>
                    <div>
                      <strong>Vozilo:</strong>{" "}
                      {[a.carBrand, a.carModel].filter(Boolean).join(" ") || "—"}
                      {a.carVin ? ` (${a.carVin})` : ""}
                    </div>
                    <div>
                      <strong>Usluga:</strong> {a.serviceTypeName || "—"}
                    </div>
                  </div>
                </div>

                <div className={badgeClass(a.status)}>
                  {STATUS_LABEL[a.status] || a.status}
                </div>
              </div>

              {canCancel(a.status) && (
                <div className="cappt-actions">
                  <button
                    className="cappt-btn is-danger"
                    onClick={() => openCancel(a.id)}
                  >
                    Otkaži termin
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {cancelOpen && (
        <div className="cappt-modalOverlay">
          <div className="cappt-modal">
            <h3 className="cappt-modalTitle">Otkazivanje termina</h3>

            {cancelError && (
              <div className="cappt-alert is-error">{cancelError}</div>
            )}

            {cancelSuccess ? (
              <>
                <div className="cappt-alert">
                  Termin je uspešno otkazan.
                </div>

                {cancelReason?.trim() && (
                  <div className="cappt-meta" style={{ marginTop: 8 }}>
                    <strong>Razlog otkazivanja:</strong> {cancelReason}
                  </div>
                )}
              </>
            ) : (
              <>
                <textarea
                  className="cappt-textarea"
                  placeholder="Razlog (opciono)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={cancelBusy}
                />

                <div className="cappt-modalActions">
                  <button
                    className="cappt-btn"
                    onClick={closeCancel}
                    disabled={cancelBusy}
                  >
                    Odustani
                  </button>
                  <button
                    className="cappt-btn is-danger"
                    onClick={confirmCancel}
                    disabled={cancelBusy}
                  >
                    {cancelBusy ? "Otkazujem…" : "Potvrdi otkazivanje"}
                  </button>
                </div>
              </>
            )}

            {cancelSuccess && (
              <div className="cappt-modalActions">
                <button className="cappt-btn" onClick={closeCancel}>
                  Zatvori
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}