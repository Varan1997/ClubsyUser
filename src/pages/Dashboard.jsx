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

  const [qrVenue, setQrVenue] = useState(null);

  const [upiTarget, setUpiTarget] = useState(null);
  const [upiStep, setUpiStep] = useState("enter");
  const [upiValue, setUpiValue] = useState("");
  const [upiOtp, setUpiOtp] = useState("");
  const [upiInfo, setUpiInfo] = useState("");
  const [upiError, setUpiError] = useState("");
  const [upiBusy, setUpiBusy] = useState(false);

  useEffect(() => {
    // Remember this user came in as owner — used for session restore on reopen
    localStorage.setItem("lastRole", "owner");
    api
      .get("/centers")
      .then((res) => setCenters(res.data.centers))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const [todayAttendance, setTodayAttendance] = useState(null);

  // Fetch today's attendance count across all venues once centers are loaded
  useEffect(() => {
    if (centers.length === 0) return;
    const today = new Date();
    const off = today.getTimezoneOffset();
    const day = new Date(today.getTime() - off * 60000).toISOString().slice(0, 10);
    Promise.all(
      centers.map((c) =>
        api
          .get(`/centers/${c._id}/attendance`, { params: { day } })
          .then((r) => r.data.count)
          .catch(() => 0)
      )
    ).then((counts) => setTodayAttendance(counts.reduce((a, b) => a + b, 0)));
  }, [centers]);

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  function refreshAttendance() {
    if (centers.length === 0) return;
    const today = new Date();
    const off = today.getTimezoneOffset();
    const day = new Date(today.getTime() - off * 60000).toISOString().slice(0, 10);
    Promise.all(
      centers.map((c) =>
        api
          .get(`/centers/${c._id}/attendance`, { params: { day } })
          .then((r) => r.data.count)
          .catch(() => 0)
      )
    ).then((counts) => setTodayAttendance(counts.reduce((a, b) => a + b, 0)));
  }  if (loading) return <div className="loading">Loading…</div>;

  const totals = centers.reduce(
    (acc, c) => {
      acc.total += c.summary.total;
      acc.active += c.summary.active;
      acc.expiring += c.summary.expiring;
      acc.expired += c.summary.expired;
      acc.pt += c.summary.pt || 0;
      return acc;
    },
    { total: 0, active: 0, expiring: 0, expired: 0, pt: 0 }
  );

  const headerTitle = centers.length === 1 ? centers[0].name : `${centers.length} Venues`;
  const activeRate = totals.total ? Math.round((totals.active / totals.total) * 100) : 0;

  const singleCenterId = centers.length === 1 ? centers[0]._id : null;
  const statLink = (filter) =>
    singleCenterId
      ? `/centers/${singleCenterId}${filter === "all" ? "" : `?filter=${filter}`}`
      : null;

  function handleAddMember() {
    const target = centers[0];
    if (target) navigate(`/centers/${target._id}?add=1`);
  }

  function openUpi(c) {
    setUpiTarget(c);
    setUpiStep("enter");
    setUpiValue(c.upiId || "");
    setUpiOtp("");
    setUpiInfo("");
    setUpiError("");
  }
  function closeUpi() { setUpiTarget(null); }

  async function upiSendOtp() {
    setUpiError("");
    if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiValue.trim())) {
      setUpiError("Enter a valid UPI ID (e.g. name@okbank).");
      return;
    }
    setUpiBusy(true);
    try {
      const res = await api.post("/auth/my-otp");
      setUpiInfo(res.data.devOtp ? `Dev OTP: ${res.data.devOtp}` : "OTP sent to your phone");
      setUpiStep("otp");
    } catch (err) {
      setUpiError(err.response?.data?.message || "Could not send OTP");
    } finally { setUpiBusy(false); }
  }

  async function upiConfirm(e) {
    e.preventDefault();
    setUpiError("");
    setUpiBusy(true);
    try {
      await api.put(`/centers/${upiTarget._id}/upi`, { upiId: upiValue.trim(), otp: upiOtp.trim() });
      toast.success(`UPI ID saved for ${upiTarget.name}`);
      setUpiTarget(null);
      const res = await api.get("/centers");
      setCenters(res.data.centers);
    } catch (err) {
      setUpiError(err.response?.data?.message || "Could not verify OTP");
    } finally { setUpiBusy(false); }
  }

  return (
    <>
      {/* ── Hero ── */}
      <div className="dash-hero">
        {/* Floating orbs */}
        <div className="dh-orb dh-orb-1" />
        <div className="dh-orb dh-orb-2" />
        <div className="dh-orb dh-orb-3" />

        <div className="dash-hero-content">
          <div className="dash-hero-eyebrow">
            <span className="dh-dot" />
            Owner Dashboard
          </div>
          <h1 className="dash-hero-title">{headerTitle}</h1>
          <div className="dash-hero-sub">
            <span className="dh-stat">{totals.total}</span> members
            <span className="dh-sep">·</span>
            <span className="dh-stat dh-stat-green">{activeRate}%</span> active
          </div>
        </div>

        <div className="dh-actions">
          <button className="dh-fab" onClick={handleAddMember} title="Add member" aria-label="Add member">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
              <path d="M12 14v7M9 17h6" />
            </svg>
            <span>Add Member</span>
          </button>
          <button className="dh-fab secondary" onClick={() => setShowAddModal(true)} title="Add venue" aria-label="Add venue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Stat row ── */}
      <div className="stat-cards">
        <StatCard variant="total"      value={totals.total}                      label="Total"     sublabel="Members"   to={statLink("all")}      icon={<><path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></>} />
        <StatCard variant="active"     value={totals.active}                     label="Active"    sublabel="Members"   to={statLink("active")}   icon={<path d="M20 6L9 17l-5-5"/>} />
        <StatCard variant="expiring"   value={totals.expiring}                   label="Expiring"  sublabel="Soon"      to={statLink("expiring")} icon={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>} />
        <StatCard variant="expired"    value={totals.expired}                    label="Expired"   sublabel="Members"   to={statLink("expired")}  icon={<><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></>} />
        <StatCard variant="attendance" value={todayAttendance ?? "…"}            label="Today"     sublabel="Check-ins" onClick={() => navigate("/attendance/mark")}     icon={<><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/><path d="M9 14l2 2 4-4"/></>} />
        <StatCard variant="pt"         value={totals.pt}                         label="Personal"  sublabel="Training"  to={statLink("pt")}       icon={<><path d="M6 4v16M18 4v16M6 12h12"/><circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="6" cy="20" r="2"/><circle cx="18" cy="20" r="2"/></>} />
      </div>

      {/* ── Venues section ── */}
      <div className="dash-section-head">
        <h2 className="section-title">Your Venues</h2>
        <span className="section-count">{centers.length} venue{centers.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="dash-centers">
        {centers.map((c, i) => (
          <VenueCard
            key={c._id}
            center={c}
            index={i}
            onNavigate={navigate}
            onUpi={() => openUpi(c)}
            onQr={() => setQrVenue(c)}
          />
        ))}
      </div>

      {/* ── Bottom nav ── */}
      <div className="dash-actions">
        <button className="btn secondary" onClick={() => {
          localStorage.removeItem("lastRole");
          navigate("/choose", { state: { from: "back" } });
        }}>
          ← Back
        </button>
        <button className="btn" onClick={() => setShowAddModal(true)}>
          + Add Venue
        </button>
      </div>

      {/* Modals */}
      {qrVenue && <QrModal venue={qrVenue} onClose={() => setQrVenue(null)} />}

      {upiTarget && (
        <Modal title={upiStep === "enter" ? "Payment UPI ID" : "Verify to save"} onClose={closeUpi}>
          {upiStep === "enter" ? (
            <form className="form" onSubmit={(e) => { e.preventDefault(); upiSendOtp(); }}>
              {upiError && <div className="error">{upiError}</div>}
              {upiTarget.upiId
                ? <div className="upi-current"><span className="upi-current-label">Current UPI ID</span><span className="upi-current-value">{upiTarget.upiId}</span></div>
                : <p style={{ color: "var(--muted)", margin: "0 0 4px", lineHeight: 1.5 }}>No UPI ID set yet for <strong style={{ color: "var(--text)" }}>{upiTarget.name}</strong>.</p>}
              <div className="field">
                <label>{upiTarget.upiId ? "Update UPI ID" : "UPI ID"}</label>
                <input value={upiValue} onChange={(e) => setUpiValue(e.target.value)} placeholder="e.g. boldgym@okicici" autoFocus />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={closeUpi}>Cancel</button>
                <button className="btn" type="submit" disabled={upiBusy || !upiValue.trim()}>{upiBusy ? "Sending…" : "Continue"}</button>
              </div>
            </form>
          ) : (
            <form className="form" onSubmit={upiConfirm}>
              {upiError && <div className="error">{upiError}</div>}
              {upiInfo && !upiError && <div className="info-note">{upiInfo}</div>}
              <div className="field">
                <label>Enter OTP to confirm</label>
                <input inputMode="numeric" value={upiOtp} onChange={(e) => setUpiOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" maxLength={6} autoFocus />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setUpiStep("enter")} disabled={upiBusy}>Back</button>
                <button className="btn" type="submit" disabled={upiBusy || upiOtp.length < 4}>{upiBusy ? "Saving…" : "Verify & Save"}</button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {showAddModal && (
        <Modal title="Add a venue?" onClose={() => setShowAddModal(false)}>
          <p style={{ color: "var(--muted)", margin: "0 0 4px", lineHeight: 1.5 }}>
            Add a new venue (gym, yoga, swimming, tuition or sports) to your account?
          </p>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button className="btn" onClick={() => navigate("/centers/add")}>Yes, add venue</button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Venue card ──────────────────────────────────────────────────────────────
function VenueCard({ center: c, index, onNavigate, onUpi, onQr }) {
  const activeRate = c.summary.total
    ? Math.round((c.summary.active / c.summary.total) * 100)
    : 0;

  const typeColor = {
    Gym: "#c9a227", Yoga: "#a78bfa", Swimming: "#38bdf8",
    Tuition: "#34d399", Sports: "#fb923c", Other: "#94a3b8",
  };
  const accent = typeColor[c.type] || typeColor.Other;

  return (
    <Link
      to={`/centers/${c._id}`}
      className="vcard"
      style={{ animationDelay: `${index * 0.07}s`, "--accent-clr": accent }}
    >
      <div className="vcard-accent" />
      <div className="vcard-inner">
        <div className="vcard-top">
          <div className="vcard-ic"><CategoryIcon type={c.type} /></div>
          <div className="vcard-info">
            <h3 className="vcard-name">{c.name}</h3>
            <span className="vcard-type">{c.type}{c.location ? ` · ${c.location}` : ""}</span>
          </div>
          <div className="vcard-total">
            <span className="vcard-total-num">{c.summary.total}</span>
            <span className="vcard-total-lbl">members</span>
          </div>
        </div>

        <div className="vcard-bar">
          <div className="vcard-bar-fill" style={{ width: `${activeRate}%` }} />
        </div>
        <div className="vcard-bar-label">{activeRate}% active</div>

        <div className="vcard-chips">
          <span className="vchip active"><b>{c.summary.active}</b> Active</span>
          <span className="vchip expiring"><b>{c.summary.expiring}</b> Expiring</span>
          <span className="vchip expired"><b>{c.summary.expired}</b> Expired</span>
          {c.summary.pt > 0 && <span className="vchip pt"><b>{c.summary.pt}</b> PT</span>}
        </div>

        <div className="vcard-actions" onClick={(e) => e.preventDefault()}>
          <button className="vca-btn" onClick={(e) => { e.preventDefault(); onNavigate(`/centers/${c._id}/plans`); }} title="Plans">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            Plans
          </button>
          <button className={`vca-btn ${c.upiId ? "on" : ""}`} onClick={(e) => { e.preventDefault(); onUpi(); }} title={c.upiId ? `UPI: ${c.upiId}` : "Set UPI"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M2.5 10h19M6 14h4"/></svg>
            UPI
          </button>
          <button className="vca-btn" onClick={(e) => { e.preventDefault(); onQr(); }} title="QR">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M20 14v.01M14 20h.01M20 20v-3h-3"/></svg>
            QR
          </button>
          <button className="vca-btn" onClick={(e) => { e.preventDefault(); onNavigate(`/centers/${c._id}/posts`); }} title="Posts">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Posts
          </button>
        </div>
      </div>
    </Link>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ variant, value, label, sublabel, icon, to, onClick }) {
  const inner = (
    <>
      <div className="sc-shine" />
      <span className="sc-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </span>
      <div className="sc-body">
        <div className="sc-num">{value}</div>
        <span className="sc-label">{label}</span>
        <span className="sc-sub">{sublabel}</span>
      </div>
      {(to || onClick) && <span className="sc-arrow">→</span>}
    </>
  );

  if (to) return <Link to={to} className={`stat-card ${variant} clickable`}>{inner}</Link>;
  if (onClick) return <button type="button" className={`stat-card ${variant} clickable`} onClick={onClick}>{inner}</button>;
  return <div className={`stat-card ${variant}`}>{inner}</div>;
}
