import { Navigate } from "react-router-dom";
import { getAuth } from "../auth/auth";
import ClientDashboard from "./dashboards/client/ClientDashboard.jsx";
import ServiceDashboard from "./dashboards/service/ServiceDashboard.jsx";
import AdminDashboard from "./dashboards/admin/AdminDashboard.jsx";

export default function Dashboard() {
  const { role } = getAuth();

  if (!role) return <Navigate to="/uloguj-se" replace />;

  if (role === "Client") return <ClientDashboard />;
  if (role === "Service") return <ServiceDashboard />;
  if (role === "Admin") return <AdminDashboard />;

  return (
    <div className="container" style={{ padding: "24px 0" }}>
      <h1>Kontrolna tabla</h1>
      <p>
        Uloga nije prepoznata: <b>{role}</b>
      </p>
    </div>
  );
}