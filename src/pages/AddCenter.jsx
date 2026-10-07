import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios.js";
import { CATEGORIES } from "../utils/categories.js";
import { CategoryGrid } from "./Categories.jsx";

// Page to pick a category for a NEW centre (reached from the dashboard "+").
// Shows only categories the owner hasn't created yet.
export default function AddCenter() {
  const navigate = useNavigate();
  const [existingTypes, setExistingTypes] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/centers")
      .then((res) => setExistingTypes(new Set(res.data.centers.map((c) => c.type))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const remaining = CATEGORIES.filter((c) => !existingTypes.has(c.type));

  return (
    <>
      <Link to="/choose" className="back-link">
        <span className="back-icon" aria-hidden="true">←</span> Back
      </Link>

      <div className="page-head">
        <div>
          <h1>Add a venue</h1>
          <div className="sub">Choose the type of venue you want to create</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : remaining.length === 0 ? (
        <div className="empty">
          You've already added every category 🎉
          <div style={{ marginTop: 16 }}>
            <Link to="/choose" className="btn secondary">
              Back
            </Link>
          </div>
        </div>
      ) : (
        <CategoryGrid
          categories={remaining}
          onPick={(type) => navigate(`/centers/new?type=${encodeURIComponent(type)}`)}
        />
      )}
    </>
  );
}
