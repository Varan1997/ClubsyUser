import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

export default function ChooseRole() {
  const navigate = useNavigate();
  const { owner } = useAuth();
  const firstName = owner?.name?.split(" ")[0] || "there";

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check both owner centers and member memberships in parallel,
    // then auto-redirect if the path is obvious.
    Promise.all([
      api.get("/centers").then((r) => r.data.centers?.length ?? 0).catch(() => 0),
      api.get("/my/memberships").then((r) => r.data.memberships?.length ?? 0).catch(() => 0),
    ]).then(([centerCount, membershipCount]) => {
      if (centerCount > 0 && membershipCount === 0) {
        // Pure owner — go straight to dashboard
        navigate("/dashboard", { replace: true });
      } else if (membershipCount > 0 && centerCount === 0) {
        // Pure member — go straight to memberships
        navigate("/my", { replace: true });
      } else {
        // Has both or has neither — show the choose screen
        setChecking(false);
      }
    });
  }, [navigate]);

  if (checking) return <div className="loading">Loading…</div>;

  return (
    <div className="choose-wrap">
      <div className="choose-inner">
        <div className="choose-head">
          <div className="choose-logo">
            <span className="brand-mark">C</span>
            Club<span className="brand-accent">sy</span>
          </div>
          <h1>Hi {firstName} 👋</h1>
          <p>How would you like to continue?</p>
        </div>

        <div className="choose-grid">
          <button className="choose-card venue" onClick={() => navigate("/")}>
            <span className="choose-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
              </svg>
            </span>
            <span className="choose-title">Venue Owner</span>
            <span className="choose-desc">
              Manage your gym, yoga, swimming or tuition venues &amp; members.
            </span>
            <span className="choose-go">Continue →</span>
          </button>

          <button className="choose-card member" onClick={() => navigate("/my")}>
            <span className="choose-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
              </svg>
            </span>
            <span className="choose-title">Member</span>
            <span className="choose-desc">
              View your subscriptions — plan, start &amp; expiry across venues.
            </span>
            <span className="choose-go">Continue →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
