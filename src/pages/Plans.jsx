import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios.js";
import Modal from "../components/Modal.jsx";
import { useToast } from "../context/ToastContext.jsx";

// Reusable plan editor section (used for both Regular and PT tabs)
function PlanEditor({
  plans,
  onUpdate,
  onAddRow,
  onRemoveRow,
  onSave,
  busy,
  error,
  saved,
}) {
  return (
    <form className="form" onSubmit={onSave}>
      {error && <div className="error">{error}</div>}
      {saved && !error && <div className="info-note">Plans saved ✓</div>}

      <div className="plan-rows">
        <div className="plan-rows-head">
          <span>Days</span>
          <span>Price (₹)</span>
          <span></span>
        </div>
        {plans.map((p, i) => (
          <div className="plan-row" key={i}>
            <input
              inputMode="numeric"
              value={p.days}
              onChange={(e) => onUpdate(i, "days", e.target.value)}
              placeholder="e.g. 30"
            />
            <input
              inputMode="numeric"
              value={p.price}
              onChange={(e) => onUpdate(i, "price", e.target.value)}
              placeholder="e.g. 1000"
            />
            <button
              type="button"
              className="row-remove"
              onClick={() => onRemoveRow(i)}
              aria-label="Remove plan"
              disabled={plans.length === 1}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="btn secondary small add-row" onClick={onAddRow}>
        + Add plan
      </button>

      <div className="form-actions">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Please wait…" : "Save plans"}
        </button>
      </div>
    </form>
  );
}

export default function Plans() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active tab: "regular" | "pt"
  const [activeTab, setActiveTab] = useState("regular");

  // Regular plans state
  const [plans, setPlans] = useState([]);
  const [original, setOriginal] = useState("[]");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [removeIndex, setRemoveIndex] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpInfo, setOtpInfo] = useState("");
  const [otpError, setOtpError] = useState("");
  const [pendingPlans, setPendingPlans] = useState(null);

  // PT plans state
  const [ptPlans, setPtPlans] = useState([]);
  const [ptOriginal, setPtOriginal] = useState("[]");
  const [ptBusy, setPtBusy] = useState(false);
  const [ptError, setPtError] = useState("");
  const [ptSaved, setPtSaved] = useState(false);
  const [ptRemoveIndex, setPtRemoveIndex] = useState(null);
  const [ptShowConfirm, setPtShowConfirm] = useState(false);
  const [ptShowOtp, setPtShowOtp] = useState(false);
  const [ptOtp, setPtOtp] = useState("");
  const [ptOtpInfo, setPtOtpInfo] = useState("");
  const [ptOtpError, setPtOtpError] = useState("");
  const [ptPendingPlans, setPtPendingPlans] = useState(null);

  useEffect(() => {
    api
      .get(`/centers/${id}`)
      .then((res) => {
        setCenter(res.data.center);

        const list = (res.data.center.plans || []).map((p) => ({
          days: String(p.days),
          price: p.price ? String(p.price) : "",
        }));
        const initial = list.length ? list : [{ days: "", price: "" }];
        setPlans(initial);
        setOriginal(JSON.stringify(initial));

        const ptList = (res.data.center.ptPlans || []).map((p) => ({
          days: String(p.days),
          price: p.price ? String(p.price) : "",
        }));
        const ptInitial = ptList.length ? ptList : [{ days: "", price: "" }];
        setPtPlans(ptInitial);
        setPtOriginal(JSON.stringify(ptInitial));
      })
      .catch(() => navigate("/dashboard"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // ── Regular plan handlers ──────────────────────────────────────────────────

  function updateRow(i, field, value) {
    setPlans((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value.replace(/\D/g, "").slice(0, 7) };
      return next;
    });
  }

  function addRow() {
    setPlans((prev) => [...prev, { days: "", price: "" }]);
  }

  function removeRow(i) {
    const row = plans[i];
    if (!row.days && !row.price) {
      setPlans((prev) => prev.filter((_, idx) => idx !== i));
      return;
    }
    setRemoveIndex(i);
  }

  function confirmRemoveRow() {
    setPlans((prev) => prev.filter((_, idx) => idx !== removeIndex));
    setRemoveIndex(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaved(false);

    if (JSON.stringify(plans) === original) {
      setError("No changes to save.");
      return;
    }

    const cleaned = [];
    const seen = new Set();
    for (const p of plans) {
      if (p.days === "" || p.price === "") {
        setError("Please fill in both days and price for every plan.");
        return;
      }
      const days = Number(p.days);
      const price = Number(p.price);
      if (!days || days < 1) { setError("Every plan needs a valid number of days."); return; }
      if (price < 0) { setError("Price cannot be negative."); return; }
      if (seen.has(days)) { setError(`Duplicate plan: ${days} days appears more than once.`); return; }
      seen.add(days);
      cleaned.push({ days, price });
    }
    if (cleaned.length === 0) { setError("Add at least one plan."); return; }

    setPendingPlans(cleaned);
    setShowConfirm(true);
  }

  async function confirmAndSendOtp() {
    setBusy(true);
    try {
      const res = await api.post("/auth/my-otp");
      setOtp("");
      setOtpError("");
      setOtpInfo(
        res.data.devOtp ? `Dev mode — your OTP is ${res.data.devOtp}` : "OTP sent to your phone"
      );
      setShowConfirm(false);
      setShowOtp(true);
    } catch (err) {
      setShowConfirm(false);
      setError(err.response?.data?.message || "Could not send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSave(e) {
    e.preventDefault();
    setOtpError("");
    setBusy(true);
    try {
      await api.put(`/centers/${id}/plans`, { plans: pendingPlans, otp: otp.trim() });
      toast.success("Regular plans saved");
      setShowOtp(false);
      setSaved(true);
      setOriginal(JSON.stringify(plans));
    } catch (err) {
      setOtpError(err.response?.data?.message || "Could not verify OTP");
    } finally {
      setBusy(false);
    }
  }

  // ── PT plan handlers ───────────────────────────────────────────────────────

  function updatePtRow(i, field, value) {
    setPtPlans((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value.replace(/\D/g, "").slice(0, 7) };
      return next;
    });
  }

  function addPtRow() {
    setPtPlans((prev) => [...prev, { days: "", price: "" }]);
  }

  function removePtRow(i) {
    const row = ptPlans[i];
    if (!row.days && !row.price) {
      setPtPlans((prev) => prev.filter((_, idx) => idx !== i));
      return;
    }
    setPtRemoveIndex(i);
  }

  function confirmPtRemoveRow() {
    setPtPlans((prev) => prev.filter((_, idx) => idx !== ptRemoveIndex));
    setPtRemoveIndex(null);
  }

  async function handlePtSave(e) {
    e.preventDefault();
    setPtError("");
    setPtSaved(false);

    if (JSON.stringify(ptPlans) === ptOriginal) {
      setPtError("No changes to save.");
      return;
    }

    const cleaned = [];
    const seen = new Set();
    for (const p of ptPlans) {
      if (p.days === "" || p.price === "") {
        setPtError("Please fill in both days and price for every plan.");
        return;
      }
      const days = Number(p.days);
      const price = Number(p.price);
      if (!days || days < 1) { setPtError("Every plan needs a valid number of days."); return; }
      if (price < 0) { setPtError("Price cannot be negative."); return; }
      if (seen.has(days)) { setPtError(`Duplicate plan: ${days} days appears more than once.`); return; }
      seen.add(days);
      cleaned.push({ days, price });
    }
    if (cleaned.length === 0) { setPtError("Add at least one plan."); return; }

    setPtPendingPlans(cleaned);
    setPtShowConfirm(true);
  }

  async function ptConfirmAndSendOtp() {
    setPtBusy(true);
    try {
      const res = await api.post("/auth/my-otp");
      setPtOtp("");
      setPtOtpError("");
      setPtOtpInfo(
        res.data.devOtp ? `Dev mode — your OTP is ${res.data.devOtp}` : "OTP sent to your phone"
      );
      setPtShowConfirm(false);
      setPtShowOtp(true);
    } catch (err) {
      setPtShowConfirm(false);
      setPtError(err.response?.data?.message || "Could not send OTP");
    } finally {
      setPtBusy(false);
    }
  }

  async function ptConfirmSave(e) {
    e.preventDefault();
    setPtOtpError("");
    setPtBusy(true);
    try {
      await api.put(`/centers/${id}/pt-plans`, { plans: ptPendingPlans, otp: ptOtp.trim() });
      toast.success("PT plans saved");
      setPtShowOtp(false);
      setPtSaved(true);
      setPtOriginal(JSON.stringify(ptPlans));
    } catch (err) {
      setPtOtpError(err.response?.data?.message || "Could not verify OTP");
    } finally {
      setPtBusy(false);
    }
  }

  if (loading) return <div className="loading">Loading…</div>;
  if (!center) return null;

  return (
    <>
      <Link to="/dashboard" className="back-link">
        <span className="back-icon" aria-hidden="true">←</span> Back to dashboard
      </Link>

      <div className="form-page">
        <div className="form-page-head">
          <div>
            <h1>Membership Plans</h1>
            <div className="sub">
              Set your own durations &amp; prices · {center.name}
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="plans-tabs">
          <button
            type="button"
            className={activeTab === "regular" ? "active" : ""}
            onClick={() => setActiveTab("regular")}
          >
            Regular Plans
          </button>
          <button
            type="button"
            className={activeTab === "pt" ? "active" : ""}
            onClick={() => setActiveTab("pt")}
          >
            PT Plans
          </button>
        </div>

        <div className="form-card">
          {activeTab === "regular" ? (
            <PlanEditor
              plans={plans}
              onUpdate={updateRow}
              onAddRow={addRow}
              onRemoveRow={removeRow}
              onSave={handleSave}
              busy={busy}
              error={error}
              saved={saved}
            />
          ) : (
            <PlanEditor
              plans={ptPlans}
              onUpdate={updatePtRow}
              onAddRow={addPtRow}
              onRemoveRow={removePtRow}
              onSave={handlePtSave}
              busy={ptBusy}
              error={ptError}
              saved={ptSaved}
            />
          )}
        </div>
      </div>

      {/* Regular: remove row confirm */}
      {removeIndex !== null && (
        <Modal title="Remove this plan?" onClose={() => setRemoveIndex(null)}>
          <p style={{ color: "var(--muted)", margin: "0 0 4px", lineHeight: 1.5 }}>
            Remove the{" "}
            <strong style={{ color: "var(--text)" }}>
              {plans[removeIndex]?.days || "—"} day
            </strong>{" "}
            plan? You'll still need to save for it to take effect.
          </p>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setRemoveIndex(null)}>Cancel</button>
            <button className="btn danger" onClick={confirmRemoveRow}>Remove</button>
          </div>
        </Modal>
      )}

      {showConfirm && (
        <Modal title="Save changes?" onClose={() => setShowConfirm(false)}>
          <p style={{ color: "var(--muted)", margin: "0 0 4px", lineHeight: 1.5 }}>
            Do you want to save these Regular plan changes? We'll send an OTP to your phone to confirm.
          </p>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setShowConfirm(false)} disabled={busy}>Cancel</button>
            <button className="btn" onClick={confirmAndSendOtp} disabled={busy}>{busy ? "Sending…" : "Yes, continue"}</button>
          </div>
        </Modal>
      )}

      {showOtp && (
        <Modal title="Verify to save" onClose={() => setShowOtp(false)}>
          <p style={{ color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
            For security, enter the OTP sent to your phone to confirm the Regular plan changes.
          </p>
          <form className="form" onSubmit={confirmSave}>
            {otpError && <div className="error">{otpError}</div>}
            {otpInfo && !otpError && <div className="info-note">{otpInfo}</div>}
            <div className="field">
              <label>OTP</label>
              <input
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                maxLength={6}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={() => setShowOtp(false)}>Cancel</button>
              <button className="btn" type="submit" disabled={busy || otp.length < 4}>
                {busy ? "Verifying…" : "Verify & Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* PT: remove row confirm */}
      {ptRemoveIndex !== null && (
        <Modal title="Remove this plan?" onClose={() => setPtRemoveIndex(null)}>
          <p style={{ color: "var(--muted)", margin: "0 0 4px", lineHeight: 1.5 }}>
            Remove the{" "}
            <strong style={{ color: "var(--text)" }}>
              {ptPlans[ptRemoveIndex]?.days || "—"} day
            </strong>{" "}
            PT plan? You'll still need to save for it to take effect.
          </p>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setPtRemoveIndex(null)}>Cancel</button>
            <button className="btn danger" onClick={confirmPtRemoveRow}>Remove</button>
          </div>
        </Modal>
      )}

      {ptShowConfirm && (
        <Modal title="Save PT plan changes?" onClose={() => setPtShowConfirm(false)}>
          <p style={{ color: "var(--muted)", margin: "0 0 4px", lineHeight: 1.5 }}>
            Do you want to save these PT plan changes? We'll send an OTP to your phone to confirm.
          </p>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setPtShowConfirm(false)} disabled={ptBusy}>Cancel</button>
            <button className="btn" onClick={ptConfirmAndSendOtp} disabled={ptBusy}>{ptBusy ? "Sending…" : "Yes, continue"}</button>
          </div>
        </Modal>
      )}

      {ptShowOtp && (
        <Modal title="Verify to save" onClose={() => setPtShowOtp(false)}>
          <p style={{ color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
            For security, enter the OTP sent to your phone to confirm the PT plan changes.
          </p>
          <form className="form" onSubmit={ptConfirmSave}>
            {ptOtpError && <div className="error">{ptOtpError}</div>}
            {ptOtpInfo && !ptOtpError && <div className="info-note">{ptOtpInfo}</div>}
            <div className="field">
              <label>OTP</label>
              <input
                inputMode="numeric"
                value={ptOtp}
                onChange={(e) => setPtOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                maxLength={6}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={() => setPtShowOtp(false)}>Cancel</button>
              <button className="btn" type="submit" disabled={ptBusy || ptOtp.length < 4}>
                {ptBusy ? "Verifying…" : "Verify & Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
