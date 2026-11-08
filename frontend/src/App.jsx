import { DEMO_MODE } from "./api/baseUrl";
import { setAuth } from "./auth/auth";
import { Link, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";

import Pocetna from "./pages/Pocetna.jsx";
import AutoServisi from "./pages/AutoServisi.jsx";
import ONama from "./pages/ONama.jsx";
import PostaniClan from "./pages/PostaniClan.jsx";
import UlogujSe from "./pages/UlogujSe.jsx";
import Kontakt from "./pages/Kontakt.jsx";
import AutoServis from "./pages/AutoServis.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";


export default function App() {
  return (
    <div className="app">
      <Navbar />
      {DEMO_MODE && <aside className="demo-banner" aria-label="Demo mode">
        <div><strong>Demo Mode</strong> · Fiktivni podaci. Zahtevi važe samo do osvežavanja.</div>
        <Link to="/auto-servisi" onClick={() => setAuth({ token: "servispro-local-preview", role: "client", userId: 1 })}>
          Isprobaj zakazivanje ↗
        </Link>
      </aside>}

      <main className="main">
        <Routes>
          <Route path="/" element={<Pocetna />} />
          <Route path="/auto-servisi" element={<AutoServisi />} />
          <Route path="/o-nama" element={<ONama />} />
          <Route path="/postani-clan" element={DEMO_MODE ? <Navigate to="/auto-servisi" replace /> : <PostaniClan />} />
          <Route path="/uloguj-se" element={DEMO_MODE ? <Navigate to="/auto-servisi" replace /> : <UlogujSe />} />
          <Route path="/kontakt" element={DEMO_MODE ? <Navigate to="/auto-servisi" replace /> : <Kontakt />} />
          <Route path="/auto-servis/:id" element={<AutoServis />} />
          <Route path="/dashboard/*" element={
                DEMO_MODE ? <Navigate to="/auto-servisi" replace /> : <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="footer footer-dark">
        <div className="container footer-grid">
          <div className="footer-col">
            <div className="footer-brand">ServisPro</div>
            <p className="footer-text">
              Platforma za jednostavno zakazivanje termina i digitalnu servisnu evidenciju vozila.
            </p>

            <div className="footer-cta">
                <Link className="btn btn-footer" to="/kontakt">
                 Postavite pitanje
                </Link>
            </div>
          </div>

          <div className="footer-col">
            <div className="footer-title">Brzi linkovi</div>
            <ul className="footer-links">
              <li><Link to="/">Početna</Link></li>
              <li><Link to="/auto-servisi">Auto servisi</Link></li>
              <li><Link to="/o-nama">O nama</Link></li>
              <li><Link to="/postani-clan">Postani član (servis)</Link></li>
              <li><Link to="/uloguj-se">Uloguj se</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <div className="footer-title">Kontakt</div>

            <div className="footer-info">
              <div className="footer-info-row">
                <span className="footer-label">Email:</span>
                <a href="mailto:contact@example.invalid">contact@example.invalid</a>
              </div>

              <div className="footer-info-row">
                <span className="footer-label">Lokacija:</span>
                <span>Novi Pazar</span>
              </div>
            </div>

            <div className="footer-mini">
              Radno vreme podrške: Pon–Pet (09:00–17:00)
            </div>
          </div>
        </div>

        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} ServisPro</span>
          <span className="footer-bottom-right">
            <Link to="/kontakt">Kontakt</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
