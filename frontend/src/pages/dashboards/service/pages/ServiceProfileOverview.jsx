import React, { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../../api/baseUrl";
import { ServiceProfileApi } from "../../../../api/serviceProfileApi";
import { ProfileImageApi } from "../../../../api/profileImageApi";
import { getServiceDetails, getServiceTypes } from "../../../../api/publicServicesApi";
import StarRating from "../../../../components/StarRating";
import PasswordInput from "../../../../components/PasswordInput.jsx";
import "../../../../styles/serviceProfileOverview.css";

import "../../../../styles/Servisi.css";
import "../../../../styles/clientProfileOverview.css";

const REVIEW_SORT_OPTIONS = [
  { value: "date|desc", label: "Datum (najnovije)" },
  { value: "date|asc", label: "Datum (najstarije)" },
  { value: "rating|desc", label: "Ocena (opadajuće)" },
  { value: "rating|asc", label: "Ocena (rastuće)" },
];

const DEFAULT_SERVICE_IMAGE_URL =
  "https://res.cloudinary.com/dbdpwiidk/image/upload/v1767672295/vector-detailed-auto-repair-car-600nw-2489397017_wbtz6k.webp";

const WORKING_DAYS = [
  { value: "pon", label: "Ponedeljak" },
  { value: "uto", label: "Utorak" },
  { value: "sre", label: "Sreda" },
  { value: "cet", label: "Četvrtak" },
  { value: "pet", label: "Petak" },
  { value: "sub", label: "Subota" },
  { value: "ned", label: "Nedelja" },
];

const WORKING_DAY_ORDER = new Map(WORKING_DAYS.map((d, i) => [d.value, i]));
const WORKING_DAY_LABEL = new Map(WORKING_DAYS.map((d) => [d.value, d.label]));

const LABEL_TO_CODE = {
  ponedeljak: "pon",
  utorak: "uto",
  sreda: "sre",
  četvrtak: "cet",
  cetvrtak: "cet",
  petak: "pet",
  subota: "sub",
  nedelja: "ned",
};

function cls(...parts) {
  return parts.filter(Boolean).join(" ");
}

function normalizeImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function extractIframeSrc(v) {
  const s = String(v || "").trim();
  if (!s) return "";

  const m = s.match(/src\s*=\s*"([^"]+)"/i) || s.match(/src\s*=\s*'([^']+)'/i);
  return (m?.[1] ?? s).trim();
}

function uniqWorkingDayCodes(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];

  for (const raw of arr) {
    const s = String(raw || "").trim();
    if (!s) continue;

    const lowered = s.toLowerCase();

    if (WORKING_DAY_LABEL.has(lowered)) {
      if (!seen.has(lowered)) {
        seen.add(lowered);
        out.push(lowered);
      }
      continue;
    }

    const maybe = LABEL_TO_CODE[lowered];
    if (maybe && WORKING_DAY_LABEL.has(maybe)) {
      if (!seen.has(maybe)) {
        seen.add(maybe);
        out.push(maybe);
      }
    }
  }

  out.sort((a, b) => (WORKING_DAY_ORDER.get(a) ?? 999) - (WORKING_DAY_ORDER.get(b) ?? 999));
  return out;
}

function isDefaultImage(profile) {
  const publicId = profile?.imagePublicId ?? "";
  if (publicId) return false;
  const url = (profile?.imageUrl || "").trim();
  if (!url) return true;
  return url === DEFAULT_SERVICE_IMAGE_URL || url.startsWith(DEFAULT_SERVICE_IMAGE_URL);
}

function validateProfile(d) {
  const req = (label, v, min = 2) => {
    const s = (v || "").trim();
    if (!s) return `${label} ne može biti prazno.`;
    if (s.length < min) return `${label} mora imati najmanje ${min} karaktera.`;
    return "";
  };

  return (
    req("Naziv", d.name, 2) ||
    req("PIB", d.pib, 6) ||
    req("Adresa", d.adress, 2) ||
    req("Grad", d.city, 2) ||
    req("Radno vreme", d.workingHours, 2) ||
    req("Vlasnik", d.ownerFullName, 3) ||
    req("Telefon", d.phoneNumber, 6)
  );
}

