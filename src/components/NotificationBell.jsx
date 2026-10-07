import { useEffect, useRef, useState, useCallback } from "react";
import api from "../api/axios.js";

// Relative "time ago" formatter.
function timeAgo(date) {
  const d = new Date(date);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

const ICONS = {
  member_added: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1",
  member_updated: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z",
  welcome: "M20 6L9 17l-5-5",
  plan_changed: "M7 10l5-5 5 5M7 14l5 5 5-5",
  renewed: "M21 12a9 9 0 1 1-3-6.7M21 4v5h-5",
  venue_created: "M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01",
  upi_set: "M2.5 6h19v12h-19zM2.5 10h19",
  checkin: "M20 6L9 17l-5-5",
  checkin_self: "M20 6L9 17l-5-5",
  expiring: "M12 7v5l3 2M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  expired: "M15 9l-6 6M9 9l6 6M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
};

// A self-contained bell: unread badge + dropdown feed. role = "owner" | "member".
export default function NotificationBell({ role = "owner" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications/count", { params: { role } });
      setUnread(res.data.unread || 0);
    } catch {
      /* ignore */
    }
  }, [role]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications", { params: { role } });
      setItems(res.data.notifications || []);
      setUnread(res.data.unread || 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [role]);

  // Poll the unread count every 30s.
  useEffect(() => {
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    return () => clearInterval(t);
  }, [fetchCount]);

  // Close on outside click.
  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      await fetchList();
      // Mark stored notifications read when the panel is opened.
      try {
        await api.post("/notifications/read", {}, { params: { role } });
        // Virtual (expiring/expired) items stay "unread" by design; recompute.
        fetchCount();
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="noti-wrap" ref={wrapRef}>
      <button
        className="noti-bell"
        onClick={toggle}
        aria-label="Notifications"
        title="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="noti-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="noti-panel">
          <div className="noti-head">
            <span>Notifications</span>
          </div>

          {loading ? (
            <div className="noti-empty">Loading…</div>
          ) : items.length === 0 ? (
            <div className="noti-empty">You're all caught up.</div>
          ) : (
            <ul className="noti-list">
              {items.map((n) => (
                <li key={n._id} className={`noti-item ${n.read ? "" : "unread"}`}>
                  <span className={`noti-ic ${n.type}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={ICONS[n.type] || ICONS.welcome} />
                    </svg>
                  </span>
                  <span className="noti-body">
                    <span className="noti-title">{n.title}</span>
                    {n.message && <span className="noti-msg">{n.message}</span>}
                    <span className="noti-time">{timeAgo(n.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
