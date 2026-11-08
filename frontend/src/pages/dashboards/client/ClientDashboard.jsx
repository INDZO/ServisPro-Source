import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import "../../../styles/clientDashboard.css";

import ClientProfileOverview from "./pages/ClientProfileOverview.jsx";
import ClientChat from "./pages/ClientChat.jsx";
import ClientCars from "./pages/ClientCars.jsx";
import ClientAppointments from "./pages/ClientAppointments.jsx";

import { clearAuth } from "../../../auth/auth.js"
import { ClientProfileApi } from "../../../api/clientProfileApi.js";
import { ChatApi } from "../../../api/chatApi.js"; 

function cls(...parts) {
  return parts.filter(Boolean).join(" ");
}

function getDashboardTitle(pathname) {
  if (pathname.includes("/dashboard/chat")) return "Chat";
  if (pathname.includes("/dashboard/cars")) return "Vozila";
  if (pathname.includes("/dashboard/appointments")) return "Termini";
  return "Profil";
}

export default function ClientDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [profile, setProfile] = useState({ fullName: "", email: "", imageUrl: "" });

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
        const p = await ClientProfileApi.get();
        if (!cancelled && p) {
          setProfile({
            fullName: p.fullName || "",
            email: p.email || "",
            imageUrl: p.imageUrl || "",
          });
        }

        const conv = await ChatApi.getConversations();
        if (!cancelled && Array.isArray(conv)) {
          const total = conv.reduce((sum, c) => sum + (Number(c.unreadCount || c.UnreadCount || 0) || 0), 0);
          setUnreadTotal(total);
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
          <div className="dash-side-name" title={profile.fullName || "Klijent"}>
            {profile.fullName || "Klijent"}
          </div>
          <div className="dash-side-sub" title={profile.email || ""}>
            {profile.email || ""}
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
            <Route path="profile" element={<ClientProfileOverview onProfileChanged={setProfile} />} />
            <Route path="chat" element={<ClientChat />} />
            <Route path="cars" element={<ClientCars />} />
            <Route path="appointments" element={<ClientAppointments />} />

            <Route index element={<Navigate to="/dashboard/profile" replace />} />
            <Route path="*" element={<Navigate to="/dashboard/profile" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}