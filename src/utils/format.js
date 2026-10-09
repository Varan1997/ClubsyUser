export function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// For <input type="date"> value (yyyy-mm-dd) — uses local time, not UTC.
export function toInputDate(d) {
  if (!d) return "";
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const STATUS_LABEL = {
  active: "Active",
  expiring: "Expiring Soon",
  expired: "Expired",
};
