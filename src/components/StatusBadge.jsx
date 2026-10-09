/**
 * StatusBadge
 *
 * Props:
 *   status   — "active" | "expiring" | "expired"
 *   daysLeft — (optional) number from withStatus(). When provided:
 *              expiring → "Expiring in X days" / "Expiring tomorrow"
 *              expired  → "Expired X days ago" / "Expired today"
 *              active   → just "Active"
 */
export default function StatusBadge({ status, daysLeft }) {
  let label;

  if (status === "expiring" && daysLeft != null) {
    if (daysLeft <= 0)        label = "Expiring today";
    else if (daysLeft === 1)  label = "Expiring tomorrow";
    else                      label = `Expiring in ${daysLeft}d`;
  } else if (status === "expired" && daysLeft != null) {
    const ago = Math.abs(daysLeft);
    if (ago === 0)            label = "Expired today";
    else if (ago === 1)       label = "Expired 1d ago";
    else                      label = `Expired ${ago}d ago`;
  } else if (status === "active") {
    label = "Active";
  } else {
    // fallback — no daysLeft provided or unknown status
    label = status === "expiring" ? "Expiring Soon"
          : status === "expired"  ? "Expired"
          : status || "—";
  }

  return <span className={`badge ${status}`}>{label}</span>;
}