function validatePassword({ currentPassword, newPassword, confirmPassword }) {
  const cur = String(currentPassword || "").trim();
  const next = String(newPassword || "").trim();
  const conf = String(confirmPassword || "").trim();

  if (!cur) return "Unesi trenutnu lozinku.";
  if (!next) return "Unesi novu lozinku.";
  if (next.length < 6) return "Nova lozinka mora imati najmanje 6 karaktera.";
  if (next === cur) return "Nova lozinka mora biti različita od trenutne.";
  if (conf !== next) return "Nova lozinka i potvrda se ne poklapaju.";
  return "";
}

function PasswordModal({ open, onClose, onSubmit, busy }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErr("");
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();

    const msg = validatePassword({ currentPassword, newPassword, confirmPassword });
    if (msg) return setErr(msg);

    setErr("");

    try {
      await onSubmit({
        currentPassword: String(currentPassword || "").trim(),
        newPassword: String(newPassword || "").trim(),
      });
    } catch (e2) {
      setErr(e2?.message || "Greška pri promeni lozinke.");
    }
  };

  if (!open) return null;

  return (
    <div className="pm-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="pm" onClick={(e) => e.stopPropagation()}>
        <div className="pm-head">
          <div className="pm-title">Promena lozinke</div>
          <button type="button" className="pm-close" onClick={onClose} aria-label="Zatvori">
            ×
          </button>
        </div>

        <form onSubmit={submit} className="pm-form">
          {err ? <div className="pm-alert pm-alert--err">{err}</div> : null}

          <label className="pm-field">
            <span>Trenutna lozinka</span>
            <PasswordInput
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (err) setErr("");
              }}
              autoComplete="current-password"
            />
          </label>

          <label className="pm-field">
            <span>Nova lozinka</span>
            <PasswordInput
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (err) setErr("");
              }}
              autoComplete="new-password"
            />
          </label>

          <label className="pm-field">
            <span>Potvrdi novu lozinku</span>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (err) setErr("");
              }}
              autoComplete="new-password"
            />
          </label>

          <div className="pm-actions">
            <button type="button" className="pm-btn pm-btn--ghost" onClick={onClose} disabled={busy}>
              Otkaži
            </button>
            <button type="submit" className="pm-btn pm-btn--solid" disabled={busy}>
              {busy ? "Čuvanje..." : "Promeni lozinku"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ServiceProfileOverview({ onProfileChanged }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);

  const [imgBusy, setImgBusy] = useState(false);

  const [passOpen, setPassOpen] = useState(false);
  const [passBusy, setPassBusy] = useState(false);

  const [allTypes, setAllTypes] = useState([]);
  const [selectedTypeIds, setSelectedTypeIds] = useState([]);

  const [serviceDetails, setServiceDetails] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsErr, setReviewsErr] = useState("");

  const [ratingFilter, setRatingFilter] = useState("");
  const [reviewSort, setReviewSort] = useState("date|desc");

  const reviewQuery = useMemo(() => {
    const [sortBy, sortDirection] = String(reviewSort).split("|");
    return {
      ratingFilter: ratingFilter ? Number(ratingFilter) : undefined,
      sortBy: sortBy || "date",
      sortDirection: sortDirection || "desc",
    };
  }, [ratingFilter, reviewSort]);

  async function loadProfile() {
    setLoading(true);
    setError("");
    setOk("");

    try {
      const p = await ServiceProfileApi.get();

      const mapped = {
        serviceId: p.serviceId ?? p.ServiceId ?? null,
        name: p.name ?? p.Name ?? "",
        email: p.email ?? p.Email ?? "",
        pib: p.pib ?? p.PIB ?? "",
        description: p.description ?? p.Description ?? "",
        adress: p.adress ?? p.Adress ?? "",
        city: p.city ?? p.City ?? "",
        workingHours: p.workingHours ?? p.WorkingHours ?? "",
        workingDays: uniqWorkingDayCodes(p.workingDays ?? p.WorkingDays ?? []),
        ownerFullName: p.ownerFullName ?? p.OwnerFullName ?? "",
        phoneNumber: p.phoneNumber ?? p.PhoneNumber ?? "",
        imageUrl: p.imageUrl ?? p.ImageUrl ?? "",
        imagePublicId: p.imagePublicId ?? p.ImagePublicId ?? null,
        googleMapsLink: p.googleMapsLink ?? p.GoogleMapsLink ?? "",
        serviceTypes: p.serviceTypes ?? p.ServiceTypes ?? [],
      };

      setProfile(mapped);
      setDraft(mapped);
      setEditing(false);

      onProfileChanged?.({
        name: mapped.name,
        ownerFullName: mapped.ownerFullName,
        city: mapped.city,
        imageUrl: mapped.imageUrl,
      });

      try {
        const types = await getServiceTypes();
        const normalized = Array.isArray(types)
          ? types.map((t) => ({
              id: Number(t.id ?? t.Id ?? 0),
              name: t.name ?? t.Name ?? "",
            }))
          : [];
        setAllTypes(normalized);

        const selected = normalized
          .filter((t) => mapped.serviceTypes.some((n) => String(n).trim() === String(t.name).trim()))
          .map((t) => t.id)
          .filter(Boolean);

        setSelectedTypeIds(selected);
      } catch {
      }
    } catch (e) {
      setError(e?.message || "Greška pri učitavanju profila.");
      setProfile(null);
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadReviews(serviceId) {
    if (!serviceId) return;
    setReviewsErr("");
    setReviewsLoading(true);
    try {
      const res = await getServiceDetails(Number(serviceId), reviewQuery);
      setServiceDetails(res || null);
    } catch (e) {
      setServiceDetails(null);
      setReviewsErr(e?.message || "Greška pri učitavanju recenzija.");
    } finally {
      setReviewsLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile?.serviceId) loadReviews(profile.serviceId);
  }, [profile?.serviceId, reviewQuery.ratingFilter, reviewQuery.sortBy, reviewQuery.sortDirection]);

  const bannerSrc = useMemo(() => {
    if (!profile) return DEFAULT_SERVICE_IMAGE_URL;
    const url = normalizeImageUrl(profile.imageUrl) || DEFAULT_SERVICE_IMAGE_URL;
    return url;
  }, [profile]);

  const startEdit = () => {
    setOk("");
    setError("");
    setDraft({ ...profile });
    setEditing(true);
  };

  const cancelEdit = () => {
    setOk("");
    setError("");
    setDraft({ ...profile });
    setEditing(false);
  };

  const toggleType = (typeId) => {
    setSelectedTypeIds((prev) => (prev.includes(typeId) ? prev.filter((x) => x !== typeId) : [...prev, typeId]));
  };

  const toggleWorkingDay = (dayCode) => {
    setDraft((prev) => {
      const current = uniqWorkingDayCodes(prev.workingDays || []);
      const set = new Set(current);
      const next = set.has(dayCode) ? current.filter((x) => x !== dayCode) : [...current, dayCode];
      return { ...prev, workingDays: uniqWorkingDayCodes(next) };
    });
  };

  async function saveAll() {
    if (!draft) return;

    setOk("");
    setError("");

    const sanitizedDraft = {
      ...draft,
      workingDays: uniqWorkingDayCodes(draft.workingDays || []), 
    };

    const v = validateProfile(sanitizedDraft);
    if (v) return setError(v);

    try {
      await ServiceProfileApi.update({
        name: (sanitizedDraft.name || "").trim(),
        pib: (sanitizedDraft.pib || "").trim(),
        description: (sanitizedDraft.description || "").trim(),
        adress: (sanitizedDraft.adress || "").trim(),
        city: (sanitizedDraft.city || "").trim(),
        workingHours: (sanitizedDraft.workingHours || "").trim(),
        workingDays: sanitizedDraft.workingDays,
        ownerFullName: (sanitizedDraft.ownerFullName || "").trim(),
        phoneNumber: (sanitizedDraft.phoneNumber || "").trim(),
        googleMapsLink: extractIframeSrc(sanitizedDraft.googleMapsLink) || null,
      });

      try {
        await ServiceProfileApi.updateServiceTypes(selectedTypeIds || []);
      } catch {
        
      }

      setOk("Sačuvano.");
      await loadProfile();
    } catch (e) {
      setError(e?.message || "Greška pri čuvanju.");
    }
  }

  async function onUploadImage(file) {
    if (!file) return;
    setOk("");
    setError("");
    setImgBusy(true);
    try {
      await ProfileImageApi.upload(file);
      setOk("Slika je ažurirana.");
      await loadProfile();
    } catch (e) {
      setError(e?.message || "Greška pri uploadu slike.");
    } finally {
      setImgBusy(false);
    }
  }

  async function onRemoveImage() {
    setOk("");
    setError("");
    setImgBusy(true);
    try {
      await ProfileImageApi.remove();
      setOk("Slika je uklonjena.");
      await loadProfile();
    } catch (e) {
      setError(e?.message || "Greška pri uklanjanju slike.");
    } finally {
      setImgBusy(false);
    }
  }


  async function onChangePassword({ currentPassword, newPassword }) {
    setPassBusy(true);
    setOk("");
    try {
      await ServiceProfileApi.changePassword({ currentPassword, newPassword });
      setOk("Lozinka je promenjena.");
      setPassOpen(false);
    } catch (e) {
      throw e;
    } finally {
      setPassBusy(false);
    }
  }

  const avg = Number(serviceDetails?.averageRating || 0) || 0;
  const count = Number(serviceDetails?.reviewsCount || 0) || 0;
  const reviews = Array.isArray(serviceDetails?.reviews) ? serviceDetails.reviews : [];

  if (loading) return <div className="muted">Učitavanje profila...</div>;
  if (!profile) return <div className="panel panel--error">Profil nije moguće učitati.</div>;

  const defaultImg = isDefaultImage(profile);

  return (
    <div>
      <div className="details-banner">
        <img src={bannerSrc} alt={profile.name || "Servis"} />
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label className="profile2-fileBtn" style={{ cursor: imgBusy ? "not-allowed" : "pointer" }}>
            <input
              type="file"
              accept="image/*"
              disabled={imgBusy}
              onChange={(e) => onUploadImage(e.target.files?.[0])}
            />
            {imgBusy ? "Učitavanje..." : "Promeni sliku"}
          </label>

          {!defaultImg ? (
            <button
              type="button"
              className="profile2-ghostBtn"
              onClick={onRemoveImage}
              disabled={imgBusy}
              style={{ cursor: imgBusy ? "not-allowed" : "pointer" }}
            >
              Ukloni sliku
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="panel panel--error" style={{ marginTop: 12 }}>
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="panel" style={{ marginTop: 12, padding: 12 }}>
          {ok}
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        <div className="details-card">
          <div className="details-header">
            <div>
              <h1 className="details-title">{profile.name || "Servis"}</h1>

              <div className="details-sub">
                <span className="meta-pill reviewStarsPill" title="Prosečna ocena">
                  <StarRating value={avg} readOnly size="sm" />
                  <b className="metaNumber">{avg ? avg.toFixed(1) : "0.0"}</b>
                </span>
                <span className="meta-pill">
                  Recenzija: <b>{count}</b>
                </span>
                {profile.city ? <span className="meta-pill">{profile.city}</span> : null}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {!editing ? (
                <button type="button" className="profile2-solidBtn" onClick={startEdit}>
                  Izmeni
                </button>
              ) : (
                <>
                  <button type="button" className="profile2-ghostBtn" onClick={cancelEdit}>
                    Otkaži
                  </button>
                  <button type="button" className="profile2-solidBtn" onClick={saveAll}>
                    Sačuvaj
                  </button>
                </>
              )}

              <button type="button" className="profile2-passBtn" onClick={() => setPassOpen(true)}>
                Promeni lozinku
              </button>
            </div>
          </div>

          <div className="details-grid">
            <div className="details-item">
              <div className="details-k">Naziv</div>
              {!editing ? (
                <div className="details-v">{profile.name || "—"}</div>
              ) : (
                <input
                  className="profile2-input"
                  value={draft.name || ""}
                  onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                />
              )}
            </div>

            {profile.email ? (
              <div className="details-item">
                <div className="details-k">Email</div>
                <div className="details-v">{profile.email}</div>
              </div>
            ) : null}

            <div className="details-item">
              <div className="details-k">PIB</div>
              {!editing ? (
                <div className="details-v">{profile.pib || "—"}</div>
              ) : (
                <input
                  className="profile2-input"
                  value={draft.pib || ""}
                  onChange={(e) => setDraft((p) => ({ ...p, pib: e.target.value }))}
                />
              )}
            </div>

            <div className="details-item">
              <div className="details-k">Vlasnik</div>
              {!editing ? (
                <div className="details-v">{profile.ownerFullName || "—"}</div>
              ) : (
                <input
                  className="profile2-input"
                  value={draft.ownerFullName || ""}
                  onChange={(e) => setDraft((p) => ({ ...p, ownerFullName: e.target.value }))}
                />
              )}
            </div>

            <div className="details-item">
              <div className="details-k">Telefon</div>
              {!editing ? (
                <div className="details-v">{profile.phoneNumber || "—"}</div>
              ) : (
                <input
                  className="profile2-input"
                  value={draft.phoneNumber || ""}
                  onChange={(e) => setDraft((p) => ({ ...p, phoneNumber: e.target.value }))}
                />
              )}
            </div>

            <div className="details-item">
              <div className="details-k">Grad</div>
              {!editing ? (
                <div className="details-v">{profile.city || "—"}</div>
              ) : (
                <input
                  className="profile2-input"
                  value={draft.city || ""}
                  onChange={(e) => setDraft((p) => ({ ...p, city: e.target.value }))}
                />
              )}
            </div>

            <div className="details-item">
              <div className="details-k">Adresa</div>
              {!editing ? (
                <div className="details-v">{profile.adress || "—"}</div>
              ) : (
                <input
                  className="profile2-input"
                  value={draft.adress || ""}
                  onChange={(e) => setDraft((p) => ({ ...p, adress: e.target.value }))}
                />
              )}
            </div>

            <div className="details-item">
              <div className="details-k">Radno vreme</div>
              {!editing ? (
                <div className="details-v">{profile.workingHours || "—"}</div>
              ) : (
                <input
                  className="profile2-input"
                  value={draft.workingHours || ""}
                  onChange={(e) => setDraft((p) => ({ ...p, workingHours: e.target.value }))}
                />
              )}
            </div>

            <div className="details-item">
              <div className="details-k">Radni dani</div>

              {!editing ? (
                <div className="details-v" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {uniqWorkingDayCodes(profile.workingDays).length ? (
                    uniqWorkingDayCodes(profile.workingDays).map((code) => (
                      <span key={code} className="filter-pill is-on">
                        {WORKING_DAY_LABEL.get(code) || code}
                      </span>
                    ))
                  ) : (
                    "—"
                  )}
                </div>
              ) : (
                <div className="details-v" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {WORKING_DAYS.map((d) => {
                    const on = uniqWorkingDayCodes(draft.workingDays).includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        className={cls("filter-pill", on && "is-on")}
                        onClick={() => toggleWorkingDay(d.value)}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="details-item">
              <div className="details-k">Google Maps</div>
              {!editing ? (
                <div className="details-v">
                  {profile.googleMapsLink ? (
                    <a href={profile.googleMapsLink} target="_blank" rel="noreferrer">
                      Otvori mapu
                    </a>
                  ) : (
                    "—"
                  )}
                </div>
              ) : (
                <input
                  className="profile2-input"
                  value={draft.googleMapsLink || ""}
                  onChange={(e) => setDraft((p) => ({ ...p, googleMapsLink: e.target.value }))}
                  placeholder="https://maps.google.com/..."
                />
              )}
            </div>
          </div>

          <div className="sp-section" style={{ marginTop: 10 }}>
            <div className="details-k" style={{ marginBottom: 8 }}>
              Usluge {!editing ? "" : `(${selectedTypeIds.length})`}
            </div>

            <div className="details-tags">
              {!editing ? (
                (profile.serviceTypes || []).length ? (
                  profile.serviceTypes.map((t) => (
                    <span key={t} className="filter-pill is-on">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="muted">Nisu definisane usluge.</span>
                )
              ) : (
                allTypes.map((t) => {
                  const on = selectedTypeIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={cls("filter-pill", on && "is-on")}
                      onClick={() => toggleType(t.id)}
                    >
                      {t.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="details-descBlock">
            <div className="details-k">Opis</div>
            {!editing ? (
              <p className="details-descText">{profile.description || "—"}</p>
            ) : (
              <textarea
                className="profile2-input"
                style={{ height: 120, paddingTop: 10, resize: "vertical" }}
                value={draft.description || ""}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
              />
            )}
          </div>
        </div>
      </div>

      <section className="panel details-reviews">
        <div className="panelHead">
          <h2 className="panelTitle">Recenzije</h2>

          <div className="reviewsControls">
            <select className="side-select" value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
              <option value="">Sve ocene</option>
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>

            <select className="side-select" value={reviewSort} onChange={(e) => setReviewSort(e.target.value)}>
              {REVIEW_SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!profile.serviceId ? (
          <div className="panel panel--error">
            Ne mogu da učitam recenzije jer profil endpoint ne vraća ID servisa. Minimalno rešenje: u GET
            /api/ServiceProfile dodaj ServiceId = service.Id.
          </div>
        ) : null}

        {reviewsLoading ? <div className="muted">Učitavanje recenzija...</div> : null}
        {reviewsErr ? <div className="panel panel--error">{reviewsErr}</div> : null}

        <div className="reviewsList">
          {reviews.map((r, idx) => {
            const userImg = normalizeImageUrl(r.imageUrl);
            const key = r.id ?? `${r.clientName}-${r.reviewDate}-${idx}`;
            const rating = Number(r.rating || 0) || 0;
            const comment = r.comment || "";
            return (
              <article key={key} className="reviewCard">
                <div className="reviewAvatar">
                  <img src={userImg} alt={r.clientName || "Korisnik"} loading="lazy" />
                </div>

                <div className="reviewBody">
                  <div className="reviewTop">
                    <div className="reviewName">{r.clientName || "Korisnik"}</div>
                    <div className="reviewMeta">
                      <span className="meta-pill reviewStarsPill">
                        <StarRating value={rating} readOnly size="sm" />
                        <b className="metaNumber">{rating.toFixed(1)}</b>
                      </span>
                      <span className="meta-pill">{formatDate(r.reviewDate)}</span>
                    </div>
                  </div>

                  {comment ? <div className="reviewText">{comment}</div> : null}
                </div>
              </article>
            );
          })}

          {!reviewsLoading && profile.serviceId && reviews.length === 0 ? (
            <div className="muted">Nema recenzija za prikaz.</div>
          ) : null}
        </div>
      </section>

      <PasswordModal open={passOpen} onClose={() => setPassOpen(false)} onSubmit={onChangePassword} busy={passBusy} />
    </div>
  );
}