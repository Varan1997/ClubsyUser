import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import NotificationBell from "./NotificationBell.jsx";

export default function Navbar() {
  const { owner, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // The member view lives at /my; everywhere else inside the shell is the owner.
  const role = location.pathname.startsWith("/my") ? "member" : "owner";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <span className="brand-mark">C</span>
        Club<span className="brand-accent">sy</span>
      </Link>
      <div className="nav-right">
        {owner && <span className="who">{owner.name}</span>}
        {owner && <NotificationBell role={role} />}
        <ThemeToggle />
        <button className="btn secondary small" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
