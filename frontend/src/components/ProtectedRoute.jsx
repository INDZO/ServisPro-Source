import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../auth/auth";

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/uloguj-se" replace state={{ from: location.pathname }} />;
  }

  return children;
}