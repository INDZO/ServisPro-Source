import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";
import { AuthApi } from "../api/authApi";
import { ImageApi } from "../api/imageApi";
import { setAuth } from "../auth/auth";
import PasswordInput from "../components/PasswordInput";

const DEFAULT_CLIENT_IMAGE_URL =
  "https://res.cloudinary.com/dbdpwiidk/image/upload/v1767672175/depositphotos_137014128-stock-illustration-user-profile-icon_qg26rb.webp";


const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const fullNameRegex =
  /^[A-Za-zÀ-ÖØ-öø-ÿĆČĐŠŽćčđšž]{2,40}(?:[ -'][A-Za-zÀ-ÖØ-öø-ÿĆČĐŠŽćčđšž]{2,40})+$/;

function trim(v) {
  return (v ?? "").toString().trim();
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

function normalizeBackendMessage(msg) {
  const m = (msg ?? "").toString().trim();
  if (!m) return "";

  const lower = m.toLowerCase();

  if (lower.includes("account deleted") || lower.includes("deleted")) {
    return "Nalog je obrisan/deaktiviran. Ako mislite da je ovo greška, kontaktirajte podršku.";
  }

  if (lower.includes("not approved") || lower.includes("awaiting") || lower.includes("approval")) {
    return "Vaš servis nalog čeka odobrenje admina. Pokušajte ponovo kasnije.";
  }

  if (lower.includes("invalid") || lower.includes("wrong") || lower.includes("incorrect")) {
    return "Neispravan email ili lozinka.";
  }

  if (lower.includes("blocked") || lower.includes("banned") || lower.includes("disabled")) {
    return "Nalog je blokiran. Kontaktirajte podršku.";
  }

  return m;
}

function useCooldown(initialSeconds = 60) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const start = (secs = initialSeconds) => setSecondsLeft(secs);
  const canSend = secondsLeft <= 0;

  return { secondsLeft, start, canSend };
}

export default function UlogujSe() {
  const navigate = useNavigate();

  const [view, setView] = useState("login");

  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState({ type: "idle", msg: "" }); 

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerUserId, setRegisterUserId] = useState(null);

  const [fullName, setFullName] = useState("");
  const [profileImageFile, setProfileImageFile] = useState(null);

  const [code, setCode] = useState("");

  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const verifyCooldown = useCooldown(60);
  const resetCooldown = useCooldown(60);

  function setOk(msg) {
    setAlert({ type: "ok", msg });
  }
  function setBad(msg) {
    setAlert({ type: "bad", msg });
  }
  function clearAlert() {
    setAlert({ type: "idle", msg: "" });
  }

  const isTabVisible = useMemo(() => view === "login" || view === "register", [view]);

  function getStepTitle(v) {
    switch (v) {
      case "login":
        return { title: "Prijava", sub: "Unesite email i lozinku za pristup nalogu." };
      case "register":
        return { title: "Registracija klijenta", sub: "Kreirajte nalog. Zatim unesite podatke profila i verifikujte email." };
      case "create-client-profile":
        return { title: "Podešavanje profila", sub: "Unesite ime i prezime i opciono dodajte sliku profila." };
      case "verify-email":
        return { title: "Verifikacija emaila", sub: "Unesite kod koji je poslat na vašu email adresu." };
      case "forgot":
        return { title: "Zaboravljena lozinka", sub: "Unesite email i poslaćemo kod za reset lozinke." };
      case "reset":
        return { title: "Reset lozinke", sub: "Unesite kod i novu lozinku (sa potvrdom)." };
      default:
        return { title: "Autentifikacija", sub: "" };
    }
  }

  function switchToLogin() {
    clearAlert();
    setView("login");
    setPassword("");
  }

  function switchToRegister() {
    clearAlert();
    setView("register");
    setPassword("");
    setConfirmPassword("");
    setRegisterUserId(null);
  }

  async function handleLogin(e) {
    e.preventDefault();
    clearAlert();

    const eErr = validateEmail(email);
    if (eErr) return setBad(eErr);

    const pErr = password ? "" : "Lozinka je obavezna.";
    if (pErr) return setBad(pErr);

    setBusy(true);
    try {
      const res = await AuthApi.login({ email: trim(email), password });

      if (typeof res === "string") {
        setBad(normalizeBackendMessage(res));
        return;
      }

      if (res?.message && !res?.token && !res?.continueRegistration) {
        setBad(normalizeBackendMessage(res.message));
        return;
      }

      if (res?.continueRegistration) {
        const step = (res.step ?? "").toString();

        if (step === "create-client-profile") {
          setRegisterUserId(res.userId);
          setView("create-client-profile");
          setOk(res.message || "Nalog postoji, ali profil nije završen. Nastavite registraciju.");
          return;
        }

        if (step === "create-service-profile") {
          const forwardEmail = res.email || trim(email);
          setOk(res.message || "Nalog postoji, ali servis profil nije završen. Nastavite unos podataka servisa.");
          navigate("/postani-clan", {
            replace: true,
            state: { userId: res.userId, email: forwardEmail, continue: true },
          });
          return;
        }

        if (step === "awaiting-approval") {
          setBad(res.message || "Vaš servis nalog čeka odobrenje admina. Pokušajte ponovo kasnije.");
          return;
        }

        if (step === "verify-email") {
          if (res.email) setEmail(res.email);
          setView("verify-email");
          setOk(res.message || "Kod za verifikaciju je poslat na email.");
          verifyCooldown.start(60);
          return;
        }

        setBad(res.message || `Nije moguće ulogovati se: step="${step || "unknown"}".`);
        return;
      }

      if (res?.token) {
        setAuth({ token: res.token, role: res.role || "", userId: res.userId ?? "" });
        setOk("Uspešna prijava.");
        navigate("/dashboard", { replace: true });
        return;
      }

      setBad("Neočekivan odgovor servera.");
    } catch (err) {
      setBad(normalizeBackendMessage(err?.message || "Prijava nije uspela."));
    } finally {
      setBusy(false);
    }
  }

  async function handleRegisterUser(e) {
    e.preventDefault();
    clearAlert();

    const eErr = validateEmail(email);
    if (eErr) return setBad(eErr);

    const pErr = validatePasswordStrong(password);
    if (pErr) return setBad(pErr);

    if (password !== confirmPassword) return setBad("Lozinke se ne poklapaju.");

    setBusy(true);
    try {
      const res = await AuthApi.registerUser({
        email: trim(email),
        password,
        role: "Client",
      });

      setRegisterUserId(res.userId);
      setOk(res.message || "Korisnik je kreiran. Nastavite sa profilom.");
      setView("create-client-profile");
    } catch (err) {
      setBad(normalizeBackendMessage(err?.message || "Registracija nije uspela."));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateClientProfile(e) {
    e.preventDefault();
    clearAlert();

    if (!registerUserId) return setBad("Nedostaje userId (registracija nije započeta).");

    const nameErr = validateFullName(fullName);
    if (nameErr) return setBad(nameErr);

    setBusy(true);
    try {
      let uploaded = null;
      if (profileImageFile) uploaded = await ImageApi.upload(profileImageFile);

      const finalImageUrl = uploaded?.url ?? DEFAULT_CLIENT_IMAGE_URL;
      const finalPublicId = uploaded?.publicId ?? null;

      const res = await AuthApi.createClientProfile({
        userId: registerUserId,
        fullName: trim(fullName),
        imageUrl: finalImageUrl,
        imagePublicId: finalPublicId,
      });

      setOk(typeof res === "string" ? res : "Profil je sačuvan. Proverite email za verifikacioni kod.");
      setView("verify-email");
      verifyCooldown.start(60);
    } catch (err) {
      setBad(normalizeBackendMessage(err?.message || "Kreiranje profila nije uspelo."));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyEmail(e) {
    e.preventDefault();
    clearAlert();

    const eErr = validateEmail(email);
    if (eErr) return setBad("Nedostaje ispravan email (vrati se na login/register).");

    const c = trim(code);
    if (!c) return setBad("Unesite verifikacioni kod.");
    if (c.length < 4) return setBad("Kod izgleda prekratko.");

    setBusy(true);
    try {
      const res = await AuthApi.verifyEmail({ email: trim(email), code: c });

      if (res?.token) {
        setAuth({ token: res.token, role: res.role || "", userId: res.userId ?? "" });
        setOk("Email je verifikovan. Uspešna prijava.");
        navigate("/dashboard", { replace: true });
        return;
      }

      setBad("Verifikacija je prošla, ali token nije vraćen.");
    } catch (err) {
      setBad(normalizeBackendMessage(err?.message || "Verifikacija nije uspela."));
    } finally {
      setBusy(false);
    }
  }

  async function handleResendOtp() {
    clearAlert();

    const eErr = validateEmail(email);
    if (eErr) return setBad("Nedostaje ispravan email (vrati se na login/register).");
    if (!verifyCooldown.canSend) return;

    setBusy(true);
    try {
      const res = await AuthApi.resendOtp(trim(email));
      setOk(typeof res === "string" ? res : "Novi kod je poslat.");
      verifyCooldown.start(60);
    } catch (err) {
      setBad(normalizeBackendMessage(err?.message || "Slanje novog koda nije uspelo."));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    clearAlert();

    const eErr = validateEmail(email);
    if (eErr) return setBad(eErr);

    setBusy(true);
    try {
      const res = await AuthApi.forgotPassword(trim(email));
      setOk(typeof res === "string" ? res : "Kod za reset lozinke je poslat.");
      resetCooldown.start(60);
      setView("reset");
    } catch (err) {
      setBad(normalizeBackendMessage(err?.message || "Slanje koda nije uspelo."));
    } finally {
      setBusy(false);
    }
  }

  async function handleResendResetCode() {
    clearAlert();

    const eErr = validateEmail(email);
    if (eErr) return setBad("Nedostaje ispravan email.");
    if (!resetCooldown.canSend) return;

    setBusy(true);
    try {
      const res = await AuthApi.forgotPassword(trim(email));
      setOk(typeof res === "string" ? res : "Novi kod je poslat.");
      resetCooldown.start(60);
    } catch (err) {
      setBad(normalizeBackendMessage(err?.message || "Slanje novog koda nije uspelo."));
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    clearAlert();

    const eErr = validateEmail(email);
    if (eErr) return setBad(eErr);

    const c = trim(resetCode);
    if (!c) return setBad("Unesite kod.");
    if (c.length < 4) return setBad("Kod izgleda prekratko.");

    const npErr = validatePasswordStrong(newPassword);
    if (npErr) return setBad(npErr);

    if (newPassword !== confirmNewPassword) return setBad("Lozinke se ne poklapaju.");

    setBusy(true);
    try {
      const res = await AuthApi.resetPassword({
        email: trim(email),
        code: c,
        newPassword,
      });

      setOk(typeof res === "string" ? res : "Lozinka je resetovana.");

      setResetCode("");
      setNewPassword("");
      setConfirmNewPassword("");
      setView("login");
    } catch (err) {
      setBad(normalizeBackendMessage(err?.message || "Reset lozinke nije uspeo."));
    } finally {
      setBusy(false);
    }
  }

  const step = getStepTitle(view);

  return (
    <section className="auth-wrap">
      <div className="auth-shell">
        {isTabVisible && (
          <div className={`auth-toggle outside ${view === "register" ? "is-register" : "is-login"}`}>
            <div className="pill" />
            <button type="button" data-tab="login" onClick={switchToLogin}>
              Login
            </button>
            <button type="button" data-tab="register" onClick={switchToRegister}>
              Register
            </button>
          </div>
        )}

        <div className="auth-card">
          <h1 className="auth-title">{step.title}</h1>
          {step.sub ? <p className="auth-sub">{step.sub}</p> : null}

          {alert.type !== "idle" && <div className={`auth-alert ${alert.type === "ok" ? "ok" : "bad"}`}>{alert.msg}</div>}

          {view === "login" && (
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="auth-field">
                <label>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@example.invalid" autoComplete="email" />
              </div>

              <div className="auth-field">
                <label>Lozinka</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  autoComplete="current-password"
                />
              </div>

              <div className="auth-actions">
                <button className="auth-btn primary" type="submit" disabled={busy}>
                  {busy ? "Prijava..." : "Uloguj se"}
                </button>
              </div>

              <div className="auth-links">
                <button type="button" className="auth-link" onClick={() => { clearAlert(); setView("forgot"); }}>
                  Zaboravljena lozinka?
                </button>
                <button type="button" className="auth-link" onClick={switchToRegister}>
                  Nemate nalog? Registrujte se
                </button>
              </div>
            </form>
          )}

          {view === "register" && (
            <form className="auth-form" onSubmit={handleRegisterUser}>
              <div className="auth-field">
                <label>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@example.invalid" autoComplete="email" />
              </div>

              <div className="auth-field">
                <label>Lozinka</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="min 8, veliko slovo i broj"
                  autoComplete="new-password"
                />
              </div>

              <div className="auth-field">
                <label>Potvrda lozinke</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="ponovite lozinku"
                  autoComplete="new-password"
                />
              </div>

              <div className="auth-actions">
                <button className="auth-btn primary" type="submit" disabled={busy}>
                  {busy ? "Kreiranje..." : "Nastavi"}
                </button>
              </div>

              <div className="auth-links">
                <button type="button" className="auth-link" onClick={switchToLogin}>
                  Već imate nalog? Ulogujte se
                </button>
                <button type="button" className="auth-link" onClick={() => navigate("/postani-clan")}>
                  Registracija servisa (Postani član)
                </button>
              </div>
            </form>
          )}

          {view === "create-client-profile" && (
            <form className="auth-form" onSubmit={handleCreateClientProfile}>
              <div className="auth-field">
                <label>Ime i prezime</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="npr. Admir Hamzagić" />
              </div>

              <div className="auth-field">
                <label>Profilna slika (opciono)</label>
                <input type="file" accept="image/*" onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)} />
              </div>

              <div className="auth-actions">
                <button className="auth-btn primary" type="submit" disabled={busy}>
                  {busy ? "Čuvanje..." : "Sačuvaj profil"}
                </button>
                <button type="button" className="auth-btn" disabled={busy} onClick={switchToLogin}>
                  Nazad na login
                </button>
              </div>
            </form>
          )}

          {view === "verify-email" && (
            <form className="auth-form" onSubmit={handleVerifyEmail}>
              <div className="auth-alert ok">
                Kod je poslat na: <strong>{trim(email) || "(nepoznat email)"}</strong>
              </div>

              <div className="auth-field">
                <label>Verifikacioni kod</label>
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Unesite kod iz emaila" />
              </div>

              <div className="auth-actions">
                <button className="auth-btn primary" type="submit" disabled={busy}>
                  {busy ? "Provera..." : "Verifikuj"}
                </button>

                <button type="button" className="auth-btn" disabled={busy || !verifyCooldown.canSend} onClick={handleResendOtp}>
                  {verifyCooldown.canSend ? "Pošalji novi kod" : `Sačekaj ${verifyCooldown.secondsLeft}s`}
                </button>
              </div>

              <div className="auth-links">
                <button type="button" className="auth-link" onClick={switchToLogin}>
                  Nazad na login
                </button>
              </div>
            </form>
          )}

          {view === "forgot" && (
            <form className="auth-form" onSubmit={handleForgotPassword}>
              <div className="auth-field">
                <label>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@example.invalid" autoComplete="email" />
              </div>

              <div className="auth-actions">
                <button className="auth-btn primary" type="submit" disabled={busy}>
                  {busy ? "Slanje..." : "Pošalji kod"}
                </button>
                <button type="button" className="auth-btn" disabled={busy} onClick={switchToLogin}>
                  Nazad
                </button>
              </div>
            </form>
          )}

          {view === "reset" && (
            <form className="auth-form" onSubmit={handleResetPassword}>
              <div className="auth-alert ok">
                Kod za reset je poslat na: <strong>{trim(email) || "(nepoznat email)"}</strong>
              </div>

              <div className="auth-field">
                <label>Kod</label>
                <input value={resetCode} onChange={(e) => setResetCode(e.target.value)} placeholder="Kod iz emaila" />
              </div>

              <div className="auth-field">
                <label>Nova lozinka</label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="min 8, veliko slovo i broj"
                  autoComplete="new-password"
                />
              </div>

              <div className="auth-field">
                <label>Potvrda lozinke</label>
                <PasswordInput
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="ponovite lozinku"
                  autoComplete="new-password"
                />
              </div>

              <div className="auth-actions">
                <button className="auth-btn primary" type="submit" disabled={busy}>
                  {busy ? "Reset..." : "Resetuj lozinku"}
                </button>

                <button
                  type="button"
                  className="auth-btn"
                  disabled={busy || !resetCooldown.canSend}
                  onClick={handleResendResetCode}
                >
                  {resetCooldown.canSend ? "Pošalji novi kod" : `Sačekaj ${resetCooldown.secondsLeft}s`}
                </button>
              </div>

              <div className="auth-links">
                <button type="button" className="auth-link" onClick={() => { clearAlert(); setView("forgot"); }}>
                  Promeni email
                </button>
                <button type="button" className="auth-link" onClick={switchToLogin}>
                  Nazad na login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}