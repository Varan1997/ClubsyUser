import { useEffect, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import CategoryIcon from "../components/CategoryIcon.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatDate } from "../utils/format.js";

const ScanCheckIn = lazy(() => import("../components/ScanCheckIn.jsx"));
const AttendanceCalendar = lazy(() => import("../components/AttendanceCalendar.jsx"));

// ── Helpers ───────────────────────────────────────────────────────────────────
function pct(daysLeft, planDays) {
  if (!planDays) return 0;
  return Math.max(0, Math.min(100, Math.round((daysLeft / planDays) * 100)));
}
function barColor(p) {
  return p > 40 ? "#22c55e" : p > 15 ? "#f59e0b" : "#ef4444";
}

// ── Plan detail panel — shown inside a tab ────────────────────────────────────
function PlanDetail({ sub }) {
  const p = pct(sub.daysLeft, sub.planDays);
  const bc = barColor(p);
  return (
    <div className="myd-plan-detail">
      {/* Progress bar */}
      <div className="myd-progress">
        <div className="myd-progress-fill" style={{ width: `${p}%`, background: bc }} />
      </div>
      <div className="myd-progress-label">{p}% of plan remaining</div>

      {/* Detail rows */}
      <div className="myd-rows">
        <div className="myd-row"><span>Plan duration</span><strong>{sub.planDays} days</strong></div>
        {sub.price != null && (
          <div className="myd-row"><span>Plan price</span><strong>₹{sub.price}</strong></div>
        )}
        <div className="myd-row"><span>Start date</span><strong>{formatDate(sub.joinDate)}</strong></div>
        <div className="myd-row"><span>Expiry date</span><strong>{formatDate(sub.expiryDate)}</strong></div>
        <div className="myd-row">
          <span>Days left</span>
          <strong style={{ color: sub.daysLeft < 0 ? "var(--red)" : sub.daysLeft <= 7 ? "var(--amber)" : "var(--green)" }}>
            {sub.daysLeft < 0
              ? `Expired ${Math.abs(sub.daysLeft)}d ago`
              : `${sub.daysLeft} days`}
          </strong>
        </div>
        {sub.venue?.upiId && (
          <div className="myd-row">
            <span>Pay (UPI)</span>
            <strong className="myd-upi">{sub.venue.upiId}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MyMemberships() {
  const { owner } = useAuth();
  const [list, setList]       = useState([]);   // all memberships flat
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // venueId of opened venue
  const [activeTab, setActiveTab] = useState("regular"); // "regular" | "pt"
  const [scanVenue, setScanVenue] = useState(null);

  function loadMemberships() {
    api.get("/my/memberships")
      .then((r) => setList(r.data.memberships))
      .catch(() => {});
  }

  useEffect(() => {
    api.get("/my/memberships")
      .then((r) => setList(r.data.memberships))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading…</div>;

  const firstName = owner?.name?.split(" ")[0] || "there";

  // Group memberships by venue — one entry per venue
  const venueMap = {};
  for (const m of list) {
    const vid = m.venue?._id?.toString();
    if (!vid) continue;
    if (!venueMap[vid]) venueMap[vid] = { venue: m.venue, regular: null, pt: null };
    if ((m.memberType || "regular") === "regular") venueMap[vid].regular = m;
    else venueMap[vid].pt = m;
  }
  const venues = Object.values(venueMap);

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (selected) {
    const group = venueMap[selected];
    if (!group) { setSelected(null); return null; }

    const { venue, regular: regularSub, pt: ptSub } = group;
    const hasPt = !!ptSub;

    // Determine which sub is shown in the active tab
    const activeSub = activeTab === "pt" && hasPt ? ptSub : regularSub;

    // Header status: prefer active, else whichever exists
    const headerSub = (regularSub?.status === "active" ? regularSub : null)
      || (ptSub?.status === "active" ? ptSub : null)
      || regularSub || ptSub;

    // memberId for attendance calendar — use the tab's sub
    const calMemberId = activeSub?._id;

    return (
      <>
        <button type="button" className="back-link" onClick={() => setSelected(null)}>
          <span className="back-icon" aria-hidden="true">←</span> My memberships
        </button>

        {/* Venue header */}
        <div className="myd-head">
          <span className="myd-ic">
            <CategoryIcon type={venue?.type || "Other"} />
          </span>
          <div className="myd-head-text">
            <h2>{venue?.name || "Venue"}</h2>
            <div className="myd-type">
              {venue?.type}{venue?.location ? ` · ${venue.location}` : ""}
            </div>
          </div>
        </div>

        {/* Status row + scan */}
        <div className="myd-status">
          <StatusBadge status={headerSub?.status} />
          <span className="myd-days">
            {headerSub
              ? (headerSub.daysLeft < 0
                  ? `Expired ${Math.abs(headerSub.daysLeft)} days ago`
                  : `${headerSub.daysLeft} days remaining`)
              : ""}
          </span>
          {venue?._id && (
            <button
              type="button"
              className="my-card-scan-ic myd-scan-ic"
              onClick={() => setScanVenue(venue)}
              aria-label="Scan to check in"
              title={`Scan to check in at ${venue?.name}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
                <path d="M3 12h18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Tab switcher — Regular always shown; PT only if member has PT */}
        <div className={`myd-sub-tabs ${hasPt ? "two-tabs" : "one-tab"}`}>
          <button
            type="button"
            className={`myd-sub-tab ${activeTab === "regular" ? "active" : ""}`}
            onClick={() => setActiveTab("regular")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/>
              <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>
            </svg>
            Regular
          </button>

          {hasPt && (
            <button
              type="button"
              className={`myd-sub-tab ${activeTab === "pt" ? "active" : ""}`}
              onClick={() => setActiveTab("pt")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 4v16M18 4v16M6 12h12"/>
                <circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/>
                <circle cx="6" cy="20" r="2"/><circle cx="18" cy="20" r="2"/>
              </svg>
              Personal Training
            </button>
          )}

          {/* sliding gold indicator pill */}
          <div
            className="myd-sub-tab-indicator"
            style={{
              transform: `translateX(${hasPt && activeTab === "pt" ? "100%" : "0%"})`,
              width: hasPt ? "calc(50% - 4px)" : "calc(100% - 8px)",
            }}
          />
        </div>

        {/* Active tab plan details */}
        {activeSub ? (
          <PlanDetail sub={activeSub} />
        ) : (
          <div className="empty" style={{ padding: "24px 0" }}>
            No {activeTab === "pt" ? "Personal Training" : "Regular"} membership at this venue.
          </div>
        )}

        {/* Attendance calendar — always below, scoped to active tab's member */}
        <div className="myd-att-section">
          <div className="myd-att-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            Attendance
          </div>
          <Suspense fallback={<div className="loading">Loading…</div>}>
            {calMemberId && <AttendanceCalendar memberId={calMemberId} />}
          </Suspense>
        </div>

        {scanVenue && (
          <Suspense fallback={null}>
            <ScanCheckIn
              expectedVenueId={scanVenue._id}
              venueName={scanVenue.name}
              onClose={() => setScanVenue(null)}
              onSuccess={() => { loadMemberships(); setScanVenue(null); }}
            />
          </Suspense>
        )}
      </>
    );
  }

  // ── List view — one card per venue ──────────────────────────────────────────
  return (
    <>
      <Link to="/choose" className="back-link">
        <span className="back-icon" aria-hidden="true">←</span> Switch
      </Link>

      <div className="my-hero">
        <div className="my-hero-content">
          <div className="dash-hero-eyebrow">My Memberships</div>
          <h1 className="dash-hero-title">Hi {firstName}</h1>
          <div className="dash-hero-sub">
            {venues.length
              ? `${venues.length} venue${venues.length !== 1 ? "s" : ""} linked to your number`
              : "No memberships linked yet"}
          </div>
        </div>
      </div>

      {venues.length === 0 ? (
        <div className="empty">
          No memberships linked to your phone number. When a venue adds you, it'll appear here.
        </div>
      ) : (
        <div className="my-cards">
          {venues.map((g) => {
            // Best status to show on the card
            const cardSub = (g.regular?.status === "active" ? g.regular : null)
              || (g.pt?.status === "active" ? g.pt : null)
              || g.regular || g.pt;

            return (
              <div
                key={g.venue._id}
                className="my-venue-card"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelected(g.venue._id.toString());
                  setActiveTab(g.regular ? "regular" : "pt");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelected(g.venue._id.toString());
                    setActiveTab(g.regular ? "regular" : "pt");
                  }
                }}
              >
                {/* Left accent bar colored by type */}
                <div className="mvc-accent" />

                {/* Venue icon */}
                <span className="mvc-ic">
                  <CategoryIcon type={g.venue?.type || "Other"} />
                </span>

                {/* Name + type */}
                <div className="mvc-info">
                  <span className="mvc-name">{g.venue?.name || "Venue"}</span>
                  <span className="mvc-type">{g.venue?.type || ""}</span>
                </div>

                {/* Status badge */}
                <StatusBadge status={cardSub?.status} />

                {/* Scan button */}
                {g.venue?._id && (
                  <button
                    type="button"
                    className="my-card-scan-ic"
                    onClick={(e) => { e.stopPropagation(); setScanVenue(g.venue); }}
                    aria-label={`Scan at ${g.venue?.name}`}
                    title="Scan to check in"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
                      <path d="M3 12h18"/>
                    </svg>
                  </button>
                )}

                {/* Chevron */}
                <svg className="mvc-chevron" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            );
          })}
        </div>
      )}

      {scanVenue && (
        <Suspense fallback={null}>
          <ScanCheckIn
            expectedVenueId={scanVenue._id}
            venueName={scanVenue.name}
            onClose={() => setScanVenue(null)}
            onSuccess={loadMemberships}
          />
        </Suspense>
      )}
    </>
  );
}
