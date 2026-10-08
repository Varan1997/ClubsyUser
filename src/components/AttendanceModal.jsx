import { useEffect, useState } from "react";
import api from "../api/axios.js";

export default function AttendanceModal({ centers, onClose, onSaved }) {
  // If multiple centers, let owner pick one; default to first
  const [centerId, setCenterId] = useState(centers[0]?._id || "");
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null); // { inserted, alreadyMarked, total }

  useEffect(() => {
    if (!centerId) return;
    setLoading(true);
    setError("");
    setSelected(new Set());
    setSaved(null);
    api
      .get(`/centers/${centerId}/members-for-attendance`)
      .then((res) => {
        setMembers(res.data.members);
        // Pre-select members not yet checked in today
        const preselect = res.data.members
          .filter((m) => !m.checkedInToday)
          .map((m) => m._id);
        setSelected(new Set(preselect));
      })
      .catch(() => setError("Could not load members"))
      .finally(() => setLoading(false));
  }, [centerId]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const eligible = members.filter((m) => !m.checkedInToday).map((m) => m._id);
    if (eligible.every((id) => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligible));
    }
  }

  async function handleSave() {
    if (selected.size === 0) return;
    setSaving(true);
    setError("");
    try {
      const res = await api.post(`/centers/${centerId}/attendance/bulk`, {
        memberIds: Array.from(selected),
      });
      setSaved(res.data);
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save attendance");
    } finally {
      setSaving(false);
    }
  }

  const eligible = members.filter((m) => !m.checkedInToday);
  const allEligibleSelected = eligible.length > 0 && eligible.every((m) => selected.has(m._id));

  // Group members into rows of 5
  const rows = [];
  for (let i = 0; i < members.length; i += 5) {
    rows.push(members.slice(i, i + 5));
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="att-modal">
        {/* Header */}
        <div className="att-modal-head">
          <div>
            <h2>Mark Attendance</h2>
            <span className="att-modal-date">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </span>
          </div>
          <button className="att-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Venue selector (only if multiple centers) */}
        {centers.length > 1 && (
          <div className="field" style={{ marginBottom: 16 }}>
            <label>Select Venue</label>
            <select value={centerId} onChange={(e) => setCenterId(e.target.value)}>
              {centers.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        {/* Success state */}
        {saved ? (
          <div className="att-saved">
            <div className="att-saved-icon">✓</div>
            <div className="att-saved-text">
              <strong>{saved.inserted}</strong> member{saved.inserted !== 1 ? "s" : ""} marked present
              {saved.alreadyMarked > 0 && ` · ${saved.alreadyMarked} already marked`}
            </div>
            <button className="btn" onClick={onClose}>Done</button>
          </div>
        ) : loading ? (
          <div className="loading">Loading members…</div>
        ) : members.length === 0 ? (
          <div className="empty">No members in this venue.</div>
        ) : (
          <>
            {/* Select all toggle */}
            <div className="att-modal-toolbar">
              <button
                type="button"
                className={`att-select-all ${allEligibleSelected ? "active" : ""}`}
                onClick={toggleAll}
              >
                {allEligibleSelected ? "Deselect All" : "Select All"}
              </button>
              <span className="att-modal-count">
                {selected.size} / {members.length} selected
              </span>
            </div>

            {/* Member grid — rows of 5 */}
            <div className="att-member-grid">
              {rows.map((row, ri) => (
                <div key={ri} className="att-member-row">
                  {row.map((m) => (
                    <button
                      key={m._id}
                      type="button"
                      className={`att-member-chip
                        ${selected.has(m._id) ? "selected" : ""}
                        ${m.checkedInToday ? "done" : ""}
                      `}
                      onClick={() => !m.checkedInToday && toggle(m._id)}
                      disabled={m.checkedInToday}
                      title={m.checkedInToday ? "Already checked in today" : m.name}
                    >
                      <span className="amc-avatar">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="amc-name">{m.name.split(" ")[0]}</span>
                      {m.checkedInToday && <span className="amc-done">✓</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Save */}
            <div className="att-modal-footer">
              <button className="btn secondary" onClick={onClose}>Cancel</button>
              <button
                className="btn"
                onClick={handleSave}
                disabled={saving || selected.size === 0}
              >
                {saving ? "Saving…" : `Save ${selected.size > 0 ? `(${selected.size})` : ""}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
