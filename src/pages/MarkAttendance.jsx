import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios.js";
import CategoryIcon from "../components/CategoryIcon.jsx";
import Modal from "../components/Modal.jsx";

export default function MarkAttendance() {
  const navigate = useNavigate();

  const [centers, setCenters] = useState([]);
  const [centerId, setCenterId] = useState("");
  const [centerName, setCenterName] = useState("");
  const [centerType, setCenterType] = useState("");
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loadingCenters, setLoadingCenters] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    api.get("/centers")
      .then((res) => {
        const list = res.data.centers || [];
        setCenters(list);
        if (list.length > 0) {
          setCenterId(list[0]._id);
          setCenterName(list[0].name);
          setCenterType(list[0].type);
        }
      })
      .catch(() => setError("Could not load venues"))
      .finally(() => setLoadingCenters(false));
  }, []);

  const pollingRef = useRef(null);

  // Silent background refresh — updates checkedInToday + checkInAt without resetting selection
  async function silentRefresh(cid) {
    if (!cid) return;
    try {
      const res = await api.get(`/centers/${cid}/members-for-attendance`);
      setMembers(res.data.members || []);
    } catch {
      // silently ignore
    }
  }

  useEffect(() => {
    if (!centerId) return;
    setLoadingMembers(true);
    setError("");
    setSelected(new Set());
    setSaved(null);
    api.get(`/centers/${centerId}/members-for-attendance`)
      .then((res) => {
        const list = res.data.members || [];
        setMembers(list);
        setSelected(new Set());
      })
      .catch(() => setError("Could not load members"))
      .finally(() => setLoadingMembers(false));

    // Start polling every 15s for QR scan updates
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => silentRefresh(centerId), 15000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [centerId]);

  function handleCenterChange(id) {
    const c = centers.find((x) => x._id === id);
    setCenterId(id);
    setCenterName(c?.name || "");
    setCenterType(c?.type || "");
  }

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const eligible = members.filter((m) => !m.checkedInToday).map((m) => m._id);
    const allOn = eligible.every((id) => selected.has(id));
    setSelected(new Set(allOn ? [] : eligible));
  }

  const [savedIds, setSavedIds] = useState(new Set()); // IDs marked in last save
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPdfPicker, setShowPdfPicker] = useState(false);
  const [pdfDate, setPdfDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  async function downloadPdf() {
    if (!centerId) return;
    setPdfLoading(true);
    setPdfError("");
    try {
      const res = await api.get(`/centers/${centerId}/attendance?day=${pdfDate}`);
      const { attendees, venue, day } = res.data;

      const dateLabel = new Date(day + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
      });

      const rows = attendees.length > 0
        ? attendees.map((a, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${a.name}</td>
              <td>${a.phone || "—"}</td>
              <td>${a.checkInAt ? new Date(a.checkInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
            </tr>`).join("")
        : `<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No attendance recorded for this date</td></tr>`;

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Attendance — ${venue} — ${day}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .sub { font-size: 13px; color: #555; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { background: #1a1a2e; color: #fff; padding: 10px 12px; text-align: left; }
    td { padding: 9px 12px; border-bottom: 1px solid #e5e5e5; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: #f7f7f7; }
    .footer { margin-top: 24px; font-size: 12px; color: #888; text-align: right; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Attendance Report — ${venue}</h1>
  <div class="sub">${dateLabel} &nbsp;·&nbsp; ${attendees.length} member${attendees.length !== 1 ? "s" : ""} present</div>
  <table>
    <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Check-in Time</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Generated on ${new Date().toLocaleString("en-IN")}</div>
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

      const win = window.open("", "_blank");
      win.document.write(html);
      win.document.close();
      setShowPdfPicker(false);
    } catch (err) {
      setPdfError(err.response?.data?.message || "Could not fetch attendance");
    } finally {
      setPdfLoading(false);
    }
  }

  async function confirmSave() {
    setShowConfirm(false);
    if (selected.size === 0) return;
    setSaving(true);
    setError("");
    try {
      const res = await api.post(`/centers/${centerId}/attendance/bulk`, {
        memberIds: Array.from(selected),
      });
      setSaved(res.data);
      setSavedIds(new Set(selected));
      setSelected(new Set());
      // Reload members so checkedInToday flags are updated
      const updated = await api.get(`/centers/${centerId}/members-for-attendance`);
      setMembers(updated.data.members || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save attendance");
    } finally {
      setSaving(false);
    }
  }

  const [search, setSearch] = useState("");

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  const eligible = members.filter((m) => !m.checkedInToday);
  const allEligibleSelected = eligible.length > 0 && eligible.every((m) => selected.has(m._id));

  const filtered = search.trim()
    ? members.filter((m) => m.name.toLowerCase().includes(search.trim().toLowerCase()))
    : members;

  if (loadingCenters) return <div className="loading">Loading…</div>;

  return (
    <>
      <Link to="/dashboard" className="back-link">
        <span className="back-icon" aria-hidden="true">←</span> Dashboard
      </Link>

      <div className="ma-head">
        <div className="ma-head-icon">
          <CategoryIcon type={centerType || "Gym"} />
        </div>
        <div>
          <h1 className="ma-title">Mark Attendance</h1>
          <div className="ma-date">{today}</div>
        </div>
      </div>

      {centers.length > 1 && (
        <div className="field ma-venue-field">
          <label>Venue</label>
          <select value={centerId} onChange={(e) => handleCenterChange(e.target.value)}>
            {centers.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {/* ── Post-save banner (shows above grid, auto-dismissed on Mark Again) ── */}
      {saved && (
        <div className="ma-saved-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>
            <strong>{saved.inserted}</strong> member{saved.inserted !== 1 ? "s" : ""} marked present
            {saved.alreadyMarked > 0 && ` · ${saved.alreadyMarked} already marked`}
          </span>
        </div>
      )}

      {loadingMembers ? (
        <div className="loading">Loading members…</div>
      ) : members.length === 0 ? (
        <div className="empty">No members in this venue.</div>
      ) : (
        <>
          <div className="ma-toolbar">
            <button
              type="button"
              className={`att-select-all ${allEligibleSelected ? "active" : ""}`}
              onClick={toggleAll}
            >
              {allEligibleSelected ? "Deselect All" : "Select All"}
            </button>
            <span className="ma-count">
              <strong>{selected.size}</strong> / {members.length} selected
            </span>
            <div className="ma-toolbar-right">
              <span className="ma-live-dot" title="Auto-refreshing every 15s">
                <span className="live-pulse" />
                Live
              </span>
              <button
                type="button"
                className="ma-pdf-btn"
                onClick={() => { setPdfDate(new Date().toISOString().slice(0, 10)); setPdfError(""); setShowPdfPicker(true); }}
                title="Download attendance PDF"
                aria-label="Download attendance PDF"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="ma-search-wrap">
            <svg className="ma-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="ma-search-input"
              type="text"
              placeholder="Search members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
            {search && (
              <button className="ma-search-clear" onClick={() => setSearch("")} aria-label="Clear">✕</button>
            )}
          </div>

          {/* Flat grid */}
          <div className="ma-member-grid">
            {filtered.length === 0 ? (
              <div className="empty" style={{ gridColumn: "1/-1" }}>No members match "{search}"</div>
            ) : filtered.map((m) => (
              <button
                key={m._id}
                type="button"
                className={`att-member-chip${selected.has(m._id) ? " selected" : ""}${m.checkedInToday ? " done" : ""}`}
                onClick={() => !m.checkedInToday && toggle(m._id)}
                disabled={m.checkedInToday}
                title={m.checkedInToday ? "Already checked in today" : m.name}
              >
                <span className="amc-avatar">{m.name.charAt(0).toUpperCase()}</span>
                <span className="amc-name">
                  {m.name}
                  {m.checkedInToday && (
                    <span className="amc-time">
                      {m.checkInAt
                        ? new Date(m.checkInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                        : "✓ Today"}
                    </span>
                  )}
                </span>
                {m.checkedInToday && <span className="amc-done">✓</span>}
              </button>
            ))}
          </div>

          <div className="ma-save-bar">
            <div className="ma-save-info">
              {selected.size === 0
                ? "No members selected"
                : `${selected.size} member${selected.size !== 1 ? "s" : ""} will be marked present`}
            </div>
            <button
              className="btn"
              onClick={() => setShowConfirm(true)}
              disabled={saving || selected.size === 0}
            >
              {saving ? "Saving…" : `Save Attendance${selected.size > 0 ? ` (${selected.size})` : ""}`}
            </button>
          </div>
        </>
      )}

      {/* ── PDF date picker modal ── */}
      {showPdfPicker && (
        <Modal title="Download Attendance PDF" onClose={() => setShowPdfPicker(false)}>
          <p style={{ color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
            Select a date to download the attendance report for <strong style={{ color: "var(--text)" }}>{centerName}</strong>.
          </p>
          <div className="field">
            <label>Date</label>
            <input
              type="date"
              value={pdfDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setPdfDate(e.target.value)}
            />
          </div>
          {pdfError && <div className="error" style={{ marginTop: 8 }}>{pdfError}</div>}
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <button className="btn secondary" onClick={() => setShowPdfPicker(false)}>Cancel</button>
            <button className="btn" onClick={downloadPdf} disabled={pdfLoading || !pdfDate}>
              {pdfLoading ? "Loading…" : "Download PDF"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Confirmation modal ── */}
      {showConfirm && (
        <Modal title="Confirm Attendance" onClose={() => setShowConfirm(false)}>
          <p style={{ color: "var(--muted)", margin: "0 0 6px", lineHeight: 1.6 }}>
            You are about to mark <strong style={{ color: "var(--text)" }}>{selected.size} member{selected.size !== 1 ? "s" : ""}</strong> as present today at <strong style={{ color: "var(--text)" }}>{centerName}</strong>.
          </p>
          <p style={{ color: "var(--muted)", margin: "0 0 20px", fontSize: 13 }}>
            This action cannot be undone for today's date.
          </p>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
            <button className="btn" onClick={confirmSave}>Yes, Save</button>
          </div>
        </Modal>
      )}
    </>
  );
}
