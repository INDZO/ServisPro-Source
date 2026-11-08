import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api/baseUrl";
import { getServiceDetails } from "../api/publicServicesApi";
import { getAuth, isAuthenticated } from "../auth/auth";
import { ReviewApi } from "../api/reviewApi";
import { ClientProfileApi } from "../api/clientProfileApi";
import StarRating from "../components/StarRating";
import "../styles/Servisi.css";
import { ChatApi } from "../api/chatApi";
import AppointmentSchedulerModal from "../components/ScheduleAppointmentModal.jsx";



const REVIEW_SORT_OPTIONS = [
  { value: "date|desc", label: "Datum (najnovije)" },
  { value: "date|asc", label: "Datum (najstarije)" },
  { value: "rating|desc", label: "Ocena (opadajuće)" },
  { value: "rating|asc", label: "Ocena (rastuće)" },
];


const DAY_LABELS = {
  pon: "Ponedeljak",
  uto: "Utorak",
  sre: "Sreda",
  cet: "Četvrtak",
  pet: "Petak",
  sub: "Subota",
  ned: "Nedelja",
};

function normalizeImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

function formatWorkingDays(days) {
  if (!Array.isArray(days) || days.length === 0) return "—";
  return days
    .map((d) => {
      if (!d) return "";
      const key = String(d).trim().toLowerCase();
      if (!DAY_LABELS[key]) {
        const s = String(d).trim();
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
      }
      return DAY_LABELS[key];
    })
    .filter(Boolean)
    .join(", ");
}

function toGoogleMapsEmbedUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.pathname.includes("/maps/embed")) return url;

    const q = u.searchParams.get("q") || u.searchParams.get("query");
    if (q) return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;

    if (u.host.toLowerCase().includes("google") && u.pathname.startsWith("/maps/")) {
      return `https://www.google.com/maps?q=${encodeURIComponent(url)}&output=embed`;
    }

    return "";
  } catch {
    return "";
  }
}

