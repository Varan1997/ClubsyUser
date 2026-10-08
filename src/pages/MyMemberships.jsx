import { useEffect, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import CategoryIcon from "../components/CategoryIcon.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatDate } from "../utils/format.js";

const ScanCheckIn = lazy(() => import("../components/ScanCheckIn.jsx"));
const AttendanceCalendar = lazy(() => import("../components/AttendanceCalendar.jsx"));

// Days-remaining progress bar (0–100%)
function DaysBar({ daysLeft, planDays }) {
  const pct = planDays > 0 ? Math.max(0, Math.min(100, Math.round((daysLeft / planDays) * 100))) : 0;
  const color = pct > 40 ? "#22c55e" : pct > 15 ? "#f59e0b" : "#ef4444";
  return (
    <div className="mcard-bar">
      <div className="mcard-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// Single membership card
function MemberCard({ m, onSelect, onScan }) {
  return (
    <div
      className={`my-card ${m.memberType === "pt" ? "my-card-pt" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(m)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(m); }}
    >
      <span className="my-card-ic">
        <CategoryIcon type={m.venue?.type || "Other"} />
      </span>
      <div className="my-card-body">
        <div className="my-card-top">
          <h3>{m.venue?.name || "Venue"}</h3>
          <div className="my-card-top-right">
            <StatusBadge status={m.status} />
            {m.venue?._id && (
              <button
                type="button"
                className="my-card-scan-ic"
                onClick={(e) => { e.stopPropagation(); onScan(m.venue); }}
                title={`Scan to check in at ${m.venue?.name || "venue"}`}
                aria-label="Scan to check in"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
                  <path d="M3 12h18"/>
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="my-card-meta">
          {m.venue?.type}{m.venue?.location ? ` · ${m.venue.location}` : ""}
        </div>
        <div className="mcard-details">
          <div className="mcard-detail"><span>Plan</span><b>{m.planDays}d</b></div>
          {m.price != null && <div className="mcard-detail"><span>Price</span><b>₹{m.price}</b></div>}
          <div className="mcard-detail"><span>Joined</span><b>{formatDate(m.joinDate)}</b></div>
          <div className="mcard-detail"><span>Expires</span><b>{formatDate(m.expiryDate)}</b></div>
        </div>
        <DaysBar daysLeft={m.daysLeft} planDays={m.planDays} />
        <div className="my-card-foot">
          <span className="my-card-exp">
            {m.daysLeft < 0 ? `Expired ${Math.abs(m.daysLeft)}d ago` : `${m.daysLeft}d left`}
          </span>
          {m.venue?.upiId && (
            <span className="mcard-upi" title={`Pay: ${m.venue.upiId}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M2.5 10h19M6 14h4"/>
              </svg>
              {m.venue.upiId}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Subscription tile — clicking navigates to that membership's full detail
function SubTile({ label, type, sub, icon, onSelect }) {
  const isPt = type === "pt";
  const pct = sub && sub.planDays > 0
    ? Math.max(0, Math.min(100, Math.round((sub.daysLeft / sub.planDays) * 100)))
    : 0;
  const barColor = pct > 40 ? "#22c55e" : pct > 15 ? "#f59e0b" : "#ef4444";

  return (
    <div
      className={`sub-tile ${isPt ? "sub-tile-pt" : "sub-tile-regular"}`}
      role={sub ? "button" : undefined}
      tabIndex={sub ? 0 : undefined}
      onClick={() => sub && onSelect(sub)}
      onKeyDown={(e) => { if (sub && (e.key === "Enter" || e.key === " ")) onSelect(sub); }}
      style={!sub ? { opacity: 0.45 } : { cursor: "pointer" }}
    >
      <div className="sub-tile-header" style={{ pointerEvents: "none" }}>
        <span className="sub-tile-icon">{icon}</span>
        <div className="sub-tile-title-block">
          <span className="sub-tile-name">{label}</span>
          {sub ? (
            <span className="sub-tile-days" style={{ color: sub.daysLeft < 0 ? "var(--red)" : sub.daysLeft <= 7 ? "var(--amber)" : "var(--green)" }}>
              {sub.daysLeft < 0 ? `Expired ${Math.abs(sub.daysLeft)}d ago` : `${sub.daysLeft}d left`}
            </span>
          ) : (
            <span className="sub-tile-days" style={{ color: "var(--muted)" }}>Not subscribed</span>
          )}
        </div>
        {sub && <StatusBadge status={sub.status} />}
        {sub && (
          <span className="sub-tile-chevron" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        )}
      </div>

      {sub && (
        <>
          <div className="sub-tile-bar">
            <div className="sub-tile-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
          </div>
          <div className="sub-tile-chips">
            {sub.price != null && (
              <span className="sub-chip sub-chip-cost">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                ₹{sub.price}
              </span>
            )}
            <span className="sub-chip sub-chip-date">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              {formatDate(sub.joinDate)}
            </span>
            <span className="sub-chip-arrow" aria-hidden="true">→</span>
            <span className={`sub-chip sub-chip-date ${sub.daysLeft < 0 ? "sub-chip-expired" : sub.daysLeft <= 7 ? "sub-chip-warn" : ""}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              {formatDate(sub.expiryDate)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// Tabs component for subscription detail view
function DetailTabs({ activeTab, setActiveTab }) {
  return (
    <div className="myd-tabs">
      <button
        type="button"
        className={`myd-tab ${activeTab === "sub" ? "active" : ""}`}
        onClick={() => setActiveTab("sub")}
      >
        Subscription
      </button>
      <button
        type="button"
        className={`myd-tab ${activeTab === "att" ? "active" : ""}`}
        onClick={() => setActiveTab("att")}
      >
        Attendance
      </button>
    </div>
  );
}

export default function MyMemberships() {
  const { owner } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);   // venue-level view (from list)
  const [subSelected, setSubSelected] = useState(null); // single-sub detail (from tile click)
  const [scanVenue, setScanVenue] = useState(null);
  const [activeTab, setActiveTab] = useState("sub");

  function loadMemberships() {
    api.get("/my/memberships").then((res) => setList(res.data.memberships)).catch(() => {});
  }

  useEffect(() => {
    api.get("/my/memberships")
      .then((res) => setList(res.data.memberships))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleSelect(m) {
    setSelected(m);
    setSubSelected(null); // will be resolved to regularSub/ptSub inside detail view
    setActiveTab("sub");
  }

  if (loading) return <div className="loading">Loading…</div>;

  const firstName = owner?.name?.split(" ")[0] || "there";

  // ── Sub-detail view (tile click → single membership full detail) ─────────
  if (subSelected) {
    const s = subSelected;
    const isPt = s.memberType === "pt";
    const pct = s.planDays > 0
      ? Math.max(0, Math.min(100, Math.round((s.daysLeft / s.planDays) * 100)))
      : 0;
    const barColor = pct > 40 ? "#22c55e" : pct > 15 ? "#f59e0b" : "#ef4444";

    return (
      <>
        <button type="button" className="back-link" onClick={() => setSubSelected(null)}>
          <span className="back-icon" aria-hidden="true">←</span> {s.venue?.name || "Back"}
        </button>

        <div className="myd-head">
          <span className="myd-ic"><CategoryIcon type={s.venue?.type || "Other"} /></span>
          <div>
            <h2>
              {isPt ? "Personal Training" : "Regular Membership"}
              {isPt
                ? <span className="badge-pt" style={{ marginLeft: 8 }}>PT</span>
                : <span className="badge-regular" style={{ marginLeft: 8 }}>Regular</span>}
            </h2>
            <div className="myd-type">
              {s.venue?.name}{s.venue?.location ? ` · ${s.venue.location}` : ""}
            </div>
          </div>
        </div>

        <div className="myd-status">
          <StatusBadge status={s.status} />
          <span className="myd-days">
            {s.daysLeft < 0 ? `Expired ${Math.abs(s.daysLeft)} days ago` : `${s.daysLeft} days remaining`}
          </span>
        </div>

        <div className="myd-progress">
          <div className="myd-progress-fill" style={{ width: `${pct}%`, background: barColor }} />
        </div>
        <div className="myd-progress-label">{pct}% of plan remaining</div>

        <div className="myd-rows" style={{ marginTop: 16 }}>
          <div className="myd-row"><span>Member name</span><strong>{s.name}</strong></div>
          <div className="myd-row"><span>Plan duration</span><strong>{s.planDays} days</strong></div>
          {s.price != null && <div className="myd-row"><span>Plan price</span><strong>₹{s.price}</strong></div>}
          <div className="myd-row"><span>Start date</span><strong>{formatDate(s.joinDate)}</strong></div>
          <div className="myd-row"><span>Expiry date</span><strong>{formatDate(s.expiryDate)}</strong></div>
          <div className="myd-row">
            <span>Days left</span>
            <strong style={{ color: s.daysLeft < 0 ? "var(--red)" : s.daysLeft <= 7 ? "var(--amber)" : "var(--green)" }}>
              {s.daysLeft < 0 ? `Expired ${Math.abs(s.daysLeft)}d ago` : `${s.daysLeft} days`}
            </strong>
          </div>
          <div className="myd-row"><span>% remaining</span><strong>{pct}%</strong></div>
          {s.venue?.upiId && (
            <div className="myd-row"><span>Pay to (UPI)</span><strong className="myd-upi">{s.venue.upiId}</strong></div>
          )}
        </div>
      </>
    );
  }

  // ── Detail view ──────────────────────────────────────────────────────────
  if (selected) {
    // Find both membership types for this venue from the full list
    // Use toString() to safely compare ObjectId strings
    const venueId = selected.venue?._id?.toString();
    const regularSub = list.find((x) => x.venue?._id?.toString() === venueId && (x.memberType === "regular" || !x.memberType)) || null;
    const ptSub      = list.find((x) => x.venue?._id?.toString() === venueId && x.memberType === "pt") || null;

    // DEV: log to help diagnose lookup issues
    if (process.env.NODE_ENV !== "production") {
      console.log("[SubTiles] venueId:", venueId);
      console.log("[SubTiles] list venues:", list.map(x => ({ id: x.venue?._id?.toString(), type: x.memberType })));
      console.log("[SubTiles] regularSub:", regularSub?._id, "ptSub:", ptSub?._id);
    }

    // Header: pick the most active subscription for status/progress display
    const headerSub = regularSub && ptSub
      ? (regularSub.status === "active" || ptSub.status !== "active" ? regularSub : ptSub)
      : (regularSub || ptSub || selected);
    const pctLeft = headerSub.planDays > 0
      ? Math.max(0, Math.min(100, Math.round((headerSub.daysLeft / headerSub.planDays) * 100)))
      : 0;
    const barColor = pctLeft > 40 ? "#22c55e" : pctLeft > 15 ? "#f59e0b" : "#ef4444";

    return (
      <>
        <button type="button" className="back-link" onClick={() => setSelected(null)}>
          <span className="back-icon" aria-hidden="true">←</span> My memberships
        </button>

        {/* Venue header — show both badges if user has both types */}
        <div className="myd-head">
          <span className="myd-ic"><CategoryIcon type={selected.venue?.type || "Other"} /></span>
          <div>
            <h2>
              {selected.venue?.name || "Venue"}
              {regularSub && <span className="badge-regular" style={{ marginLeft: 8 }}>Regular</span>}
              {ptSub && <span className="badge-pt" style={{ marginLeft: 6 }}>PT</span>}
            </h2>
            <div className="myd-type">
              {selected.venue?.type}
              {selected.venue?.location ? ` · ${selected.venue.location}` : ""}
            </div>
          </div>
        </div>

        {/* Status + scan */}
        <div className="myd-status">
          <StatusBadge status={headerSub.status} />
          <span className="myd-days">
            {headerSub.daysLeft < 0
              ? `Expired ${Math.abs(headerSub.daysLeft)} days ago`
              : `${headerSub.daysLeft} days remaining`}
          </span>
          {selected.venue?._id && (
            <button
              type="button"
              className="my-card-scan-ic myd-scan-ic"
              onClick={() => setScanVenue(selected.venue)}
              title={`Scan to check in at ${selected.venue?.name || "venue"}`}
              aria-label="Scan to check in"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                <path d="M3 12h18" />
              </svg>
            </button>
          )}
        </div>

        {/* Days progress bar */}
        <div className="myd-progress">
          <div className="myd-progress-fill" style={{ width: `${pctLeft}%`, background: barColor }} />
        </div>
        <div className="myd-progress-label">{pctLeft}% of plan remaining</div>

        {/* Subscription tab switcher — show only the selected type */}
        <div className="myd-sub-tabs">
          {regularSub && (
            <button
              type="button"
              className={`myd-sub-tab ${(!subSelected || subSelected?.memberType !== "pt") ? "active" : ""}`}
              onClick={() => setSubSelected(regularSub)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>
              </svg>
              Regular
            </button>
          )}
          {ptSub && (
            <button
              type="button"
              className={`myd-sub-tab ${subSelected?.memberType === "pt" ? "active" : ""}`}
              onClick={() => setSubSelected(ptSub)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 4v16M18 4v16M6 12h12"/>
                <circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/>
                <circle cx="6" cy="20" r="2"/><circle cx="18" cy="20" r="2"/>
              </svg>
              Personal Training
            </button>
          )}
          {/* sliding indicator */}
          {regularSub && ptSub && (
            <div
              className="myd-sub-tab-indicator"
              style={{ transform: `translateX(${subSelected?.memberType === "pt" ? "100%" : "0%"})` }}
            />
          )}
        </div>

        {/* Show only the active subscription tile */}
        <div className="myd-sub-groups">
          {(() => {
            const activeSub = subSelected?.memberType === "pt" ? ptSub : (regularSub || ptSub);
            const isPt = activeSub?.memberType === "pt";
            return activeSub ? (
              <SubTile
                label={isPt ? "Personal Training" : "Regular Membership"}
                type={activeSub.memberType || "regular"}
                sub={activeSub}
                onSelect={(s) => setSubSelected(s)}
                icon={isPt ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4v16M18 4v16M6 12h12"/>
                    <circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/>
                    <circle cx="6" cy="20" r="2"/><circle cx="18" cy="20" r="2"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>
                  </svg>
                )}
              />
            ) : null;
          })()}
        </div>

        {/* Attendance calendar — always visible below */}
        <div className="myd-att-section">
          <div className="myd-att-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            Attendance
          </div>
          <Suspense fallback={<div className="loading">Loading…</div>}>
            <AttendanceCalendar memberId={selected._id} />
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

  // ── List view ─────────────────────────────────────────────────────────────
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
            {list.length
              ? `${list.length} membership${list.length > 1 ? "s" : ""} linked to your number`
              : "No memberships linked to your number yet"}
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          No memberships are linked to your phone number. When a venue adds you as a member, it'll appear here.
        </div>
      ) : (
        <>
          {/* Regular subscriptions */}
          {list.filter((m) => (m.memberType || "regular") === "regular").length > 0 && (
            <>
              <div className="my-section-head">
                <span className="my-section-icon regular">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>
                  </svg>
                </span>
                <h2>Regular</h2>
                <span className="my-section-count">{list.filter((m) => (m.memberType || "regular") === "regular").length}</span>
              </div>
              <div className="my-cards">
                {list.filter((m) => (m.memberType || "regular") === "regular").map((m) => (
                  <MemberCard key={m._id} m={m} onSelect={handleSelect} onScan={setScanVenue} />
                ))}
              </div>
            </>
          )}

          {/* PT subscriptions */}
          {list.filter((m) => m.memberType === "pt").length > 0 && (
            <>
              <div className="my-section-head pt">
                <span className="my-section-icon pt">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4v16M18 4v16M6 12h12"/>
                    <circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/>
                    <circle cx="6" cy="20" r="2"/><circle cx="18" cy="20" r="2"/>
                  </svg>
                </span>
                <h2>Personal Training</h2>
                <span className="my-section-count pt">{list.filter((m) => m.memberType === "pt").length}</span>
              </div>
              <div className="my-cards">
                {list.filter((m) => m.memberType === "pt").map((m) => (
                  <MemberCard key={m._id} m={m} onSelect={handleSelect} onScan={setScanVenue} />
                ))}
              </div>
            </>
          )}
        </>
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
