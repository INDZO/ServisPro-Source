import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import "../../../styles/clientDashboard.css";
import "../../../styles/adminPages.css";

import AdminPendingServices from "./pages/AdminPendingServices.jsx";
import AdminServices from "./pages/AdminServices.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminServiceTypes from "./pages/AdminServiceTypes.jsx";
import AdminCarCatalog from "./pages/AdminCarCatalog.jsx";
import AdminCars from "./pages/AdminCars.jsx";
import AdminAppointments from "./pages/AdminAppointments.jsx";
import AdminCarHistory from "./pages/AdminCarHistory.jsx";
import AdminReviews from "./pages/AdminReviews.jsx";

import { clearAuth, getAuth } from "../../../auth/auth.js";

function cls(...parts) {
  return parts.filter(Boolean).join(" ");
}

function getTitle(pathname) {
  if (pathname.includes("/dashboard/pending-services")) return "Odobravanje servisa";
  if (pathname.includes("/dashboard/services")) return "Servisi";
  if (pathname.includes("/dashboard/users")) return "Korisnici";
  if (pathname.includes("/dashboard/service-types")) return "Tipovi usluga";
  if (pathname.includes("/dashboard/car-catalog")) return "Marke i modeli";
  if (pathname.includes("/dashboard/cars")) return "Vozila";
  if (pathname.includes("/dashboard/appointments")) return "Termini";
  if (pathname.includes("/dashboard/car-history")) return "Servisna evidencija";
  if (pathname.includes("/dashboard/reviews")) return "Recenzije";
  return "Admin";
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = getAuth();

  if (role && role !== "Admin") return <Navigate to="/dashboard" replace />;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const pageTitle = getTitle(location.pathname);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [drawerOpen]);

  const navClass = useMemo(
    () => ({ isActive }) => cls("dash-link", isActive && "is-active"),
    []
  );

  const onLogout = () => {
    clearAuth();
    navigate("/", { replace: true });
  };

  return (
    <div className="dash">
      <div className="dash-mobilebar">
        {!drawerOpen && (
          <button
            type="button"
            className="dash-burger"
            aria-label="Otvori meni"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
        )}
        <div className="dash-mobilebar-title" title={pageTitle}>
          {pageTitle}
        </div>
      </div>

      <div className={cls("dash-overlay", drawerOpen && "open")} onClick={() => setDrawerOpen(false)} />

      <aside className={cls("dash-side", drawerOpen && "open")}>
        <div className="dash-side-head">
          <div className="dash-side-name" title="Admin panel">
            Admin panel
          </div>
          <div className="dash-side-sub" title="Moderacija i šifarnici">
            Moderacija i šifarnici
          </div>

          <button type="button" className="dash-close" onClick={() => setDrawerOpen(false)} aria-label="Zatvori">
            ×
          </button>
        </div>

        <nav className="dash-nav" aria-label="Admin navigacija">
          <NavLink to="/dashboard/pending-services" className={navClass} onClick={() => setDrawerOpen(false)}>
            Odobravanje servisa
          </NavLink>
          <NavLink to="/dashboard/services" className={navClass} onClick={() => setDrawerOpen(false)}>
            Servisi
          </NavLink>
          <NavLink to="/dashboard/users" className={navClass} onClick={() => setDrawerOpen(false)}>
            Korisnici
          </NavLink>
          <NavLink to="/dashboard/service-types" className={navClass} onClick={() => setDrawerOpen(false)}>
            Tipovi usluga
          </NavLink>
          <NavLink to="/dashboard/car-catalog" className={navClass} onClick={() => setDrawerOpen(false)}>
            Marke i modeli
          </NavLink>
          <NavLink to="/dashboard/cars" className={navClass} onClick={() => setDrawerOpen(false)}>
            Vozila
          </NavLink>
          <NavLink to="/dashboard/appointments" className={navClass} onClick={() => setDrawerOpen(false)}>
            Termini
          </NavLink>
          <NavLink to="/dashboard/car-history" className={navClass} onClick={() => setDrawerOpen(false)}>
            Servisna evidencija
          </NavLink>
          <NavLink to="/dashboard/reviews" className={navClass} onClick={() => setDrawerOpen(false)}>
            Recenzije
          </NavLink>
        </nav>

        <div className="dash-side-footer">
          <button type="button" className="dash-logout" onClick={onLogout}>
            Odjavi se
          </button>
        </div>
      </aside>

      <main className="dash-main">
        <div className="dash-container">
          <Routes>
            <Route path="pending-services" element={<AdminPendingServices />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="service-types" element={<AdminServiceTypes />} />
            <Route path="car-catalog" element={<AdminCarCatalog />} />
            <Route path="cars" element={<AdminCars />} />
            <Route path="appointments" element={<AdminAppointments />} />
            <Route path="car-history" element={<AdminCarHistory />} />
            <Route path="reviews" element={<AdminReviews />} />

            <Route index element={<Navigate to="/dashboard/pending-services" replace />} />
            <Route path="*" element={<Navigate to="/dashboard/pending-services" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}