import { useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function keyOf(d) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export default function AttendanceCalendar({ memberId, refreshKey = 0 }) {
  const [data, setData] = useState(null); // { days:Set, join, expiry }
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    setLoading(true);
    api
      .get(`/my/attendance/${memberId}`)
      .then((res) => {
        setData({
          days: new Set(res.data.days),
          join: res.data.joinDate ? new Date(res.data.joinDate) : null,
          expiry: res.data.expiryDate ? new Date(res.data.expiryDate) : null,
        });
      })
      .catch(() => setData({ days: new Set(), join: null, expiry: null }))
      .finally(() => setLoading(false));
  }, [memberId, refreshKey]);

  const grid = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.year, cursor.month, d));
    return cells;
  }, [cursor]);

  // Monthly summary: attended vs missed within membership window (up to today).
  const summary = useMemo(() => {
    if (!data) return { attended: 0, missed: 0 };
    const today = new Date();
    let attended = 0;
    let missed = 0;
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(cursor.year, cursor.month, d);
      if (date > today) continue;
      if (data.join && date < stripTime(data.join)) continue;
      if (data.expiry && date > stripTime(data.expiry)) continue;
      if (data.days.has(keyOf(date))) attended += 1;
      else missed += 1;
    }
    return { attended, missed };
  }, [data, cursor]);

  function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function shift(delta) {
    setCursor((c) => {
      const m = c.month + delta;
      const year = c.year + Math.floor(m / 12);
      const month = ((m % 12) + 12) % 12;
      return { year, month };
    });
  }

  if (loading) return <div className="ac-loading">Loading attendance…</div>;

  const today = new Date();
  const todayKey = keyOf(today);

  return (
    <div className="att-cal">
      <div className="ac-head">
        <button type="button" className="ac-nav" onClick={() => shift(-1)} aria-label="Previous month">
          ‹
        </button>
        <span className="ac-title">
          {MONTHS[cursor.month]} {cursor.year}
        </span>
        <button type="button" className="ac-nav" onClick={() => shift(1)} aria-label="Next month">
          ›
        </button>
      </div>

      <div className="ac-weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="ac-grid">
        {grid.map((date, i) => {
          if (!date) return <span key={`e${i}`} className="ac-cell empty" />;
          const k = keyOf(date);
          const attended = data.days.has(k);
          const inWindow =
            (!data.join || stripTime(date) >= stripTime(data.join)) &&
            (!data.expiry || stripTime(date) <= stripTime(data.expiry));
          const isPast = date <= today;
          const missed = inWindow && isPast && !attended;
          const isToday = k === todayKey;
          return (
            <span
              key={k}
              className={`ac-cell${attended ? " attended" : ""}${missed ? " missed" : ""}${
                isToday ? " today" : ""
              }`}
            >
              {date.getDate()}
            </span>
          );
        })}
      </div>

      <div className="ac-summary">
        <span className="ac-sum attended">
          <b>{summary.attended}</b> attended
        </span>
        <span className="ac-sum missed">
          <b>{summary.missed}</b> missed
        </span>
      </div>
    </div>
  );
}
