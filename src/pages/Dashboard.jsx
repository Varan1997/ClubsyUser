import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import Modal from "../components/Modal.jsx";
import CategoryIcon from "../components/CategoryIcon.jsx";
import QrModal from "../components/QrModal.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // QR modal
  const [qrVenue, setQrVenue] = useState(null);

  // UPI flow (enter -> OTP -> save)
  const [upiTarget, setUpiTarget] = useState(null); // venue being edited
  const [upiStep, setUpiStep] = useState("enter"); // "enter" | "otp"
  const [upiValue, setUpiValue] = useState("");
  const [upiOtp, setUpiOtp] = useState("");
  const [upiInfo, setUpiInfo] = useState("");
  const [upiError, setUpiError] = useState("");
  const [upiBusy, setUpiBusy] = useState(false);

  useEffect(() => {
    api
      .get("/centers")
      .then((res) => setCenters(res.data.centers))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading…</div>;

  const totals = centers.reduce(
    (acc, c) => {
      acc.total += c.summary.total;
      acc.active += c.summary.active;
      acc.expiring += c.summary.expiring;
      acc.expired += c.summary.expired;
      return acc;
    },
    { total: 0, active: 0, expiring: 0, expired: 0 }
  );

  const headerTitle = centers.length === 1 ? centers[0].name : `${centers.length} Venues`;
  const activeRate = totals.total ? Math.round((totals.active / totals.total) * 100) : 0;

  // Stat cards link into the (single) centre's members list with a filter.
  const singleCenterId = centers.length === 1 ? centers[0]._id : null;
  const statLink = (filter) =>
    singleCenterId
      ? `/centers/${singleCenterId}${filter === "all" ? "" : `?filter=${filter}`}`
      : null;

  // "+" in the hero -> add a member. Go to the centre's page with the
  // add-member form open. (Uses the first centre when there are several.)
  function handleAddMember() {
    const target = centers[0];
    if (target) navigate(`/centers/${target._id}?add=1`);
  }

  // UPI: open modal for a venue
  function openUpi(c) {
    setUpiTarget(c);
    setUpiStep("enter");
    setUpiValue(c.upiId || "");
    setUpiOtp("");
    setUpiInfo("");
    setUpiError("");
  }
  function closeUpi() {
    setUpiTarget(null);
  }
  // Validate UPI -> send OTP -> OTP step
  async function upiSendOtp() {
    setUpiError("");
    if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiValue.trim())) {
      setUpiError("Enter a valid UPI ID (e.g. name@okbank).");
      return;
    }
    setUpiBusy(true);
    try {
      const res = await api.post("/auth/my-otp");
      setUpiInfo(
        res.data.devOtp ? `Dev mode — your OTP is ${res.data.devOtp}` : "OTP sent to your phone"
      );
      setUpiStep("otp");
    } catch (err) {
      setUpiError(err.response?.data?.message || "Could not send OTP");
    } finally {
      setUpiBusy(false);
    }
  }
  // Verify OTP -> save UPI
  async function upiConfirm(e) {
    e.preventDefault();
    setUpiError("");
    setUpiBusy(true);
    try {
      await api.put(`/centers/${upiTarget._id}/upi`, {
        upiId: upiValue.trim(),
        otp: upiOtp.trim(),
      });
      toast.success(`UPI ID saved for ${upiTarget.name}`);
      setUpiTarget(null);
      // Refresh so the saved UPI reflects in state.
      const res = await api.get("/centers");
      setCenters(res.data.centers);
    } catch (err) {
      setUpiError(err.response?.data?.message || "Could not verify OTP");
    } finally {
      setUpiBusy(false);
    }
  }

  return (
    <>
      {/* Hero banner */}
      <div className="dash-hero">
        <div className="dash-hero-content">
          <div className="dash-hero-eyebrow">Dashboard</div>
          <h1 className="dash-hero-title">{headerTitle}</h1>
          <div className="dash-hero-sub">
            {totals.total} members · {activeRate}% active
          </div>
        </div>
        <button
          className="icon-btn hero-add"
          onClick={handleAddMember}
          aria-label="Add member"
          title="Add member"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Premium gradient stat cards */}
      <div className="stat-cards">
        <StatCard
          variant="total"
          value={totals.total}
          label="Total Members"
          to={statLink("all")}
          icon={
            <>
              <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
              <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
            </>
          }
        />
        <StatCard
          variant="active"
          value={totals.active}
          label="Active"
          to={statLink("active")}
          icon={<path d="M20 6L9 17l-5-5" />}
        />
        <StatCard
          variant="expiring"
          value={totals.expiring}
          label="Expiring Soon"
          to={statLink("expiring")}
          icon={
            <>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </>
          }
        />
        <StatCard
          variant="expired"
          value={totals.expired}
          label="Expired"
          to={statLink("expired")}
          icon={
            <>
              <circle cx="12" cy="12" r="9" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </>
          }
        />
      </div>

      {/* Centre cards */}
      <div className="dash-section-head">
        <h2 className="section-title">Your Venues</h2>
      </div>

      <div className="dash-centers">
        {centers.map((c) => (
          <Link key={c._id} to={`/centers/${c._id}`} className="dash-center-card">
            <div className="dcc-banner">
              <span className="dcc-type-pill">{c.type}</span>
              <div className="dcc-banner-right">
                <button
                  type="button"
                  className="dcc-mini-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/centers/${c._id}/plans`);
                  }}
                  title="Plan pricing"
                  aria-label="Plan pricing"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`dcc-mini-btn ${c.upiId ? "has-upi" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    openUpi(c);
                  }}
                  title={c.upiId ? `UPI: ${c.upiId}` : "Set UPI ID"}
                  aria-label="Set UPI ID"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2.5" y="6" width="19" height="12" rx="2" />
                    <path d="M2.5 10h19M6 14h4" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="dcc-mini-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    setQrVenue(c);
                  }}
                  title="Attendance QR"
                  aria-label="Attendance QR"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <path d="M14 14h3v3M20 14v.01M14 20h.01M20 20v-3h-3" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="dcc-mini-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/centers/${c._id}/attendance`);
                  }}
                  title="View attendance"
                  aria-label="View attendance"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4.5" width="18" height="16" rx="2" />
                    <path d="M3 9h18M8 2.5v4M16 2.5v4" />
                    <path d="M9 14l2 2 4-4" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="dcc-body">
              <div className="dcc-headrow">
                <span className="dcc-icon">
                  <CategoryIcon type={c.type} />
                </span>
                <div className="dcc-headtext">
                  <h3 className="dcc-name">{c.name}</h3>
                  {c.location && <div className="dcc-loc">{c.location}</div>}
                </div>
              </div>

              <div className="dcc-count">
                <span className="dcc-count-num">{c.summary.total}</span>
                <span className="dcc-count-label">total members</span>
              </div>

              <div className="dcc-bar">
                <div
                  className="dcc-bar-fill"
                  style={{
                    width: `${
                      c.summary.total
                        ? Math.round((c.summary.active / c.summary.total) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>

              <div className="dcc-chips">
                <span className="dcc-chip active">
                  <b>{c.summary.active}</b>
                  <small>Active</small>
                </span>
                <span className="dcc-chip expiring">
                  <b>{c.summary.expiring}</b>
                  <small>Expiring</small>
                </span>
                <span className="dcc-chip expired">
                  <b>{c.summary.expired}</b>
                  <small>Expired</small>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Add venue + back to the Owner / Member chooser */}
      <div className="dash-actions">
        <button className="btn secondary" onClick={() => navigate("/choose")}>
          ← Back
        </button>
        <button className="btn" onClick={() => setShowAddModal(true)}>
          + Add Venue
        </button>
      </div>

      {/* Attendance QR */}
      {qrVenue && <QrModal venue={qrVenue} onClose={() => setQrVenue(null)} />}

      {/* UPI: enter -> OTP -> save */}
      {upiTarget && (
        <Modal
          title={upiStep === "enter" ? "Payment UPI ID" : "Verify to save"}
          onClose={closeUpi}
        >
          {upiStep === "enter" ? (
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                upiSendOtp();
              }}
            >
              {upiError && <div className="error">{upiError}</div>}
              {upiTarget.upiId ? (
                <div className="upi-current">
                  <span className="upi-current-label">Current UPI ID</span>
                  <span className="upi-current-value">{upiTarget.upiId}</span>
                </div>
              ) : (
                <p style={{ color: "var(--muted)", margin: "0 0 4px", lineHeight: 1.5 }}>
                  No UPI ID set yet for{" "}
                  <strong style={{ color: "var(--text)" }}>{upiTarget.name}</strong>.
                </p>
              )}
              <div className="field">
                <label>{upiTarget.upiId ? "Update UPI ID" : "UPI ID"}</label>
                <input
                  value={upiValue}
                  onChange={(e) => setUpiValue(e.target.value)}
                  placeholder="e.g. boldgym@okicici"
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={closeUpi}>
                  Cancel
                </button>
                <button className="btn" type="submit" disabled={upiBusy || !upiValue.trim()}>
                  {upiBusy ? "Sending…" : "Continue"}
                </button>
              </div>
            </form>
          ) : (
            <form className="form" onSubmit={upiConfirm}>
              {upiError && <div className="error">{upiError}</div>}
              {upiInfo && !upiError && <div className="info-note">{upiInfo}</div>}
              <div className="field">
                <label>Enter OTP to confirm</label>
                <input
                  inputMode="numeric"
                  value={upiOtp}
                  onChange={(e) => setUpiOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setUpiStep("enter")}
                  disabled={upiBusy}
                >
                  Back
                </button>
                <button className="btn" type="submit" disabled={upiBusy || upiOtp.length < 4}>
                  {upiBusy ? "Saving…" : "Verify & Save"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Confirm: create another venue? */}
      {showAddModal && (
        <Modal title="Add a venue?" onClose={() => setShowAddModal(false)}>
          <p style={{ color: "var(--muted)", margin: "0 0 4px", lineHeight: 1.5 }}>
            Add a new venue (gym, yoga, swimming, tuition or sports) to your account?
          </p>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </button>
            <button className="btn" onClick={() => navigate("/centers/add")}>
              Yes, add venue
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function StatCard({ variant, value, label, icon, to }) {
  const inner = (
    <>
      <div className="sc-glow" />
      <span className="sc-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </span>
      <div className="sc-num">{value}</div>
      <div className="sc-label">{label}</div>
      {to && <span className="sc-arrow" aria-hidden="true">→</span>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`stat-card ${variant} clickable`}>
        {inner}
      </Link>
    );
  }
  return <div className={`stat-card ${variant}`}>{inner}</div>;
}
