import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import "../../../styles/clientDashboard.css";

import ServiceProfileOverview from "./pages/ServiceProfileOverview.jsx";
import ServiceChat from "./pages/ServiceChat.jsx";
import ServiceCars from "./pages/ServiceCars.jsx";
import ServiceAppointments from "./pages/ServiceAppointments.jsx";
import ServiceWorkHistory from "./pages/ServiceWorkHistory.jsx";

import { clearAuth, getAuth } from "../../../auth/auth.js";
import { ChatApi } from "../../../api/chatApi.js";
import { ServiceProfileApi } from "../../../api/serviceProfileApi.js";

function cls(...parts) {
  return parts.filter(Boolean).join(" ");
}

function getDashboardTitle(pathname) {
  if (pathname.includes("/dashboard/chat")) return "Chat";
  if (pathname.includes("/dashboard/cars")) return "Vozila";
  if (pathname.includes("/dashboard/appointments")) return "Termini";
  if (pathname.includes("/dashboard/work")) return "Urađeni poslovi";
  return "Profil";
}

export default function ServiceDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const { role } = getAuth();
  if (role && role !== "Service") return <Navigate to="/dashboard" replace />;

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [profile, setProfile] = useState({ name: "", ownerFullName: "", city: "", imageUrl: "" });

  const [unreadTotal, setUnreadTotal] = useState(0);

  const pageTitle = getDashboardTitle(location.pathname);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const navClass = useMemo(
    () =>
      ({ isActive }) =>
        cls("dash-link", isActive && "is-active"),
    []
  );

  const closeDrawer = () => setDrawerOpen(false);
  const openDrawer = () => setDrawerOpen(true);

  const onLogout = () => {
    clearAuth();
    navigate("/", { replace: true });
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const p = await ServiceProfileApi.get();
        if (!cancelled && p) {
          setProfile({
            name: p.name || p.Name || "",
            ownerFullName: p.ownerFullName || p.OwnerFullName || "",
            city: p.city || p.City || "",
            imageUrl: p.imageUrl || p.ImageUrl || "",
          });
        }
      } catch {
      }

      try {
        const conv = await ChatApi.getConversations();
        if (!cancelled && Array.isArray(conv)) {
          const total = conv.reduce((sum, c) => sum + (Number(c.unreadCount || c.UnreadCount || 0) || 0), 0);
          setUnreadTotal(total);
        }
      } catch {
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onUnread = (e) => {
      const total = Number(e?.detail?.total ?? 0) || 0;
      setUnreadTotal(total);
    };

    window.addEventListener("chat:unread", onUnread);
    return () => window.removeEventListener("chat:unread", onUnread);
  }, []);

  const sideTitle = profile?.name || "Servis";
  const sideSub = [profile?.ownerFullName, profile?.city].filter(Boolean).join(" • ");

  return (
    <div className="dash">
      <div className="dash-mobilebar">
        {!drawerOpen && (
          <button
            type="button"
            className="dash-burger"
            aria-label="Otvori dashboard meni"
            aria-expanded={drawerOpen}
            onClick={openDrawer}
          >
            <span />
            <span />
            <span />
          </button>
        )}

        <div className="dash-mobilebar-title" title={pageTitle}>
          {pageTitle}
        </div>

        {unreadTotal > 0 ? <span className="dash-mobilebar-dot" aria-label="Ima nepročitanih poruka" /> : null}
      </div>

      <div className={cls("dash-overlay", drawerOpen && "open")} onClick={closeDrawer} />

      <aside className={cls("dash-side", drawerOpen && "open")}>
        <div className="dash-side-head">
          <div className="dash-side-name" title={sideTitle}>
            {sideTitle}
          </div>
          <div className="dash-side-sub" title={sideSub}>
            {sideSub}
          </div>

          <button type="button" className="dash-close" onClick={closeDrawer} aria-label="Zatvori meni">
            ×
          </button>
        </div>

        <nav className="dash-nav" aria-label="Dashboard navigacija">
          <NavLink to="/dashboard/profile" className={navClass} onClick={closeDrawer}>
            Profil
          </NavLink>

          <NavLink
            to="/dashboard/chat"
            className={({ isActive }) =>
              cls("dash-link", isActive && "is-active", unreadTotal > 0 && "dash-link--hot")
            }
            onClick={closeDrawer}
          >
            <span className="dash-link-row">
              <span>Poruke</span>
              {unreadTotal > 0 ? <span className="dash-badge dash-badge--hot">{unreadTotal}</span> : null}
            </span>
          </NavLink>

          <NavLink to="/dashboard/cars" className={navClass} onClick={closeDrawer}>
            Vozila
          </NavLink>

          <NavLink to="/dashboard/appointments" className={navClass} onClick={closeDrawer}>
            Termini
          </NavLink>

          <NavLink to="/dashboard/work" className={navClass} onClick={closeDrawer}>
            Urađeni poslovi
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
            <Route path="profile" element={<ServiceProfileOverview onProfileChanged={setProfile} />} />
            <Route path="chat" element={<ServiceChat />} />
            <Route path="cars" element={<ServiceCars />} />
            <Route path="appointments" element={<ServiceAppointments />} />
            <Route path="work" element={<ServiceWorkHistory />} />

            <Route index element={<Navigate to="/dashboard/profile" replace />} />
            <Route path="*" element={<Navigate to="/dashboard/profile" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}