export default function AutoServis() {
  const { id } = useParams();
  const serviceId = Number(id);
  const navigate = useNavigate();
  const [scheduleOpen, setScheduleOpen] = useState(false);


  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [service, setService] = useState(null);

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

  const isClient =
    isAuthenticated() && String(getAuth().role || "").toLowerCase() === "client";

  function getServiceUserId(service) {
  return Number(
    service?.serviceUserId ??
    service?.ServiceUserId ??
    service?.userId ??
    service?.UserId ??
    0
  );
}

async function openChatWithService(service) {
  if (!isClient) return;

  const { userId } = getAuth();
  const clientUserId = Number(userId || 0);
  const serviceUserId = getServiceUserId(service);

  if (!clientUserId || !serviceUserId) {
    alert("Ne mogu da otvorim chat.");
    return;
  }

  try {
    const res = await ChatApi.getBetween({ serviceUserId, clientUserId });
    const conversationId =
      Number(res?.conversationId ?? res?.ConversationId ?? 0) || 0;

    navigate("/dashboard/chat", {
      state: {
        conversationId,
        receiverUserId: conversationId ? 0 : serviceUserId,
        receiverName: service?.name || "Servis",
      },
    });
  } catch (e) {
    alert(e?.message || "Greška pri otvaranju chata.");
  }
}

  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState("");
  
  useEffect(() => {
    if (!isClient) {
      setMe(null);
      setMeError("");
      return;
    }

    let mounted = true;
    setMeError("");

    ClientProfileApi.get()
      .then((p) => {
        if (!mounted) return;
        setMe(p || null);
      })
      .catch((e) => {
        if (!mounted) return;
        setMe(null);
        setMeError(e?.message || "Ne mogu da učitam tvoj profil.");
      });

    return () => {
      mounted = false;
    };
  }, [isClient]);

  const [myLoading, setMyLoading] = useState(false);
  const [myError, setMyError] = useState("");
  const [myReview, setMyReview] = useState(null);

  const [menuOpenFor, setMenuOpenFor] = useState(null); 
  const [editingReviewId, setEditingReviewId] = useState(null); 

  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!serviceId) return;

    let mounted = true;
    setLoading(true);
    setError("");

    getServiceDetails(serviceId, reviewQuery)
      .then((res) => mounted && setService(res))
      .catch((e) => {
        if (!mounted) return;
        setService(null);
        setError(e?.message || "Greška pri učitavanju servisa.");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [serviceId, reviewQuery]);

  useEffect(() => {
    if (!serviceId || !isClient) {
      setMyReview(null);
      setMyError("");
      setMyLoading(false);
      setEditingReviewId(null);
      setMenuOpenFor(null);
      setMyRating(0);
      setMyComment("");
      return;
    }

    let mounted = true;
    setMyLoading(true);
    setMyError("");

    ReviewApi.getMine(serviceId)
      .then((rvw) => {
        if (!mounted) return;

        setMyReview(rvw);

        if (rvw) {
          setMyRating(Number(rvw.rating || 0));
          setMyComment(rvw.comment || "");
        } else {
          setMyRating(0);
          setMyComment("");
        }

        setEditingReviewId(null);
        setMenuOpenFor(null);
      })
      .catch((e) => mounted && setMyError(e?.message || "Greška pri učitavanju tvoje recenzije."))
      .finally(() => mounted && setMyLoading(false));

    return () => {
      mounted = false;
    };
  }, [serviceId, isClient]);

  useEffect(() => {
    function onDocClick() {
      setMenuOpenFor(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  async function refreshServiceDetails() {
      const res = await getServiceDetails(serviceId, reviewQuery);
      setService(res);
  }

  function openMenu(e, reviewId) {
    e.stopPropagation();
    setMenuOpenFor((prev) => (prev === reviewId ? null : reviewId));
  }

  function startEditMine() {
    if (!myReview?.id) return;
    if (isSaving || isDeleting) return;

    setMyError("");
    setMyRating(Number(myReview.rating || 0));
    setMyComment(myReview.comment || "");
    setEditingReviewId(myReview.id);
    setMenuOpenFor(null);
  }

  function cancelEditMine() {
    if (!myReview?.id) return;
    if (isSaving || isDeleting) return;

    setMyError("");
    setMyRating(Number(myReview.rating || 0));
    setMyComment(myReview.comment || "");
    setEditingReviewId(null);
    setMenuOpenFor(null);
  }

  async function handleSaveMine(mode) {
    setMyError("");

    const r = Number(myRating || 0);
    if (r < 1 || r > 5) {
      setMyError("Molimo izaberi ocenu (1–5).");
      return;
    }

    if (isSaving || isDeleting) return;

    setIsSaving(true);
    try {
      if (mode === "create") {
        const created = await ReviewApi.create({
          serviceId,
          rating: r,
          comment: myComment,
        });
        setMyReview(created);
      } else {
        const updated = await ReviewApi.update(myReview.id, {
          rating: r,
          comment: myComment,
        });
        setMyReview(updated);
      }

      await refreshServiceDetails();
      setEditingReviewId(null);
      setMenuOpenFor(null);
    } catch (e) {
      setMyError(e?.message || "Greška pri čuvanju recenzije.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteMine() {
    if (!myReview?.id) return;
    if (isSaving || isDeleting) return;

    const ok = window.confirm("Da li si siguran da želiš da obrišeš svoju recenziju?");
    if (!ok) return;

    setMyError("");
    setIsDeleting(true);
    try {
      await ReviewApi.remove(myReview.id);

      setMyReview(null);
      setMyRating(0);
      setMyComment("");
      setEditingReviewId(null);
      setMenuOpenFor(null);

      await refreshServiceDetails();
    } catch (e) {
      setMyError(e?.message || "Greška pri brisanju recenzije.");
    } finally {
      setIsDeleting(false);
    }
  }

  const reviews = Array.isArray(service?.reviews) ? service.reviews : [];
  const showCreateInline = isClient && !myLoading && !myReview;

  if (loading && !service) {
    return (
      <div className="services-page">
        <div className="container services-wrap">
          <div className="panel">Učitavanje...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="services-page">
        <div className="container services-wrap">
          <div className="panel panel--error">{error}</div>
          <div className="details-top">
            <Link className="details-back" to="/auto-servisi">
              ← Nazad na listu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!service) return null;

  const serviceImg = normalizeImageUrl(service.imageUrl);
  const embedUrl = toGoogleMapsEmbedUrl(service.googleMapsLink);

  return (
    <div className="services-page">
      <div className="container services-wrap">
        <div className="details-top">
          <Link className="details-back" to="/auto-servisi">
            ← Nazad
          </Link>
        </div>

        <section className="details-banner">
          <img src={serviceImg} alt={service.name} />
        </section>

        <section className="details-main">
          <div className="details-card">
            <div className="details-header">
              <div className="details-titleWrap">
                <h1 className="details-title">{service.name}</h1>

                <div className="details-sub">
                  <span className="meta-pill">{service.city}</span>

                  <span className="meta-pill">
                    <span className="metaLabel">Ocena:</span>
                    <StarRating value={service.averageRating || 0} readOnly size="sm" />
                    <b className="metaNumber">
                      {typeof service.averageRating === "number"
                        ? service.averageRating.toFixed(1)
                        : "—"}
                    </b>
                  </span>

                  <span className="meta-pill">
                    Recenzije: <b>{service.reviewsCount}</b>
                  </span>
                </div>
              </div>
            </div>

            <div className="details-tags">
              {(service.serviceTypes || []).map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>

            <div className="details-grid">
              <div className="details-item">
                <div className="details-k">PIB</div>
                <div className="details-v">{service.pib}</div>
              </div>

              <div className="details-item">
                <div className="details-k">Vlasnik</div>
                <div className="details-v">{service.ownerFullName}</div>
              </div>

              <div className="details-item">
                <div className="details-k">Telefon</div>
                <div className="details-v">{service.phoneNumber}</div>
              </div>

              <div className="details-item">
                <div className="details-k">Adresa</div>
                <div className="details-v">{service.adress}</div>
              </div>

              <div className="details-item">
                <div className="details-k">Radno vreme</div>
                <div className="details-v">{service.workingHours}</div>
              </div>

              <div className="details-item">
                <div className="details-k">Radni dani</div>
                <div className="details-v">{formatWorkingDays(service.workingDays)}</div>
              </div>
            </div>

            <div className="details-descBlock">
              <h2 className="panelTitle">Opis</h2>
              <p className="details-descText">{service.description}</p>
                            <div className="details-actions">
                {service.googleMapsLink ? (
                  <a
                    className="btn-primary"
                    href={service.googleMapsLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Otvori u Google Maps
                  </a>
                ) : (
                  <button className="btn-ghost" disabled>
                    Mapa nije dostupna
                  </button>
                )}

                {isClient && (
                  <>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => openChatWithService(service)}
                    >
                      Pošalji poruku
                    </button>

                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setScheduleOpen(true)}
                    >
                      Zakaži termin
                    </button>

                  </>
                )}
              </div>

            </div>
          </div>

          <aside className="details-mapCard">
            <div className="details-mapTitle">Lokacija</div>

            {embedUrl ? (
              <iframe
                className="details-mapFrame"
                src={embedUrl}
                title="Mapa"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : (
              <div className="details-mapFallback">
                <div className="muted">Embed mapa nije dostupna za ovaj link.</div>
                {service.googleMapsLink ? (
                  <a
                    className="btn-primary"
                    href={service.googleMapsLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Otvori mapu
                  </a>
                ) : (
                  <div className="muted">Google Maps link nije dostupan.</div>
                )}
              </div>
            )}
          </aside>
        </section>

        <section className="panel details-reviews">
          <div className="panelHead">
            <h2 className="panelTitle">Recenzije</h2>

            <div className="reviewsControls">
              <select
                className="side-select"
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
              >
                <option value="">Sve ocene</option>
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>

              <select
                className="side-select"
                value={reviewSort}
                onChange={(e) => setReviewSort(e.target.value)}
              >
                {REVIEW_SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isClient && myLoading ? <div className="muted">Učitavanje tvoje recenzije...</div> : null}
          {isClient && myError ? <div className="panel panel--error">{myError}</div> : null}
          {isClient && meError ? <div className="muted">{meError}</div> : null}

          <div className="reviewsList">
            {showCreateInline && (
              <article className="reviewCard reviewCard--mine">
                <div className="reviewAvatar">
                  <img
                    src={normalizeImageUrl(me?.imageUrl)}
                    alt={me?.fullName || "Ti"}
                    loading="lazy"
                  />
                </div>

                <div className="reviewBody">
                  <div className="reviewTop">
                    <div className="reviewName">{me?.fullName || "Ti"}</div>
                    <div className="reviewMeta">
                      <span className="meta-pill">Dodaj recenziju</span>
                    </div>
                  </div>

                  <div className="myReviewForm">
                    <div className="myReviewRow">
                      <div className="myReviewLabel">Ocena</div>
                      <StarRating value={myRating} onChange={setMyRating} size="md" />
                    </div>

                    <div className="myReviewRow">
                      <div className="myReviewLabel">Komentar (opciono)</div>
                      <textarea
                        className="myReviewTextarea"
                        value={myComment}
                        onChange={(e) => setMyComment(e.target.value)}
                        placeholder="Napiši kratak komentar (nije obavezno)..."
                        rows={3}
                        disabled={isSaving || isDeleting}
                      />
                    </div>

                    <div className="myReviewActions">
                      <button
                        className="btn-primary"
                        onClick={() => handleSaveMine("create")}
                        disabled={isSaving || isDeleting}
                      >
                        {isSaving ? "Postavljanje..." : "Postavi recenziju"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {reviews.map((r, idx) => {
              const userImg = normalizeImageUrl(r.imageUrl);
              const rid = r?.id ?? r?.Id ?? null;

              const isMine =
                isClient && myReview?.id && rid && String(rid) === String(myReview.id);

              const isEditingMine =
                isMine && editingReviewId && String(editingReviewId) === String(myReview.id);

              const key = rid ?? `${r.clientName || "anon"}-${r.reviewDate || "nd"}-${idx}`;

              if (isEditingMine) {
                return (
                  <article key={key} className="reviewCard reviewCard--mine">
                    <div className="reviewAvatar">
                      <img src={userImg} alt={r.clientName || "Ti"} loading="lazy" />
                    </div>

                    <div className="reviewBody">
                      <div className="reviewTop">
                        <div className="reviewName">{r.clientName || "Ti"}</div>
                        <div className="reviewMeta">
                          <span className="meta-pill">Izmena recenzije</span>
                        </div>
                      </div>

                      <div className="myReviewForm">
                        <div className="myReviewRow">
                          <div className="myReviewLabel">Ocena</div>
                          <StarRating value={myRating} onChange={setMyRating} size="md" />
                        </div>

                        <div className="myReviewRow">
                          <div className="myReviewLabel">Komentar (opciono)</div>
                          <textarea
                            className="myReviewTextarea"
                            value={myComment}
                            onChange={(e) => setMyComment(e.target.value)}
                            placeholder="Napiši kratak komentar (nije obavezno)..."
                            rows={3}
                            disabled={isSaving || isDeleting}
                          />
                        </div>

                        <div className="myReviewActions">
                          <button
                            className="btn-primary"
                            onClick={() => handleSaveMine("update")}
                            disabled={isSaving || isDeleting}
                          >
                            {isSaving ? "Čuvanje..." : "Sačuvaj izmene"}
                          </button>

                          <button
                            className="btn-ghost"
                            onClick={cancelEditMine}
                            disabled={isSaving || isDeleting}
                          >
                            Otkaži
                          </button>

                          <button
                            className="btn-ghost btn-danger"
                            onClick={handleDeleteMine}
                            disabled={isSaving || isDeleting}
                          >
                            {isDeleting ? "Brisanje..." : "Obriši"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              }

              return (
                <article key={key} className={`reviewCard ${isMine ? "reviewCard--mine" : ""}`}>
                  <div className="reviewAvatar">
                    <img src={userImg} alt={r.clientName} loading="lazy" />
                  </div>

                  <div className="reviewBody">
                    <div className="reviewTop">
                      <div className="reviewName">{r.clientName}</div>
                      <div className="reviewMeta">
                        <span className="meta-pill reviewStarsPill">
                          <StarRating value={r.rating || 0} readOnly size="sm" />
                          <b className="metaNumber">{Number(r.rating || 0).toFixed(1)}</b>
                        </span>

                        <span className="meta-pill">{formatDate(r.reviewDate)}</span>

                        {isMine ? (
                          <div className="reviewMenuWrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="reviewMenuBtn"
                              title="Opcije"
                              onClick={(e) => openMenu(e, myReview.id)}
                              disabled={isSaving || isDeleting}
                            >
                              ⋮
                            </button>

                            {menuOpenFor === myReview.id ? (
                              <div className="reviewMenu">
                                <button
                                  type="button"
                                  className="reviewMenuItem"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditMine();
                                  }}
                                  disabled={isSaving || isDeleting}
                                >
                                  Izmeni
                                </button>
                                <button
                                  type="button"
                                  className="reviewMenuItem reviewMenuItem--danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenFor(null);
                                    handleDeleteMine();
                                  }}
                                  disabled={isSaving || isDeleting}
                                >
                                  {isDeleting ? "Brisanje..." : "Obriši"}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {r.comment ? <div className="reviewText">{r.comment}</div> : null}
                  </div>
                </article>
              );
            })}

            {(!reviews || reviews.length === 0) && !showCreateInline && (
              <div className="muted">Nema recenzija za prikaz.</div>
            )}
          </div>
        </section>


        {isClient && scheduleOpen && service ? (
          <AppointmentSchedulerModal
            isOpen={scheduleOpen}
            onClose={() => setScheduleOpen(false)}
            serviceId={service.id}
            serviceName={service.name}
            serviceTypeNames={Array.isArray(service.serviceTypes) ? service.serviceTypes : []}
          />
        ) : null}

      </div>
    </div>
  );
}