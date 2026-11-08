import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { clearAuth, isAuthenticated, getAuth } from "../auth/auth";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(isAuthenticated());

  const prevAuthedRef = useRef(authed);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onAuthChanged = () => {
      const nowAuthed = isAuthenticated();
      const wasAuthed = prevAuthedRef.current;

      setAuthed(nowAuthed);
      prevAuthedRef.current = nowAuthed;

      if (wasAuthed && !nowAuthed) {
        const reason = sessionStorage.getItem("authLogoutReason") || "";
        sessionStorage.removeItem("authLogoutReason");

        if (reason === "expired") {
          alert("Sesija je istekla. Molimo ulogujte se ponovo.");
          navigate("/uloguj-se", { replace: true });
        } else if (reason === "unauthorized") {
          alert("Sesija je istekla ili nemate autorizaciju. Molimo ulogujte se ponovo.");
          navigate("/uloguj-se", { replace: true });
        }
      }
    };

    window.addEventListener("auth:changed", onAuthChanged);
    window.addEventListener("storage", onAuthChanged);
    return () => {
      window.removeEventListener("auth:changed", onAuthChanged);
      window.removeEventListener("storage", onAuthChanged);
    };
  }, [navigate]);

  const navClass = ({ isActive }) => (isActive ? "navlink active" : "navlink");

  const onLogout = () => {
    clearAuth();
    navigate("/", { replace: true });
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <div className="navbar-left" onClick={() => navigate("/")}>
          <img className="navbar-logo" src={logo} alt="ServisPro logo" />
        </div>
        <nav className="navbar-center navbar-desktop" aria-label="Glavna navigacija">
          <NavLink to="/" className={navClass}>
            POČETNA
          </NavLink>
          <NavLink to="/auto-servisi" className={navClass}>
            AUTO SERVISI
          </NavLink>
          <NavLink to="/o-nama" className={navClass}>
            O NAMA
          </NavLink>
          <NavLink to="/kontakt" className={navClass}>
            KONTAKT
          </NavLink>
          {authed && (
            <NavLink to="/dashboard" className={navClass}>
              KONTROLNA TABLA
            </NavLink>
          )}
          {!authed && (
            <NavLink to="/postani-clan" className={navClass}>
              POSTANI ČLAN
            </NavLink>
          )}
        </nav>

        <div className="navbar-right navbar-desktop">
          {!authed ? (
            <button className="btn btn-solid" onClick={() => navigate("/uloguj-se")}>
              ULOGUJ SE
            </button>
          ) : (
            <button
              className="btn btn-solid"
              onClick={onLogout}
              title={`Uloga: ${getAuth().role || "-"}`}
            >
              ODJAVI SE
            </button>
          )}
        </div>

        <div className="navbar-mobile">
          <button
            className={`burger ${open ? "open" : ""}`}
            aria-label="Otvori meni"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className={`mobile-overlay ${open ? "open" : ""}`} onClick={() => setOpen(false)} />

      <aside className={`mobile-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-title">Meni</div>
          <button
            className="drawer-close"
            onClick={() => setOpen(false)}
            aria-label="Zatvori meni"
            type="button"
          >
            ×
          </button>
        </div>

        <nav className="mobile-nav" aria-label="Mobilna navigacija">
          <NavLink to="/" className={navClass}>
            Početna
          </NavLink>
          <NavLink to="/auto-servisi" className={navClass}>
            Auto servisi
          </NavLink>
          <NavLink to="/o-nama" className={navClass}>
            O nama
          </NavLink>
          <NavLink to="/kontakt" className={navClass}>
            Kontakt
          </NavLink>

          {authed && (
            <NavLink to="/dashboard" className={navClass}>
              Kontrolna tabla
            </NavLink>
          )}

          {!authed && (
            <NavLink to="/postani-clan" className={navClass}>
              Postani član (servis)
            </NavLink>
          )}
        </nav>

        <div className="mobile-actions">
          {!authed ? (
            <button className="btn btn-solid mobile-login" onClick={() => navigate("/uloguj-se")}>
              Uloguj se
            </button>
          ) : (
            <button className="btn btn-solid mobile-login" onClick={onLogout}>
              Odjavi se
            </button>
          )}
        </div>
      </aside>
    </header>
  );
}