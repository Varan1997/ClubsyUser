import { useEffect, useRef, useState, useCallback } from "react";
import api from "../api/axios.js";

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
  member_added:   "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1",
  member_updated: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z",
  welcome:        "M20 6L9 17l-5-5",
  plan_changed:   "M7 10l5-5 5 5M7 14l5 5 5-5",
  renewed:        "M21 12a9 9 0 1 1-3-6.7M21 4v5h-5",
  venue_created:  "M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01",
  upi_set:        "M2.5 6h19v12h-19zM2.5 10h19",
  checkin:        "M20 6L9 17l-5-5",
  checkin_self:   "M20 6L9 17l-5-5",
  expiring:       "M12 7v5l3 2M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  expired:        "M15 9l-6 6M9 9l6 6M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
};

const SWIPE_THRESHOLD = 60; // px to fully reveal the delete action

// Single swipeable notification row
function NotiItem({ n, onDelete }) {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [removed, setRemoved] = useState(false);
  const startX = useRef(null);
  const canDelete = !n.virtual && /^[a-fA-F0-9]{24}$/.test(n._id);

  function onTouchStart(e) {
    if (!canDelete) return;
    startX.current = e.touches[0].clientX;
    setSwiping(true);
  }

  function onTouchMove(e) {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    setOffsetX(Math.min(0, Math.max(-120, dx)));
  }

  async function onTouchEnd() {
    setSwiping(false);
    startX.current = null;
    if (offsetX < -80) {
      setOffsetX(-400);
      setTimeout(() => onDelete(n._id), 180);
    } else {
      setOffsetX(0);
    }
  }

  async function handleDelete() {
    setOffsetX(-400);
    setTimeout(() => onDelete(n._id), 180);
  }

  if (removed) return null;

  return (
    <li className={`noti-item ${n.read ? "" : "unread"}`}>
      <div className="noti-swipe-wrap">
        {/* Sliding content */}
        <div
          className="noti-swipe-content"
          style={{
            transform: `translateX(${offsetX}px)`,
            transition: swiping ? "none" : "transform 0.2s ease",
            background: offsetX < -40 ? `rgba(220,38,38,${Math.min(0.25, Math.abs(offsetX) / 200)})` : undefined,
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
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
          {/* Desktop delete button — visible on hover */}
          {canDelete && (
            <button
              className="noti-delete"
              onClick={handleDelete}
              aria-label="Delete"
              title="Delete"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function NotificationBell({ role = "owner" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const deletedIds = useRef(new Set()); // persist deleted IDs across re-opens

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications/count", { params: { role } });
      setUnread(res.data.unread || 0);
    } catch { /* ignore */ }
  }, [role]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications", { params: { role } });
      const all = res.data.notifications || [];
      // Filter out anything the user already deleted this session
      setItems(all.filter((n) => !deletedIds.current.has(n._id)));
      setUnread(res.data.unread || 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [role]);

  useEffect(() => {
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    return () => clearInterval(t);
  }, [fetchCount]);

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
      try {
        await api.post("/notifications/read", {}, { params: { role } });
        fetchCount();
      } catch { /* ignore */ }
    }
  }

  async function deleteItem(id) {
    if (!/^[a-fA-F0-9]{24}$/.test(id)) return;
    // Optimistically mark deleted in local state + session memory
    deletedIds.current.add(id);
    setItems((prev) => prev.filter((n) => n._id !== id));
    setUnread((prev) => Math.max(0, prev - 1));
    // Hard delete from DB
    try {
      await api.delete(`/notifications/${id}`);
    } catch (err) {
      console.error("Failed to delete notification:", err.response?.data?.message || err.message);
      // Even on error, keep it removed from UI — don't re-add it
    }
  }

  return (
    <div className="noti-wrap" ref={wrapRef}>
      <button className="noti-bell" onClick={toggle} aria-label="Notifications" title="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="noti-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="noti-panel">
          <div className="noti-head"><span>Notifications</span></div>
          {loading ? (
            <div className="noti-empty">Loading…</div>
          ) : items.length === 0 ? (
            <div className="noti-empty">You're all caught up.</div>
          ) : (
            <ul className="noti-list">
              {items.map((n) => (
                <NotiItem key={n._id} n={n} onDelete={deleteItem} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
