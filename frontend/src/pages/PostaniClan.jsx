import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/PostaniClan.css";

import heroImg from "../assets/hero.jpg";
import { AuthApi } from "../api/authApi";
import { ImageApi } from "../api/imageApi";
import PasswordInput from "../components/PasswordInput";


const DEFAULT_SERVICE_IMAGE_URL =
  "https://res.cloudinary.com/dbdpwiidk/image/upload/v1767672295/vector-detailed-auto-repair-car-600nw-2489397017_wbtz6k.webp";


const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const fullNameRegex =
  /^[A-Za-zÀ-ÖØ-öø-ÿĆČĐŠŽćčđšž]{2,40}(?:[ -'][A-Za-zÀ-ÖØ-öø-ÿĆČĐŠŽćčđšž]{2,40})+$/;

const serviceNameRegex =
  /^[A-Za-zÀ-ÖØ-öø-ÿĆČĐŠŽćčđšž0-9](?:[A-Za-zÀ-ÖØ-öø-ÿĆČĐŠŽćčđšž0-9\s.'’&()\-\/]{0,78}[A-Za-zÀ-ÖØ-öø-ÿĆČĐŠŽćčđšž0-9])$/;

const pibRegex = /^\d{9}$/;

const phoneLooseRegex = /^[+\d][\d\s()-]{6,20}$/;

const addressRegex = /^[A-Za-zÀ-ÖØ-öø-ÿĆČĐŠŽćčđšž0-9\s.,'’\-\/]{3,120}$/;

const cityRegex = /^[A-Za-zÀ-ÖØ-öø-ÿĆČĐŠŽćčđšž]{2,60}(?:[ -][A-Za-zÀ-ÖØ-öø-ÿĆČĐŠŽćčđšž]{2,60})*$/;

const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

const workingHoursRegex = /^([01]\d|2[0-3]):[0-5]\d\s*-\s*([01]\d|2[0-3]):[0-5]\d$/;

function trim(v) {
  return (v ?? "").toString().trim();
}

function extractIframeSrc(v) {
  const s = (v ?? "").toString().trim();
  if (!s) return "";

  const m = s.match(/src\s*=\s*"([^"]+)"/i) || s.match(/src\s*=\s*'([^']+)'/i);
  return (m?.[1] ?? s).trim();
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function onlyDigits(s) {
  return (s || "").toString().replace(/\D/g, "");
}

function validateEmail(email) {
  const e = trim(email);
  if (!e) return "Email je obavezan.";
  if (!emailRegex.test(e)) return "Unesite ispravan email.";
  return "";
}

function validatePasswordStrong(pw) {
  const p = (pw ?? "").toString();
  if (!p) return "Lozinka je obavezna.";
  if (!passwordRegex.test(p)) {
    return "Lozinka mora imati min 8 karaktera, bar 1 veliko slovo i 1 broj.";
  }
  return "";
}

function validateFullName(value) {
  const v = trim(value);
  if (!v) return "Ime i prezime je obavezno.";
  if (!fullNameRegex.test(v)) return "Unesite ispravno ime i prezime (min 2 reči, samo slova).";
  return "";
}

function validateServiceName(value) {
  const v = trim(value);
  if (!v) return "Naziv servisa je obavezan.";
  if (v.length < 2 || v.length > 80) return "Naziv servisa mora imati 2–80 karaktera.";
  if (!serviceNameRegex.test(v)) return "Naziv servisa sadrži nedozvoljene karaktere.";
  return "";
}

function validatePhone(phone) {
  const p = trim(phone);
  if (!p) return "Broj telefona je obavezan.";
  if (!phoneLooseRegex.test(p)) return "Unesite ispravan format broja telefona.";
  const digits = onlyDigits(p);
  if (digits.length < 7 || digits.length > 15) return "Broj telefona mora imati 7–15 cifara.";
  return "";
}

function validateAddress(value) {
  const v = trim(value);
  if (!v) return "Adresa je obavezna.";
  if (!addressRegex.test(v)) return "Adresa nije u ispravnom formatu.";
  return "";
}

function validateCity(value) {
  const v = trim(value);
  if (!v) return "Grad je obavezan.";
  if (!cityRegex.test(v)) return "Grad nije u ispravnom formatu.";
  return "";
}

function validateUrlOptional(value) {
  const v = trim(value);
  if (!v) return "";
  if (!urlRegex.test(v)) return "Link nije ispravan (mora biti http/https URL).";
  return "";
}

function validateWorkingHours(value) {
  const v = trim(value);
  if (!v) return "Radno vreme je obavezno (npr. 09:00-17:00).";
  const m = v.match(workingHoursRegex);
  if (!m) return "Radno vreme mora biti u formatu HH:MM-HH:MM (npr. 09:00-17:00).";

  const [startStr, endStr] = v.split("-").map((x) => x.trim());
  const [sh, sm] = startStr.split(":").map(Number);
  const [eh, em] = endStr.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;

  if (start >= end) return "Radno vreme nije validno (početak mora biti pre kraja).";
  return "";
}

const WORKING_DAYS = [
  { key: "pon", label: "Ponedeljak" },
  { key: "uto", label: "Utorak" },
  { key: "sre", label: "Sreda" },
  { key: "cet", label: "Četvrtak" },
  { key: "pet", label: "Petak" },
  { key: "sub", label: "Subota" },
  { key: "ned", label: "Nedelja" },
];

export default function PostaniClan() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState("user"); 
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState({ type: "idle", msg: "" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userId, setUserId] = useState(null);

  const [name, setName] = useState("");
  const [pib, setPib] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [adress, setAdress] = useState("");
  const [city, setCity] = useState("");

  const [workingHours, setWorkingHours] = useState("");
  const [workingDays, setWorkingDays] = useState(["pon", "uto", "sre", "cet", "pet"]);

  const [googleMapsLink, setGoogleMapsLink] = useState("");
  const [description, setDescription] = useState("");

  const [serviceTypes, setServiceTypes] = useState([]);
  const [selectedTypeIds, setSelectedTypeIds] = useState([]);

  const [imageFile, setImageFile] = useState(null);

  function setOk(msg) {
    setAlert({ type: "ok", msg });
  }
  function setBad(msg) {
    setAlert({ type: "bad", msg });
  }
  function clearAlert() {
    setAlert({ type: "idle", msg: "" });
  }

  useEffect(() => {
    const st = location.state;
    if (st?.userId) {
      setUserId(st.userId);
      if (st.email) setEmail(st.email);
      setStep("service");
      setOk("Nastavite registraciju: popunite podatke servisa.");
    }
  }, []);

  const stepMeta = useMemo(() => {
    if (step === "user") {
      return {
        title: "Postani član",
        sub: "Prvo kreiraj nalog za servis (email i lozinka). Nakon toga unosiš podatke servisa.",
      };
    }
    if (step === "service") {
      return {
        title: "Podaci o servisu",
        sub: "Popuni profil servisa. Nakon slanja, servis čeka odobrenje admina.",
      };
    }
    return {
      title: "Prijava poslata",
      sub: "Servis je u statusu čekanja do odobrenja admin tima.",
    };
  }, [step]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const types = await AuthApi.getServiceTypes();
        if (!mounted) return;
        setServiceTypes(Array.isArray(types) ? types : []);
      } catch (e) {
        if (!mounted) return;
        setBad(e?.message || "Učitavanje tipova usluga nije uspelo.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function toggleDay(dayKey) {
    setWorkingDays((prev) => {
      const set = new Set(prev);
      if (set.has(dayKey)) set.delete(dayKey);
      else set.add(dayKey);
      return Array.from(set);
    });
  }

  function toggleType(id) {
    setSelectedTypeIds((prev) => {
      const set = new Set(prev);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return Array.from(set);
    });
  }

  function validateUserStep() {
    const eErr = validateEmail(email);
    if (eErr) return eErr;

    const pErr = validatePasswordStrong(password);
    if (pErr) return pErr;

    if (password !== confirmPassword) return "Lozinke se ne poklapaju.";
    return "";
  }

  function validateServiceStep() {
    if (!userId) return "Nedostaje userId. Vratite se korak nazad.";

    const nameErr = validateServiceName(name);
    if (nameErr) return nameErr;

    const pibVal = trim(pib);
    if (!pibVal) return "PIB je obavezan.";
    if (!pibRegex.test(pibVal)) return "PIB mora sadržati tačno 9 cifara.";

    const ownerErr = validateFullName(ownerFullName);
    if (ownerErr) return ownerErr;

    const phoneErr = validatePhone(phoneNumber);
    if (phoneErr) return phoneErr;

    const addrErr = validateAddress(adress);
    if (addrErr) return addrErr;

    const cityErr = validateCity(city);
    if (cityErr) return cityErr;

    const whErr = validateWorkingHours(workingHours);
    if (whErr) return whErr;

    const urlErr = validateUrlOptional(extractIframeSrc(googleMapsLink));
    if (urlErr) return urlErr;

    if (!workingDays?.length) return "Izaberite bar jedan radni dan.";
    if (!selectedTypeIds?.length) return "Izaberite bar jedan tip usluge.";

    return "";
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    clearAlert();

    const err = validateUserStep();
    if (err) {
      setBad(err);
      scrollToTop();
      return;
    }


    setBusy(true);
    try {
      const reg = await AuthApi.registerUser({
        email: trim(email),
        password,
        role: "Service",
      });

      const id = reg?.userId;
      if (!id) throw new Error("Backend nije vratio userId.");

      setUserId(id);
      setOk(reg?.message || "Nalog je kreiran. Nastavite unos podataka servisa.");
      setStep("service");
    } catch (ex) {
      setBad(ex?.message || "Kreiranje naloga nije uspelo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateServiceProfile(e) {
    e.preventDefault();
    clearAlert();

    const err = validateServiceStep();
    if (err) {
      setBad(err);
      scrollToTop();
      return;
    }


    setBusy(true);
    try {
      let uploaded = null;
      if (imageFile) uploaded = await ImageApi.upload(imageFile);

      const finalImageUrl = uploaded?.url ?? DEFAULT_SERVICE_IMAGE_URL;
      const finalPublicId = uploaded?.publicId ?? null;

      await AuthApi.createServiceProfile({
        userId,
        name: trim(name),
        pib: trim(pib),
        description: trim(description),
        adress: trim(adress),
        city: trim(city),
        workingHours: trim(workingHours),
        workingDays,
        ownerFullName: trim(ownerFullName),
        phoneNumber: trim(phoneNumber),
        googleMapsLink: extractIframeSrc(googleMapsLink),
        imageUrl: finalImageUrl,
        imagePublicId: finalPublicId,
        serviceTypeIds: selectedTypeIds,
      });

      setOk("Prijava servisa je poslata. Nalog čeka odobrenje admin tima.");
      setStep("done");
    } catch (ex) {
      setBad(ex?.message || "Kreiranje profila servisa nije uspelo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="postani">
      <section className="hero">
        <div className="hero-bg" style={{ backgroundImage: `url(${heroImg})` }}>
          <div className="hero-overlay" />
          <div className="container hero-inner">
            <div className="hero-content">
              <div className="badge">Za vlasnike servisa</div>
              <h1 className="hero-title">Postanite član ServisPro mreže</h1>
              <p className="hero-sub">
                Više vidljivosti, jasna ponuda usluga i profesionalna prezentacija. Nakon prijave, admin tim pregleda
                podatke i aktivira servis.
              </p>

              <div className="hero-cta">
                <a className="btn btn-solid" href="#forma">
                  {step === "user" ? "Kreiraj nalog" : step === "service" ? "Popuni servis" : "Gotovo"}
                </a>
                <Link className="btn btn-ghost-light" to="/kontakt">
                  Kontakt
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container postani-body" id="forma">
        <div className="postani-head">
          <h2 className="postani-h2">{stepMeta.title}</h2>
          <p className="postani-p">{stepMeta.sub}</p>
        </div>

        {alert.type !== "idle" && (
          <div className={`postani-alert ${alert.type === "ok" ? "ok" : "bad"}`}>{alert.msg}</div>
        )}

        {step === "user" && (
          <>
            <div className="postani-card">
              <h3 className="postani-card-title">Kreiranje naloga (servis)</h3>
              <p className="postani-card-sub">Prvo se kreira korisnik, zatim se unose podaci servisa.</p>

              <form className="postani-form" onSubmit={handleCreateUser}>
                <div className="field">
                  <label>Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@example.invalid"
                    autoComplete="email"
                  />
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label>Lozinka</label>
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="min 8, veliko slovo i broj"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="field">
                    <label>Potvrda lozinke</label>
                    <PasswordInput
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="ponovite lozinku"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="actions">
                  <button className="btn primary" type="submit" disabled={busy}>
                    {busy ? "Kreiranje..." : "Nastavi"}
                  </button>

                  <button type="button" className="btn" disabled={busy} onClick={() => navigate("/uloguj-se")}>
                    Imam nalog
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {step === "service" && (
          <div className="postani-card">
            <h3 className="postani-card-title">Podaci o servisu</h3>
            <p className="postani-card-sub">Popunite osnovne informacije. Slika je opciona.</p>

            <div className="muted" style={{ marginBottom: 10 }}>
              Nalog: <strong>{trim(email) || "(email nije postavljen)"}</strong>
            </div>

            <form className="postani-form" onSubmit={handleCreateServiceProfile}>
              <div className="grid-2">
                <div className="field">
                  <label>Naziv servisa</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="npr. Marko Garage" />
                </div>
                <div className="field">
                  <label>PIB</label>
                  <input value={pib} onChange={(e) => setPib(e.target.value)} placeholder="9 cifara" />
                </div>
              </div>

              <div className="grid-2">
                <div className="field">
                  <label>Ime i prezime vlasnika</label>
                  <input
                    value={ownerFullName}
                    onChange={(e) => setOwnerFullName(e.target.value)}
                    placeholder="npr. Marko Marković"
                  />
                </div>
                <div className="field">
                  <label>Telefon</label>
                  <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+381..." />
                </div>
              </div>

              <div className="grid-2">
                <div className="field">
                  <label>Adresa</label>
                  <input value={adress} onChange={(e) => setAdress(e.target.value)} placeholder="Ulica i broj" />
                </div>
                <div className="field">
                  <label>Grad</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Novi Pazar" />
                </div>
              </div>

              <div className="grid-2">
                <div className="field">
                  <label>Radno vreme</label>
                  <input
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    placeholder="npr. 09:00-17:00"
                  />
                </div>
                <div className="field">
                  <label>Google Maps link (opciono)</label>
                  <input
                    value={googleMapsLink}
                    onChange={(e) => setGoogleMapsLink(e.target.value)}
                    placeholder="https://maps.google.com/..."
                  />
                </div>
              </div>

              <div className="field">
                <label>Radni dani</label>
                <div className="days">
                  {WORKING_DAYS.map((d) => (
                    <label className="chk" key={d.key}>
                      <input type="checkbox" checked={workingDays.includes(d.key)} onChange={() => toggleDay(d.key)} />
                      <span>{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Tipovi usluga</label>
                <div className="types">
                  {serviceTypes?.length ? (
                    serviceTypes.map((t) => (
                      <label className="chk" key={t.id}>
                        <input
                          type="checkbox"
                          checked={selectedTypeIds.includes(t.id)}
                          onChange={() => toggleType(t.id)}
                        />
                        <span>{t.name}</span>
                      </label>
                    ))
                  ) : (
                    <div className="muted">Tipovi usluga nisu učitani.</div>
                  )}
                </div>
              </div>

              <div className="field">
                <label>Opis (opciono)</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kratak opis servisa..."
                />
              </div>

              <div className="field">
                <label>Slika servisa (opciono)</label>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              </div>

              <div className="actions">
                <button className="btn primary" type="submit" disabled={busy}>
                  {busy ? "Slanje..." : "Pošalji prijavu"}
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => {
                    clearAlert();
                    setStep("user");
                    setUserId(null);
                  }}
                >
                  Nazad
                </button>
              </div>
            </form>
          </div>
        )}

        {step === "done" && (
          <div className="postani-card">
            <h3 className="postani-card-title">Prijava je poslata</h3>
            <p className="postani-card-sub">
              Servis je uspešno prijavljen. Nalog čeka odobrenje admin tima. Nakon aktivacije, možete se ulogovati.
            </p>

            <div className="actions">
              <button className="btn primary" onClick={() => navigate("/uloguj-se")}>
                Uloguj se
              </button>
              <Link className="btn" to="/kontakt">
                Kontakt podrška
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}