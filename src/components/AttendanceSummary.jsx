import { useEffect, useState, useMemo } from "react";
import api from "../api/axios.js";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function AttendanceSummary({ memberId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    api
      .get(`/my/attendance/${memberId}?year=${year}`)
      .then((res) => {
        setData({
          days: new Set(res.data.days),
          join: res.data.joinDate ? new Date(res.data.joinDate) : null,
          expiry: res.data.expiryDate ? new Date(res.data.expiryDate) : null,
        });
      })
      .catch(() => setData({ days: new Set(), join: null, expiry: null }))
      .finally(() => setLoading(false));
  }, [memberId, year]);

  const monthlyStats = useMemo(() => {
    if (!data) return new Array(12).fill(null).map(() => ({ attended: 0, total: 0, missed: 0 }));

    const stats = [];
    const today = new Date();
    const todayKey = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let attended = 0;
      let total = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isFuture = date > today;
        if (isFuture) continue;

        if (data.join && date < stripTime(data.join)) continue;
        if (data.expiry && date > stripTime(data.expiry)) continue;

        const dateKey = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        total++;
        if (data.days.has(dateKey)) {
          attended++;
        }
      }

      stats.push({ attended, total, missed: total - attended, month });
    }

    return stats;
  }, [data, year]);

  function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function isCurrentMonth(month) {
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth();
  }

  if (loading) {
    return (
      <div className="loading">
        <span className="att-load-text">Loading attendance…</span>
      </div>
    );
  }

  const totalAttended = monthlyStats.reduce((sum, s) => sum + s.attended, 0);
  const totalPossible = monthlyStats.reduce((sum, s) => sum + s.total, 0);
  const attendanceRate = totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : 0;

  return (
    <div className="att-summary-container">
      <div className="att-year-selector">
        <button
          type="button"
          className="att-year-btn"
          onClick={() => setYear(y => Math.max(2020, y - 1))}
          disabled={year <= 2020}
        >
          ‹
        </button>
        <span className="att-year-display">{year}</span>
        <button
          type="button"
          className="att-year-btn"
          onClick={() => setYear(y => y + 1)}
          disabled={year >= new Date().getFullYear()}
        >
          ›
        </button>
      </div>

      <div className="att-overall-stats">
        <div className="att-stat-card">
          <div className="att-stat-value">{totalAttended}</div>
          <div className="att-stat-label">Total attendances</div>
        </div>
        <div className="att-stat-card">
          <div className="att-stat-value">{attendanceRate}%</div>
          <div className="att-stat-label">Attendance rate</div>
        </div>
      </div>

      <div className="att-monthly-grid">
        {monthlyStats.map((stat, index) => (
          <div
            key={index}
            className={`att-month-card ${isCurrentMonth(index) ? "current" : ""}`}
          >
            <div className="att-month-name">{MONTHS[index]}</div>
            <div className="att-month-breakdown">
              <span className="att-month-attended">
                <span className="amm-count">{stat.attended}</span>
                <span className="amm-label">attended</span>
              </span>
              <span className="att-month-missed">
                <span className="amm-count">{stat.missed}</span>
                <span className="amm-label">missed</span>
              </span>
            </div>
            {stat.total > 0 && (
              <div className="att-month-bar">
                <div
                  className="att-month-bar-fill"
                  style={{
                    width: `${(stat.attended / stat.total) * 100}%`,
                    backgroundColor: stat.attended === stat.total ? "#22c55e" : stat.attended > stat.total / 2 ? "#f59e0b" : "#ef4444"
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
