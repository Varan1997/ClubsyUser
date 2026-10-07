import { useNavigate,Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { CATEGORIES } from "../utils/categories.js";
import CategoryIcon from "../components/CategoryIcon.jsx";

// Standalone category picker shown to first-time owners (no centres yet).
export default function Categories() {
  const navigate = useNavigate();
  const { owner } = useAuth();
  const firstName = owner?.name?.split(" ")[0] || "there";

  return (
    <>
      <div className="page-head">
          <Link to="/choose" className="back-link">
        <span className="back-icon" aria-hidden="true">←</span> Back
      </Link>
        <div>
          <h1>Hi {firstName} 👋</h1>
          <div className="sub">What kind of venue do you want to manage?</div>
        </div>
      </div>

      <CategoryGrid
        categories={CATEGORIES}
        onPick={(type) => navigate(`/centers/new?type=${encodeURIComponent(type)}`)}
      />
    </>
  );
}

// Reusable grid of category tiles.
export function CategoryGrid({ categories, onPick, counts = {} }) {
  return (
    <div className="category-grid">
      {categories.map((c) => (
        <button key={c.type} className="category-card" onClick={() => onPick(c.type)}>
          <span className="cc-icon">
            <CategoryIcon type={c.type} />
          </span>
          <span className="cc-title">{c.type}</span>
          {counts[c.type] > 0 && <span className="cc-badge">{counts[c.type]}</span>}
        </button>
      ))}
    </div>
  );
}
