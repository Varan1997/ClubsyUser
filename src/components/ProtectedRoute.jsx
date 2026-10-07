import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { owner, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!owner) return <Navigate to="/login" replace />;
  return children;
}
