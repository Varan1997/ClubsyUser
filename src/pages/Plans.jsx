import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios.js";
import Modal from "../components/Modal.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function Plans() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [center, setCenter] = useState(null);
  const [plans, setPlans] = useState([]); // [{ days, price }]
  const [original, setOriginal] = useState("[]"); // JSON snapshot to detect changes
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Row-remove confirmation
  const [removeIndex, setRemoveIndex] = useState(null);

  // Confirm + OTP verification state
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpInfo, setOtpInfo] = useState("");
  const [otpError, setOtpError] = useState("");
  const [pendingPlans, setPendingPlans] = useState(null);

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
      })
      .catch(() => navigate("/dashboard"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

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

  // Ask before removing a plan row.
  function removeRow(i) {
    const row = plans[i];
    // If the row is empty, remove it straight away (nothing to confirm).
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

  // Step 1: validate, request an OTP, open the verify modal.
  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaved(false);

    // No changes made since the page loaded -> don't send an OTP.
    if (JSON.stringify(plans) === original) {
      setError("No changes to save.");
      return;
    }

    const cleaned = [];
    const seen = new Set();
    for (const p of plans) {
      // Both fields are required.
      if (p.days === "" || p.price === "") {
        setError("Please fill in both days and price for every plan.");
        return;
      }
      const days = Number(p.days);
      const price = Number(p.price);
      if (!days || days < 1) {
        setError("Every plan needs a valid number of days.");
        return;
      }
      if (price < 0) {
        setError("Price cannot be negative.");
        return;
      }
      if (seen.has(days)) {
        setError(`Duplicate plan: ${days} days appears more than once.`);
        return;
      }
      seen.add(days);
      cleaned.push({ days, price });
    }
    if (cleaned.length === 0) {
      setError("Add at least one plan.");
      return;
    }

    // Validation passed -> ask for confirmation first.
    setPendingPlans(cleaned);
    setShowConfirm(true);
  }

  // Step 2: user confirmed -> send the OTP and open the verify modal.
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

  // Step 2: submit plans with the OTP to actually save.
  async function confirmSave(e) {
    e.preventDefault();
    setOtpError("");
    setBusy(true);
    try {
      await api.put(`/centers/${id}/plans`, { plans: pendingPlans, otp: otp.trim() });
      toast.success("Plans saved");
      setShowOtp(false);
      setSaved(true);
      // New baseline so re-saving without changes is blocked.
      setOriginal(JSON.stringify(plans));
    } catch (err) {
      setOtpError(err.response?.data?.message || "Could not verify OTP");
    } finally {
      setBusy(false);
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

        <div className="form-card">
          <form className="form" onSubmit={handleSave}>
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
                    onChange={(e) => updateRow(i, "days", e.target.value)}
                    placeholder="e.g. 30"
                  />
                  <input
                    inputMode="numeric"
                    value={p.price}
                    onChange={(e) => updateRow(i, "price", e.target.value)}
                    placeholder="e.g. 1000"
                  />
                  <button
                    type="button"
                    className="row-remove"
                    onClick={() => removeRow(i)}
                    aria-label="Remove plan"
                    disabled={plans.length === 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="btn secondary small add-row" onClick={addRow}>
              + Add plan
            </button>

            <div className="form-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </button>
              <button className="btn" type="submit" disabled={busy}>
                {busy ? "Please wait…" : "Save plans"}
              </button>
            </div>
          </form>
        </div>
      </div>

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
            <button className="btn secondary" onClick={() => setRemoveIndex(null)}>
              Cancel
            </button>
            <button className="btn danger" onClick={confirmRemoveRow}>
              Remove
            </button>
          </div>
        </Modal>
      )}

      {showConfirm && (
        <Modal title="Save changes?" onClose={() => setShowConfirm(false)}>
          <p style={{ color: "var(--muted)", margin: "0 0 4px", lineHeight: 1.5 }}>
            Do you want to save these plan changes? We'll send an OTP to your phone to
            confirm.
          </p>
          <div className="modal-actions">
            <button
              className="btn secondary"
              onClick={() => setShowConfirm(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button className="btn" onClick={confirmAndSendOtp} disabled={busy}>
              {busy ? "Sending…" : "Yes, continue"}
            </button>
          </div>
        </Modal>
      )}

      {showOtp && (
        <Modal title="Verify to save" onClose={() => setShowOtp(false)}>
          <p style={{ color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
            For security, enter the OTP sent to your phone to confirm the plan changes.
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
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowOtp(false)}
              >
                Cancel
              </button>
              <button className="btn" type="submit" disabled={busy || otp.length < 4}>
                {busy ? "Verifying…" : "Verify & Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
