export function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// For <input type="date"> value (yyyy-mm-dd).
export function toInputDate(d) {
  if (!d) return "";
  const date = new Date(d);
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60000).toISOString().slice(0, 10);
}

export const STATUS_LABEL = {
  active: "Active",
  expiring: "Expiring Soon",
  expired: "Expired",
};
