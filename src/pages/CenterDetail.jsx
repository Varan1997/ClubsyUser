import { useEffect, useState } from "react";
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
  const [editing, setEditing] = useState(null); // member being edited, or null for new
  const [form, setForm] = useState(emptyMember);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const validFilters = ["all", "active", "expiring", "expired"];
  const urlFilter = searchParams.get("filter");
  const [filter, setFilter] = useState(
    validFilters.includes(urlFilter) ? urlFilter : "all"
  );

  // Mobile: which member card has its dates expanded (tap to reveal)
  const [expandedId, setExpandedId] = useState(null);

  // Search by name or phone
  const [search, setSearch] = useState("");

  // Change-plan / Renew flow (pick plan -> confirm -> [otp]). mode: "change" | "renew"
  const [planTarget, setPlanTarget] = useState(null); // member whose plan is changing
  const [planMode, setPlanMode] = useState("change");
  const [planStep, setPlanStep] = useState("pick"); // "pick" | "confirm" | "otp"
  const [pickedPlan, setPickedPlan] = useState(null); // selected plan days
  const [planOtp, setPlanOtp] = useState("");
  const [planInfo, setPlanInfo] = useState("");
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState("");

  // Delete-member flow (confirm -> OTP -> delete)
  const [deleteTarget, setDeleteTarget] = useState(null); // member pending delete
  const [deleteStep, setDeleteStep] = useState("confirm"); // "confirm" | "otp"
  const [deleteOtp, setDeleteOtp] = useState("");
  const [deleteInfo, setDeleteInfo] = useState("");
  const [deleteError, setDeleteError] = useState("");

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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Keep the filter in sync if the URL ?filter= changes.
  useEffect(() => {
    if (validFilters.includes(urlFilter)) setFilter(urlFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFilter]);

  // Auto-open the Add Member modal when arriving with ?add=1.
  useEffect(() => {
    if (!loading && center && searchParams.get("add") === "1") {
      openNew();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, center]);

  function firstPlanDays() {
    return center?.plans?.[0]?.days ?? null;
  }

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

  // Open the plan picker. mode = "change" (switch plan) or "renew" (extend).
  function openPlanPicker(m, mode) {
    setPlanTarget(m);
    setPlanMode(mode);
    setPlanStep("pick");
    setPickedPlan(null);
    setPlanError("");
  }
  const openChangePlan = (m) => openPlanPicker(m, "change");
  const openRenew = (m) => openPlanPicker(m, "renew");

  function closeChangePlan() {
    setPlanTarget(null);
  }

  // Picked a plan -> go to confirm step.
  function selectPlan(days) {
    setPickedPlan(days);
    setPlanStep("confirm");
  }

  // Confirmed. Renew extends directly; Change plan requires OTP first.
  async function confirmChangePlan() {
    setPlanError("");
    setPlanBusy(true);
    try {
      if (planMode === "renew") {
        await api.post(`/members/${planTarget._id}/renew`, { planDays: pickedPlan });
        toast.success(`${planTarget.name}'s membership renewed`);
        setPlanTarget(null);
        await load();
      } else {
        // Change plan -> send OTP to the owner, then move to the OTP step.
        const res = await api.post("/auth/my-otp");
        setPlanOtp("");
        setPlanInfo(
          res.data.devOtp
            ? `Dev mode — your OTP is ${res.data.devOtp}`
            : "OTP sent to your phone"
        );
        setPlanStep("otp");
      }
    } catch (err) {
      setPlanError(err.response?.data?.message || "Could not continue");
    } finally {
      setPlanBusy(false);
    }
  }

  // Verify OTP and apply the plan change.
  async function confirmChangePlanOtp() {
    setPlanError("");
    setPlanBusy(true);
    try {
      await api.put(`/members/${planTarget._id}`, {
        planDays: pickedPlan,
        otp: planOtp.trim(),
      });
      toast.success(`${planTarget.name}'s plan changed`);
      setPlanTarget(null);
      await load();
    } catch (err) {
      setPlanError(err.response?.data?.message || "Could not verify OTP");
    } finally {
      setPlanBusy(false);
    }
  }

  // Open the confirm popup for a member.
  function handleDelete(m) {
    setDeleteTarget(m);
    setDeleteStep("confirm");
    setDeleteOtp("");
    setDeleteInfo("");
    setDeleteError("");
  }

  function closeDelete() {
    setDeleteTarget(null);
  }

  // Confirmed -> send OTP to owner's phone, move to OTP step.
  async function deleteSendOtp() {
    setDeleteError("");
    setBusy(true);
    try {
      const res = await api.post("/auth/my-otp");
      setDeleteInfo(
        res.data.devOtp ? `Dev mode — your OTP is ${res.data.devOtp}` : "OTP sent to your phone"
      );
      setDeleteStep("otp");
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Could not send OTP");
    } finally {
      setBusy(false);
    }
  }

  // Verify OTP and delete.
  async function deleteConfirmOtp(e) {
    e.preventDefault();
    setDeleteError("");
    setBusy(true);
    try {
      await api.delete(`/members/${deleteTarget._id}`, {
        data: { otp: deleteOtp.trim() },
      });
      toast.success(`${deleteTarget.name} removed`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Could not verify OTP");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="loading">Loading…</div>;
  if (!center) return null;

  const byStatus =
    filter === "all" ? members : members.filter((m) => m.status === filter);
  const q = search.trim().toLowerCase();
  const visible = q
    ? byStatus.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.phone || "").toLowerCase().includes(q)
      )
    : byStatus;

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
              <>
                <span className="vh-dot">·</span>
                <span>Capacity {center.capacity}</span>
              </>
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
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone"
          />
          {search && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              ✕
            </button>
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
          {/* Desktop / tablet: table */}
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
                {visible.map((m) => (
                  <tr key={m._id}>
                    <td>{m.name}</td>
                    <td>{m.phone || "-"}</td>
                    <td>{formatDate(m.joinDate)}</td>
                    <td>{formatDate(m.expiryDate)}</td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn secondary small"
                          onClick={() => openRenew(m)}
                          title="Renew (extend)"
                        >
                          Renew
                        </button>
                        {m.status === "active" && (
                          <>
                            <button
                              className="btn secondary small"
                              onClick={() => openChangePlan(m)}
                              title="Change plan"
                            >
                              Change plan
                            </button>
                            <button
                              className="btn secondary small"
                              onClick={() => openEdit(m)}
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: premium cards */}
          <div className="member-cards">
            {visible.map((m) => (
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
                    onClick={() =>
                      setExpandedId((cur) => (cur === m._id ? null : m._id))
                    }
                  >
                    <div className="mc-avatar">{m.name.charAt(0).toUpperCase()}</div>
                    <div className="mc-id-text">
                      <div className="mc-name">{m.name}</div>
                      <div className="mc-phone">{m.phone || "No phone"}</div>
                    </div>
                  </div>

                  <StatusBadge status={m.status} />

                  {/* <div className="mc-icons">
                    <button
                      className="mc-icon-btn renew"
                      onClick={() => openChangePlan(m)}
                      title="Change plan"
                      aria-label="Change plan"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-3-6.7" />
                        <path d="M21 4v5h-5" />
                      </svg>
                    </button>
                    <button
                      className="mc-icon-btn edit"
                      onClick={() => openEdit(m)}
                      title="Edit"
                      aria-label="Edit"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </button>
                  </div> */}
                </div>

                {/* Dates revealed on tap */}
                <div className="mc-reveal">
                  <div className="mc-date-chip start">
                    {/* <span className="mc-chip-ico">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4.5" width="18" height="16" rx="2" />
                        <path d="M3 9h18M8 2.5v4M16 2.5v4" />
                      </svg>
                    </span> */}
                    <span className="mc-chip-label">Start date</span>
                    <span className="mc-chip-val">{formatDate(m.joinDate)}</span>
                  </div>
                  <div className="mc-date-chip expiry">
                    {/* <span className="mc-chip-ico">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                    </span> */}
                    <span className="mc-chip-label">Expiry date</span>
                    <span className="mc-chip-val">{formatDate(m.expiryDate)}</span>
                  </div>
                  <div className="mc-icons">
                    <button
                      className="mc-icon-btn renew"
                      onClick={() => openRenew(m)}
                      title="Renew (extend)"
                      aria-label="Renew"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-3-6.7" />
                        <path d="M21 4v5h-5" />
                      </svg>
                    </button>
                    {m.status === "active" && (
                      <>
                        <button
                          className="mc-icon-btn change"
                          onClick={() => openChangePlan(m)}
                          title="Change plan"
                          aria-label="Change plan"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 10l5-5 5 5M7 14l5 5 5-5" />
                          </svg>
                        </button>
                        <button
                          className="mc-icon-btn edit"
                          onClick={() => openEdit(m)}
                          title="Edit"
                          aria-label="Edit"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Change plan / Renew: pick -> confirm */}
      {planTarget && (
        <Modal
          title={
            planStep === "pick"
              ? planMode === "renew"
                ? "Renew membership"
                : "Change plan"
              : planStep === "otp"
              ? "Verify to change plan"
              : "Confirm"
          }
          onClose={closeChangePlan}
        >
          {planStep === "pick" ? (
            <>
              <p style={{ color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
                {planMode === "renew" ? (
                  <>
                    Choose a plan to extend{" "}
                    <strong style={{ color: "var(--text)" }}>{planTarget.name}</strong>'s
                    membership.
                  </>
                ) : (
                  <>
                    Choose a new plan for{" "}
                    <strong style={{ color: "var(--text)" }}>{planTarget.name}</strong>.
                  </>
                )}
              </p>
              {(center?.plans || []).length === 0 ? (
                <div className="info-note">
                  No plans yet. Set plan durations &amp; prices from the dashboard.
                </div>
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
                <button className="btn secondary" onClick={closeChangePlan}>
                  Cancel
                </button>
              </div>
            </>
          ) : planStep === "confirm" ? (
            <>
              {planError && <div className="error" style={{ marginBottom: 12 }}>{planError}</div>}
              {planMode === "renew" ? (
                <p style={{ color: "var(--muted)", margin: "0 0 4px", lineHeight: 1.5 }}>
                  Extend{" "}
                  <strong style={{ color: "var(--text)" }}>{planTarget.name}</strong>'s
                  membership by{" "}
                  <strong style={{ color: "var(--text)" }}>{pickedPlan} days</strong>? The
                  expiry date will be pushed forward and the member will get an SMS.
                </p>
              ) : (
                <p style={{ color: "var(--muted)", margin: "0 0 4px", lineHeight: 1.5 }}>
                  Change{" "}
                  <strong style={{ color: "var(--text)" }}>{planTarget.name}</strong> to the{" "}
                  <strong style={{ color: "var(--text)" }}>{pickedPlan}-day</strong> plan? We'll
                  send an OTP to your phone to confirm, and the member will get an SMS.
                </p>
              )}
              <div className="modal-actions">
                <button
                  className="btn secondary"
                  onClick={() => setPlanStep("pick")}
                  disabled={planBusy}
                >
                  Back
                </button>
                <button className="btn" onClick={confirmChangePlan} disabled={planBusy}>
                  {planBusy
                    ? planMode === "renew"
                      ? "Saving…"
                      : "Sending…"
                    : planMode === "renew"
                    ? "Confirm"
                    : "Continue"}
                </button>
              </div>
            </>
          ) : (
            /* OTP step (change plan only) */
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                confirmChangePlanOtp();
              }}
            >
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
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setPlanStep("confirm")}
                  disabled={planBusy}
                >
                  Back
                </button>
                <button
                  className="btn"
                  type="submit"
                  disabled={planBusy || planOtp.length < 4}
                >
                  {planBusy ? "Verifying…" : "Verify & Change"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Delete member: confirm -> OTP */}
      {deleteTarget && (
        <Modal
          title={deleteStep === "confirm" ? "Delete member?" : "Verify to delete"}
          onClose={closeDelete}
        >
          {deleteStep === "confirm" ? (
            <>
              <p style={{ color: "var(--muted)", margin: "0 0 4px", lineHeight: 1.5 }}>
                Delete <strong style={{ color: "var(--text)" }}>{deleteTarget.name}</strong>?
                This can't be undone. We'll send an OTP to your phone to confirm.
              </p>
              {deleteError && <div className="error" style={{ marginTop: 12 }}>{deleteError}</div>}
              <div className="modal-actions">
                <button className="btn secondary" onClick={closeDelete} disabled={busy}>
                  Cancel
                </button>
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
                <button type="button" className="btn secondary" onClick={closeDelete}>
                  Cancel
                </button>
                <button
                  className="btn danger"
                  type="submit"
                  disabled={busy || deleteOtp.length < 4}
                >
                  {busy ? "Deleting…" : "Verify & Delete"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Mobile floating action button */}
      <button className="fab" onClick={openNew} aria-label="Add member">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {showModal && (
        <Modal
          title={editing ? "Edit Member" : "Add Member"}
          onClose={() => setShowModal(false)}
        >
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
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
                }
                placeholder="10-digit mobile number"
                required
              />
            </div>
            {!editing && ( <div className="field">
              <label>Start date</label>
              <DatePicker
                value={form.startDate}
                onChange={(v) => setForm({ ...form, startDate: v })}
                placeholder="Select start date"
              />
            </div>)}
           
            {!editing && (
              <div className="field">
                <label>Select plan</label>
                {(center?.plans || []).length === 0 ? (
                  <div className="info-note">
                    No plans yet. Set plan durations &amp; prices from the dashboard.
                  </div>
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
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn"
                type="submit"
                disabled={
                  busy ||
                  !form.name.trim() ||
                  form.phone.length !== 10 ||
                  (!editing && !form.planDays) ||
                  !form.startDate
                }
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
