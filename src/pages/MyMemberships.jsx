import { useEffect, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import CategoryIcon from "../components/CategoryIcon.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import AttendanceCalendar from "../components/AttendanceCalendar.jsx";
import { formatDate } from "../utils/format.js";

// Lazy-loaded so the QR-scanner library (html5-qrcode) is only fetched
// when a member actually opens the scanner, keeping the main bundle small.
const ScanCheckIn = lazy(() => import("../components/ScanCheckIn.jsx"));

export default function MyMemberships() {
  const { owner } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // membership detail
  const [scanVenue, setScanVenue] = useState(null); // membership being checked in

  function loadMemberships() {
    api
      .get("/my/memberships")
      .then((res) => setList(res.data.memberships))
      .catch(() => {});
  }

  useEffect(() => {
    api
      .get("/my/memberships")
      .then((res) => setList(res.data.memberships))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading…</div>;

  const firstName = owner?.name?.split(" ")[0] || "there";

  // Detail view (same page) when a membership is selected.
  if (selected) {
    return (
      <>
        <button
          type="button"
          className="back-link"
          onClick={() => setSelected(null)}
        >
          <span className="back-icon" aria-hidden="true">←</span> My memberships
        </button>

        <div className="myd-head">
          <span className="myd-ic">
            <CategoryIcon type={selected.venue?.type || "Other"} />
          </span>
          <div>
            <h2>{selected.venue?.name || "Venue"}</h2>
            <div className="myd-type">
              {selected.venue?.type}
              {selected.venue?.location ? ` · ${selected.venue.location}` : ""}
            </div>
          </div>
        </div>

        <div className="myd-status">
          <StatusBadge status={selected.status} />
          <span className="myd-days">
            {selected.daysLeft < 0
              ? `Expired ${Math.abs(selected.daysLeft)} days ago`
              : `${selected.daysLeft} days remaining`}
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

        <div className="myd-grid">
          <div className="myd-rows">
            <div className="myd-row">
              <span>Member</span>
              <strong>{selected.name}</strong>
            </div>
            <div className="myd-row">
              <span>Plan</span>
              <strong>{selected.planDays} Days</strong>
            </div>
            {selected.price != null && (
              <div className="myd-row">
                <span>Price</span>
                <strong>₹{selected.price}</strong>
              </div>
            )}
            <div className="myd-row">
              <span>Start date</span>
              <strong>{formatDate(selected.joinDate)}</strong>
            </div>
            <div className="myd-row">
              <span>Expiry date</span>
              <strong>{formatDate(selected.expiryDate)}</strong>
            </div>
            {selected.venue?.upiId && (
              <div className="myd-row">
                <span>Pay to (UPI)</span>
                <strong>{selected.venue.upiId}</strong>
              </div>
            )}
          </div>

          <div className="myd-calendar">
            <div className="myd-att-title">Attendance</div>
            <AttendanceCalendar memberId={selected._id} />
          </div>
        </div>

        {scanVenue && (
          <Suspense fallback={null}>
            <ScanCheckIn
              expectedVenueId={scanVenue._id}
              venueName={scanVenue.name}
              onClose={() => setScanVenue(null)}
              onSuccess={() => {
                loadMemberships();
                setScanVenue(null);
              }}
            />
          </Suspense>
        )}
      </>
    );
  }

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
              ? `You have ${list.length} membership${list.length > 1 ? "s" : ""}`
              : "No memberships linked to your number yet"}
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          No memberships are linked to your phone number. When a venue adds you as a
          member, it'll appear here.
        </div>
      ) : (
        <div className="my-cards">
          {list.map((m) => (
            <div
              key={m._id}
              className="my-card"
              role="button"
              tabIndex={0}
              onClick={() => setSelected(m)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelected(m);
              }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setScanVenue(m.venue);
                        }}
                        title={`Scan to check in at ${m.venue?.name || "venue"}`}
                        aria-label="Scan to check in"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                          <path d="M3 12h18" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div className="my-card-meta">
                  {m.venue?.type}
                  {m.venue?.location ? ` · ${m.venue.location}` : ""}
                </div>
                <div className="my-card-foot">
                  <span>
                    <b>{m.planDays}</b> day plan
                  </span>
                  <span className="my-card-exp">
                    {m.daysLeft < 0
                      ? `Expired ${Math.abs(m.daysLeft)}d ago`
                      : `${m.daysLeft}d left`}
                  </span>
                </div>
              </div>
            </div>
          ))}
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
