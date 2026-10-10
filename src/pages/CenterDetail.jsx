import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../api/axios.js";
import Modal from "../components/Modal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import DatePicker from "../components/DatePicker.jsx";
import CategoryIcon from "../components/CategoryIcon.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatDate, toInputDate } from "../utils/format.js";

const emptyMember = { name: "", phone: "", planDays: null, startDate: "" };

export default function CenterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [center, setCenter] = useState(null);
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyMember);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const validFilters = ["all", "active", "expiring", "expired", "pt"];
  const urlFilter = searchParams.get("filter");
  const [filter, setFilter] = useState(
    validFilters.includes(urlFilter) ? urlFilter : "all"
  );

  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");

  // Change-plan / Renew flow
  const [planTarget, setPlanTarget] = useState(null);
  const [planMode, setPlanMode] = useState("change");
  // planStep: "early-warn" | "break-ask" | "break-date" | "pick" | "confirm" | "otp"
  const [planStep, setPlanStep] = useState("pick");
  const [pickedPlan, setPickedPlan] = useState(null);
  const [planOtp, setPlanOtp] = useState("");
  const [planInfo, setPlanInfo] = useState("");
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState("");
  const [renewStartDate, setRenewStartDate] = useState(""); // "" = from expiry, date = custom start
  const renewStartDateRef = React.useRef(""); // ref mirror so confirmChangePlan always reads latest value

  function setRenewStart(v) {
    renewStartDateRef.current = v;
    setRenewStartDate(v);
  }

  // Delete flow
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteStep, setDeleteStep] = useState("confirm");
  const [deleteOtp, setDeleteOtp] = useState("");
  const [deleteInfo, setDeleteInfo] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // View member modal
  const [viewMember, setViewMember] = useState(null);

  // PT modal
  const [ptTarget, setPtTarget] = useState(null);   // member whose PT is being managed
  const [ptStep, setPtStep] = useState("pick");     // "pick" | "confirm" | "renew"
  const [ptPicked, setPtPicked] = useState(null);
  const [ptBusy, setPtBusy] = useState(false);
  const [ptError, setPtError] = useState("");
  const [ptStartDate, setPtStartDate] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/centers/${id}`);
      setCenter(res.data.center);
      setMembers(res.data.members);
      setSummary(res.data.summary);
    } catch {
      navigate("/");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    if (validFilters.includes(urlFilter)) setFilter(urlFilter);
    /* eslint-disable-next-line */
  }, [urlFilter]);

  useEffect(() => {
    if (!loading && center && searchParams.get("add") === "1") openNew();
    /* eslint-disable-next-line */
  }, [loading, center]);

  function firstPlanDays() { return center?.plans?.[0]?.days ?? null; }

  function openNew() {
    setEditing(null);
    setForm({ ...emptyMember, planDays: firstPlanDays(), startDate: toInputDate(new Date()) });
    setError("");
    setShowModal(true);
  }

  function openEdit(m) {
    const planExists = (center?.plans || []).some((p) => p.days === m.planDays);
    setEditing(m);
    setForm({
      name: m.name,
      phone: m.phone || "",
      planDays: planExists ? m.planDays : firstPlanDays(),
      startDate: toInputDate(m.joinDate),
    });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (editing) {
        await api.put(`/members/${editing._id}`, form);
      } else {
        await api.post(`/centers/${id}/members`, form);
      }
      setShowModal(false);
      toast.success(editing ? "Member updated" : `${form.name} added`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save member");
    } finally {
      setBusy(false);
    }
  }

  function openPlanPicker(m, mode) {
    setPlanTarget(m);
    setPlanMode(mode);
    setPickedPlan(null);
    setPlanError("");
    setRenewStart("");
    if (mode === "renew" && m.status === "active" && m.daysLeft > 0) {
      // Active member — warn about early renewal first
      setPlanStep("early-warn");
    } else if (mode === "renew" && m.status === "expired") {
      // Expired member — ask if they took a break
      setPlanStep("break-ask");
    } else {
      setPlanStep("pick");
    }
  }
  const openChangePlan = (m) => openPlanPicker(m, "change");
  const openRenew     = (m) => openPlanPicker(m, "renew");
  function closeChangePlan() { setPlanTarget(null); }

  function selectPlan(days) {
    setPickedPlan(days);
    setPlanStep("confirm");
  }

  async function confirmChangePlan() {
    setPlanError("");
    setPlanBusy(true);
    try {
      if (planMode === "renew") {
        const body = { planDays: pickedPlan };
        const startDate = renewStartDateRef.current; // use ref — always latest value
        if (startDate) body.startDate = startDate;
        await api.post(`/members/${planTarget._id}/renew`, body);
        toast.success(`${planTarget.name}'s membership renewed`);
        setPlanTarget(null);
        await load();
      } else {
        const res = await api.post("/auth/my-otp");
        setPlanOtp("");
        setPlanInfo(res.data.devOtp ? `Dev OTP: ${res.data.devOtp}` : "OTP sent to your phone");
        setPlanStep("otp");
      }
    } catch (err) {
      setPlanError(err.response?.data?.message || "Could not continue");
    } finally { setPlanBusy(false); }
  }

  async function confirmChangePlanOtp() {
    setPlanError("");
    setPlanBusy(true);
    try {
      await api.put(`/members/${planTarget._id}`, { planDays: pickedPlan, otp: planOtp.trim() });
      toast.success(`${planTarget.name}'s plan changed`);
      setPlanTarget(null);
      await load();
    } catch (err) {
      setPlanError(err.response?.data?.message || "Could not verify OTP");
    } finally { setPlanBusy(false); }
  }

  function handleDelete(m) {
    setDeleteTarget(m);
    setDeleteStep("confirm");
    setDeleteOtp("");
    setDeleteInfo("");
    setDeleteError("");
  }
  function closeDelete() { setDeleteTarget(null); }

  async function deleteSendOtp() {
    setDeleteError("");
    setBusy(true);
    try {
      const res = await api.post("/auth/my-otp");
      setDeleteInfo(res.data.devOtp ? `Dev OTP: ${res.data.devOtp}` : "OTP sent to your phone");
      setDeleteStep("otp");
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Could not send OTP");
    } finally { setBusy(false); }
  }

  async function deleteConfirmOtp(e) {
    e.preventDefault();
    setDeleteError("");
    setBusy(true);
    try {
      await api.delete(`/members/${deleteTarget._id}`, { data: { otp: deleteOtp.trim() } });
      toast.success(`${deleteTarget.name} removed`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Could not verify OTP");
    } finally { setBusy(false); }
  }

  // ── PT modal ──────────────────────────────────────────────────────────────
  // Open: check if a PT record already exists for this phone, show renew; else assign.
  function openPt(m) {
    // Find existing PT record for the same phone at this center
    const existingPt = members.find(
      (x) => x.phone === m.phone && x.memberType === "pt"
    );
    setPtTarget(existingPt || m);
    setPtPicked(null);
    setPtError("");
    setPtStartDate("");
    setPtStep(existingPt ? "renew" : "pick");
  }
  function closePt() { setPtTarget(null); }

  // Assign PT plan to a regular member
  async function assignPt() {
    if (!ptPicked) return;
    if (!ptStartDate) { setPtError("Please select a start date."); return; }
    setPtBusy(true);
    setPtError("");
    try {
      await api.post(`/centers/${id}/members`, {
        name: ptTarget.name,
        phone: ptTarget.phone,
        planDays: ptPicked,
        startDate: ptStartDate,
        memberType: "pt",
      });
      toast.success(`${ptTarget.name} assigned PT plan`);
      setPtTarget(null);
      await load();
    } catch (err) {
      setPtError(err.response?.data?.message || "Could not assign PT");
    } finally { setPtBusy(false); }
  }

  // Renew existing PT membership
  async function renewPt() {
    if (!ptPicked) return;
    setPtBusy(true);
    setPtError("");
    try {
      await api.post(`/members/${ptTarget._id}/renew`, { planDays: ptPicked });
      toast.success(`${ptTarget.name}'s PT renewed`);
      setPtTarget(null);
      await load();
    } catch (err) {
      setPtError(err.response?.data?.message || "Could not renew PT");
    } finally { setPtBusy(false); }
  }

  if (loading) return <div className="loading">Loading…</div>;
  if (!center) return null;

  // PT records are never shown as separate rows — they are only shown inside the View modal.
  // The "pt" filter shows regular members who have a linked PT record.
  const regularMembers = members.filter((m) => (m.memberType || "regular") === "regular");
  const ptPhones = new Set(members.filter((m) => m.memberType === "pt").map((m) => m.phone));

  const byStatus = filter === "all"
    ? regularMembers
    : filter === "pt"
    ? regularMembers.filter((m) => ptPhones.has(m.phone))
    : regularMembers.filter((m) => m.status === filter);

  const q = search.trim().toLowerCase();
  const visible = q
    ? byStatus.filter(
        (m) => m.name.toLowerCase().includes(q) || (m.phone || "").toLowerCase().includes(q)
      )
    : byStatus;

  // All visible rows are regular members — no PT split needed
  const hasBothTypes = false;

  const ptPlans = center?.ptPlans || [];

  return (
    <>
      <Link to="/" className="back-link">
        <span className="back-icon" aria-hidden="true">←</span> All venues
      </Link>

      <div className="venue-header">
        <span className="vh-icon">
          <CategoryIcon type={center.type} />
        </span>
        <div className="vh-text">
          <h1 className="vh-name">{center.name}</h1>
          <div className="vh-meta">
            <span className="vh-type">{center.type}</span>
            {center.location && <span className="vh-dot">·</span>}
            {center.location && <span>{center.location}</span>}
            {center.capacity ? (
              <><span className="vh-dot">·</span><span>Capacity {center.capacity}</span></>
            ) : null}
          </div>
        </div>
        <button className="btn hide-mobile vh-add" onClick={openNew}>
          + Add Member
        </button>
      </div>

      {members.length > 0 && (
        <div className="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone"
          />
          {search && (
            <button type="button" className="search-clear" onClick={() => setSearch("")} aria-label="Clear search">✕</button>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="empty">
          {members.length === 0
            ? "No members yet. Click Add Member to add the first one."
            : q
            ? `No members match "${search}".`
            : "No members in this list."}
        </div>
      ) : (
        <>
          {/* All members shown in one flat list — PT records never appear as rows */}
          {[{ rows: visible, label: "All", showLabel: false }].map(({ rows, label, showLabel }) => rows.length === 0 ? null : (
            <div key={label} className={hasBothTypes ? "member-section" : ""}>
              {showLabel && (
                <div className={`my-section-head ${label === "Personal Training" ? "pt" : ""}`} style={{ marginTop: label === "Personal Training" ? 24 : 0 }}>
                  <span className={`my-section-icon ${label === "Personal Training" ? "pt" : "regular"}`}>
                    {label === "Personal Training" ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 4v16M18 4v16M6 12h12"/>
                        <circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/>
                        <circle cx="6" cy="20" r="2"/><circle cx="18" cy="20" r="2"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>
                      </svg>
                    )}
                  </span>
                  <h2>{label}</h2>
                  <span className={`my-section-count ${label === "Personal Training" ? "pt" : ""}`}>{rows.length}</span>
                </div>
              )}

              {/* Desktop table */}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Join Date</th>
                      <th>Expiry Date</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => (
                      <tr key={m._id}>
                        <td>
                          {m.name}
                          {ptPhones.has(m.phone) && (
                            <span className="pt-indicator" data-tooltip="Has Personal Training" aria-label="Has Personal Training">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                                <path d="M6 4v16M18 4v16M6 12h12"/>
                                <circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/>
                                <circle cx="6" cy="20" r="2"/><circle cx="18" cy="20" r="2"/>
                              </svg>
                            </span>
                          )}
                        </td>
                        <td>{m.phone || "-"}</td>
                        <td>{formatDate(m.joinDate)}</td>
                        <td>{formatDate(m.expiryDate)}</td>
                        <td><StatusBadge status={m.status} daysLeft={m.daysLeft} /></td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="btn secondary small pt-icon-btn"
                              onClick={() => openPt(m)}
                              data-tooltip={ptPhones.has(m.phone) ? "Manage PT" : "Assign PT"}
                              aria-label="Personal Training"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M6 4v16M18 4v16M6 12h12" />
                                  <circle cx="6" cy="4" r="2" /><circle cx="18" cy="4" r="2" />
                                  <circle cx="6" cy="20" r="2" /><circle cx="18" cy="20" r="2" />
                                </svg>
                              </button>
                            <button className="btn secondary small" onClick={() => openRenew(m)} title="Renew">Renew</button>
                            <button className="btn secondary small" onClick={() => setViewMember(m)}>View</button>
                            {m.status === "active" && (
                              <>
                                <button className="btn secondary small" onClick={() => openChangePlan(m)}>Change plan</button>
                                <button className="btn secondary small" onClick={() => openEdit(m)}>Edit</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="member-cards">
                {rows.map((m) => (
                  <div
                    key={m._id}
                    className={`member-card ${expandedId === m._id ? "expanded" : ""}`}
                    data-status={m.status}
                  >
                    <div className="mc-head">
                      <div
                        className="mc-id"
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedId((cur) => (cur === m._id ? null : m._id))}
                      >
                        <div className="mc-avatar">{m.name.charAt(0).toUpperCase()}</div>
                        <div className="mc-id-text">
                          <div className="mc-name">
                            {m.name}
                            {ptPhones.has(m.phone) && (
                              <span className="pt-indicator" data-tooltip="Has Personal Training" aria-label="Has Personal Training">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                                  <path d="M6 4v16M18 4v16M6 12h12"/>
                                  <circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/>
                                  <circle cx="6" cy="20" r="2"/><circle cx="18" cy="20" r="2"/>
                                </svg>
                              </span>
                            )}
                          </div>
                          <div className="mc-phone">{m.phone || "No phone"}</div>
                        </div>
                      </div>
                      <StatusBadge status={m.status} daysLeft={m.daysLeft} />
                    </div>
                    <div className="mc-reveal">
                      <div className="mc-icons">
                        <button
                            className="mc-icon-btn pt"
                            onClick={() => openPt(m)}
                            data-tooltip={ptPhones.has(m.phone) ? "Manage PT" : "Assign PT"}
                            aria-label="Personal Training"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 4v16M18 4v16M6 12h12" />
                              <circle cx="6" cy="4" r="2" /><circle cx="18" cy="4" r="2" />
                              <circle cx="6" cy="20" r="2" /><circle cx="18" cy="20" r="2" />
                            </svg>
                          </button>
                        <button className="mc-icon-btn renew" onClick={() => openRenew(m)} data-tooltip="Renew" aria-label="Renew">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" />
                          </svg>
                        </button>
                        {m.status === "active" && (
                          <>
                            <button className="mc-icon-btn change" onClick={() => openChangePlan(m)} data-tooltip="Change plan" aria-label="Change plan">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M7 10l5-5 5 5M7 14l5 5 5-5" />
                              </svg>
                            </button>
                            <button className="mc-icon-btn edit" onClick={() => openEdit(m)} data-tooltip="Edit" aria-label="Edit">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                              </svg>
                            </button>
                          </>
                        )}
                        <button className="mc-icon-btn view" onClick={() => setViewMember(m)} data-tooltip="View details" aria-label="View details">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── View Member modal ── */}
      {viewMember && (() => {
        // If viewing a PT member, find their regular record; if viewing regular, find their PT record
        const isPt = viewMember.memberType === "pt";
        const regularRecord = isPt
          ? members.find((x) => x.phone === viewMember.phone && (x.memberType || "regular") === "regular")
          : viewMember;
        const ptRecord = isPt
          ? viewMember
          : members.find((x) => x.phone === viewMember.phone && x.memberType === "pt");
        return (
          <Modal title={`Member Details — ${viewMember.name}`} onClose={() => setViewMember(null)}>
            {/* Regular membership */}
            {regularRecord ? (
              <div className="view-section">
                <div className="view-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>
                  </svg>
                  Regular Membership
                </div>
                <div className="view-rows">
                  <div className="view-row"><span>Name</span><strong>{regularRecord.name}</strong></div>
                  <div className="view-row"><span>Phone</span><strong>{regularRecord.phone || "—"}</strong></div>
                  <div className="view-row"><span>Plan</span><strong>{regularRecord.planDays} days</strong></div>
                  <div className="view-row"><span>Start date</span><strong>{formatDate(regularRecord.joinDate)}</strong></div>
                  <div className="view-row"><span>Expiry date</span><strong>{formatDate(regularRecord.expiryDate)}</strong></div>
                  <div className="view-row"><span>Status</span><strong><StatusBadge status={regularRecord.status} daysLeft={regularRecord.daysLeft} /></strong></div>
                </div>
              </div>
            ) : (
              <div className="info-note">No regular membership found.</div>
            )}

            {/* Personal Training */}
            {ptRecord ? (
              <div className="view-section" style={{ marginTop: 20 }}>
                <div className="view-section-title pt">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M6 4v16M18 4v16M6 12h12"/>
                    <circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/>
                    <circle cx="6" cy="20" r="2"/><circle cx="18" cy="20" r="2"/>
                  </svg>
                  Personal Training
                </div>
                <div className="view-rows">
                  <div className="view-row"><span>Plan</span><strong>{ptRecord.planDays} days</strong></div>
                  <div className="view-row"><span>Start date</span><strong>{formatDate(ptRecord.joinDate)}</strong></div>
                  <div className="view-row"><span>Expiry date</span><strong>{formatDate(ptRecord.expiryDate)}</strong></div>
                  <div className="view-row"><span>Status</span><strong><StatusBadge status={ptRecord.status} daysLeft={ptRecord.daysLeft} /></strong></div>
                </div>
              </div>
            ) : (
              <div className="info-note" style={{ marginTop: 16 }}>No Personal Training plan assigned.</div>
            )}

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn secondary" onClick={() => setViewMember(null)}>Close</button>
            </div>
          </Modal>
        );
      })()}

      {/* ── PT modal ── */}
      {ptTarget && (
        <Modal
          title={ptStep === "renew" ? `PT — ${ptTarget.name}` : `Assign PT — ${ptTarget.name}`}
          onClose={closePt}
        >
          {ptError && <div className="error" style={{ marginBottom: 12 }}>{ptError}</div>}

          {ptStep === "pick" ? (
            /* Assign PT: pick a PT plan */
            <>
              <p style={{ color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
                Choose a Personal Training plan for{" "}
                <strong style={{ color: "var(--text)" }}>{ptTarget.name}</strong>.
              </p>
              {ptPlans.length === 0 ? (
                <div className="info-note">
                  No PT plans set yet. Add PT plans from the Plans page first.
                </div>
              ) : (
                <div className="plan-options">
                  {ptPlans.map((p) => (
                    <button
                      type="button"
                      key={p.days}
                      className={`plan-chip ${ptPicked === p.days ? "active" : ""}`}
                      onClick={() => setPtPicked(p.days)}
                    >
                      <span className="pc-days">{p.days} Days</span>
                      {p.price ? <span className="pc-price">₹{p.price}</span> : null}
                    </button>
                  ))}
                </div>
              )}
              <div className="field" style={{ marginTop: 14 }}>
                <label>Start date <span style={{ color: "var(--red, #ef4444)" }}>*</span></label>
                <DatePicker
                  value={ptStartDate}
                  onChange={(v) => setPtStartDate(v)}
                  placeholder="Select start date"
                />
              </div>
              <div className="modal-actions">
                <button className="btn secondary" onClick={closePt}>Cancel</button>
                <button className="btn" onClick={assignPt} disabled={ptBusy || !ptPicked || !ptStartDate}>
                  {ptBusy ? "Assigning…" : "Assign PT"}
                </button>
              </div>
            </>
          ) : (
            /* Renew existing PT: show current info + pick plan to renew */
            <>
              <div className="pt-current-info">
                <div className="pci-row">
                  <span>Current plan</span>
                  <strong>{ptTarget.planDays} days</strong>
                </div>
                <div className="pci-row">
                  <span>Expires</span>
                  <strong>{formatDate(ptTarget.expiryDate)}</strong>
                </div>
              </div>
              <p style={{ color: "var(--muted)", margin: "14px 0 10px", lineHeight: 1.5 }}>
                Renew PT for <strong style={{ color: "var(--text)" }}>{ptTarget.name}</strong> — choose a plan:
              </p>
              {ptPlans.length === 0 ? (
                <div className="info-note">No PT plans set yet.</div>
              ) : (
                <div className="plan-options">
                  {ptPlans.map((p) => (
                    <button
                      type="button"
                      key={p.days}
                      className={`plan-chip ${ptPicked === p.days ? "active" : ""}`}
                      onClick={() => setPtPicked(p.days)}
                    >
                      <span className="pc-days">{p.days} Days</span>
                      {p.price ? <span className="pc-price">₹{p.price}</span> : null}
                    </button>
                  ))}
                </div>
              )}
              <div className="modal-actions">
                <button className="btn secondary" onClick={closePt}>Cancel</button>
                <button className="btn" onClick={renewPt} disabled={ptBusy || !ptPicked}>
                  {ptBusy ? "Renewing…" : "Renew PT"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Change plan / Renew */}
      {planTarget && (
        <Modal
          title={
            planStep === "early-warn"  ? "Early renewal"
            : planStep === "break-ask"  ? "Renew membership"
            : planStep === "break-date" ? "Select start date"
            : planStep === "pick"
            ? (planMode === "renew" ? "Renew membership" : "Change plan")
            : planStep === "confirm"
            ? (planMode === "renew" ? "Confirm renewal" : "Confirm")
            : "Verify to change plan"
          }
          onClose={closeChangePlan}
        >
          {planStep === "early-warn" ? (
            <>
              {planError && <div className="error" style={{ marginBottom: 12 }}>{planError}</div>}
              <div className="info-banner" style={{
                background: "var(--warning-bg, #fff8e1)",
                border: "1px solid var(--warning-border, #ffe082)",
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 16,
                color: "var(--text)",
                lineHeight: 1.6,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠️ Membership is still active</div>
                <div style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
                  <strong style={{ color: "var(--text)" }}>{planTarget.name}</strong> still has{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {planTarget.daysLeft} day{planTarget.daysLeft === 1 ? "" : "s"}
                  </strong>{" "}
                  remaining (expires {formatDate(planTarget.expiryDate)}).
                </div>
                <div style={{ marginTop: 8, color: "var(--muted)", fontSize: "0.92rem" }}>
                  If you renew now, the new plan will <strong style={{ color: "var(--text)" }}>continue from the expiry date</strong>, so no days are lost.
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn secondary" onClick={closeChangePlan}>Cancel</button>
                <button className="btn" onClick={() => setPlanStep("pick")}>
                  Yes, renew early
                </button>
              </div>
            </>
          ) : planStep === "break-ask" ? (
            <>
              {planError && <div className="error" style={{ marginBottom: 12 }}>{planError}</div>}
              <div style={{
                background: "var(--card-bg, var(--bg))",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "16px",
                marginBottom: 18,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: "1rem" }}>
                  Did <span style={{ color: "var(--accent)" }}>{planTarget.name}</span> take a break?
                </div>
                <div style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  Their membership expired on{" "}
                  <strong style={{ color: "var(--text)" }}>{formatDate(planTarget.expiryDate)}</strong>.
                </div>
                <div style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6, marginTop: 4 }}>
                  • <strong style={{ color: "var(--text)" }}>No</strong> — new plan continues from expiry date<br />
                  • <strong style={{ color: "var(--text)" }}>Yes</strong> — you'll pick when they're restarting
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn secondary" onClick={closeChangePlan}>Cancel</button>
                <button className="btn secondary" onClick={() => { setRenewStart(""); setPlanStep("pick"); }}>
                  No, continue from expiry
                </button>
                <button className="btn" onClick={() => { setRenewStart(toInputDate(new Date())); setPlanStep("break-date"); }}>
                  Yes, pick start date
                </button>
              </div>
            </>
          ) : planStep === "break-date" ? (
            <>
              {planError && <div className="error" style={{ marginBottom: 12 }}>{planError}</div>}
              <p style={{ color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
                Select the date <strong style={{ color: "var(--text)" }}>{planTarget.name}</strong> is restarting their membership.
              </p>
              <div className="field" style={{ marginBottom: 18 }}>
                <label>New start date</label>
                <DatePicker
                  inline
                  value={renewStartDate}
                  onChange={(v) => setRenewStart(v)}
                  placeholder="Select start date"
                />
              </div>
              <div className="modal-actions">
                <button className="btn secondary" onClick={() => setPlanStep("break-ask")}>Back</button>
                <button className="btn" onClick={() => setPlanStep("pick")} disabled={!renewStartDate}>
                  Next — choose plan
                </button>
              </div>
            </>
          ) : planStep === "pick" ? (
            <>
              <p style={{ color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
                {planMode === "renew"
                  ? <>Choose a plan to extend <strong style={{ color: "var(--text)" }}>{planTarget.name}</strong>'s membership.</>
                  : <>Choose a new plan for <strong style={{ color: "var(--text)" }}>{planTarget.name}</strong>.</>}
              </p>
              {(center?.plans || []).length === 0 ? (
                <div className="info-note">No plans yet. Set plan durations &amp; prices from the dashboard.</div>
              ) : (
                <div className="plan-options">
                  {(center?.plans || []).map((p) => (
                    <button
                      type="button"
                      key={p.days}
                      className={`plan-chip ${planTarget.planDays === p.days ? "current" : ""}`}
                      onClick={() => selectPlan(p.days)}
                    >
                      <span className="pc-days">{p.days} Days</span>
                      {p.price ? <span className="pc-price">₹{p.price}</span> : null}
                    </button>
                  ))}
                </div>
              )}
              <div className="modal-actions">
                {planMode === "renew" && (
                  <button className="btn secondary" onClick={() => {
                    if (planTarget.status === "expired") {
                      // Go back to break-date if they picked a date, else break-ask
                      setPlanStep(renewStartDate ? "break-date" : "break-ask");
                    } else {
                      setPlanStep("early-warn");
                    }
                  }}>Back</button>
                )}
                <button className="btn secondary" onClick={closeChangePlan}>Cancel</button>
              </div>
            </>
          ) : planStep === "confirm" ? (
            <>
              {planError && <div className="error" style={{ marginBottom: 12 }}>{planError}</div>}
              {planMode === "renew" ? (() => {
                // Compute new period:
                // - break=yes: starts from owner-picked date
                // - break=no / active: starts from current expiry
                const newStart = renewStartDate
                  ? new Date(renewStartDate)
                  : new Date(planTarget.expiryDate);
                const newExpiry = new Date(newStart);
                newExpiry.setDate(newExpiry.getDate() + pickedPlan);
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    <p style={{ color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
                      Review the renewal details before confirming.
                    </p>
                    <div style={{
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      overflow: "hidden",
                      marginBottom: 18,
                    }}>
                      {[
                        { label: "Member",        value: planTarget.name },
                        { label: "Plan",           value: `${pickedPlan} days` },
                        { label: "New start date", value: formatDate(newStart) },
                        { label: "New expiry",     value: formatDate(newExpiry), highlight: true },
                      ].map(({ label, value, highlight }, i, arr) => (
                        <div key={label} style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 14px",
                          borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                          background: highlight ? "var(--success-bg, #f0fdf4)" : "transparent",
                        }}>
                          <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{label}</span>
                          <strong style={{ color: highlight ? "var(--success, #16a34a)" : "var(--text)" }}>{value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })() : (
                <p style={{ color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
                  Change <strong style={{ color: "var(--text)" }}>{planTarget.name}</strong> to the{" "}
                  <strong style={{ color: "var(--text)" }}>{pickedPlan}-day</strong> plan?{" "}
                  We'll send an OTP to confirm.
                </p>
              )}
              <div className="modal-actions">
                <button className="btn secondary" onClick={() => setPlanStep("pick")} disabled={planBusy}>Back</button>
                <button className="btn" onClick={confirmChangePlan} disabled={planBusy}>
                  {planBusy ? (planMode === "renew" ? "Saving…" : "Sending…") : (planMode === "renew" ? "Confirm renewal" : "Continue")}
                </button>
              </div>
            </>
          ) : (
            <form className="form" onSubmit={(e) => { e.preventDefault(); confirmChangePlanOtp(); }}>
              {planError && <div className="error">{planError}</div>}
              {planInfo && !planError && <div className="info-note">{planInfo}</div>}
              <div className="field">
                <label>Enter OTP to confirm</label>
                <input
                  inputMode="numeric"
                  value={planOtp}
                  onChange={(e) => setPlanOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setPlanStep("confirm")} disabled={planBusy}>Back</button>
                <button className="btn" type="submit" disabled={planBusy || planOtp.length < 4}>
                  {planBusy ? "Verifying…" : "Verify & Change"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Delete */}
      {deleteTarget && (
        <Modal
          title={deleteStep === "confirm" ? "Delete member?" : "Verify to delete"}
          onClose={closeDelete}
        >
          {deleteStep === "confirm" ? (
            <>
              <p style={{ color: "var(--muted)", margin: "0 0 4px", lineHeight: 1.5 }}>
                Delete <strong style={{ color: "var(--text)" }}>{deleteTarget.name}</strong>? This can't be undone.
              </p>
              {deleteError && <div className="error" style={{ marginTop: 12 }}>{deleteError}</div>}
              <div className="modal-actions">
                <button className="btn secondary" onClick={closeDelete} disabled={busy}>Cancel</button>
                <button className="btn danger" onClick={deleteSendOtp} disabled={busy}>
                  {busy ? "Sending…" : "Yes, delete"}
                </button>
              </div>
            </>
          ) : (
            <form className="form" onSubmit={deleteConfirmOtp}>
              {deleteError && <div className="error">{deleteError}</div>}
              {deleteInfo && !deleteError && <div className="info-note">{deleteInfo}</div>}
              <div className="field">
                <label>OTP</label>
                <input
                  inputMode="numeric"
                  value={deleteOtp}
                  onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={closeDelete}>Cancel</button>
                <button className="btn danger" type="submit" disabled={busy || deleteOtp.length < 4}>
                  {busy ? "Deleting…" : "Verify & Delete"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* FAB */}
      <button className="fab" onClick={openNew} aria-label="Add member">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {/* Add / Edit member modal */}
      {showModal && (
        <Modal title={editing ? "Edit Member" : "Add Member"} onClose={() => setShowModal(false)}>
          <form className="form" onSubmit={handleSubmit}>
            {error && <div className="error">{error}</div>}
            <div className="field">
              <label>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Member name"
                required
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                placeholder="10-digit mobile number"
                required
              />
            </div>
            {!editing && (
              <div className="field">
                <label>Start date</label>
                <DatePicker
                  value={form.startDate}
                  onChange={(v) => setForm({ ...form, startDate: v })}
                  placeholder="Select start date"
                />
              </div>
            )}
            {!editing && (
              <div className="field">
                <label>Select plan</label>
                {(center?.plans || []).length === 0 ? (
                  <div className="info-note">No plans yet. Set plan durations &amp; prices from the dashboard.</div>
                ) : (
                  <div className="plan-options">
                    {(center?.plans || []).map((p) => (
                      <button
                        type="button"
                        key={p.days}
                        className={`plan-chip ${form.planDays === p.days ? "active" : ""}`}
                        onClick={() => setForm({ ...form, planDays: p.days })}
                      >
                        <span className="pc-days">{p.days} Days</span>
                        {p.price ? <span className="pc-price">₹{p.price}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="btn"
                type="submit"
                disabled={busy || !form.name.trim() || form.phone.length !== 10 || (!editing && !form.planDays) || !form.startDate}
              >
                {busy ? "Saving…" : editing ? "Save changes" : "Add member"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
