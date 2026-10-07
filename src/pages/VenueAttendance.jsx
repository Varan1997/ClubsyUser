import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios.js";
import DatePicker from "../components/DatePicker.jsx";
import CategoryIcon from "../components/CategoryIcon.jsx";
import { toInputDate } from "../utils/format.js";

// Owner-facing attendance page for one venue.
// Shows, for a chosen day, how many members attended and their names.
export default function VenueAttendance() {
  const { id } = useParams();

  const [venue, setVenue] = useState(null);
  const [day, setDay] = useState(toInputDate(new Date())); // YYYY-MM-DD
  const [data, setData] = useState(null); // { count, attendees, recentDays }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(forDay) {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/centers/${id}/attendance`, { params: { day: forDay } });
      setData(res.data);
      // Pull the venue name/type from the center endpoint once (for the header).
      if (!venue) {
        const c = await api.get(`/centers/${id}`);
        setVenue(c.data.center);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not load attendance");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(day);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function changeDay(d) {
    setDay(d);
    if (d) load(d);
  }

  return (
    <>
      <Link to="/dashboard" className="back-link">
        <span className="back-icon" aria-hidden="true">←</span> Back to dashboard
      </Link>

      <div className="venue-header">
        <span className="vh-icon">
          <CategoryIcon type={venue?.type} />
        </span>
        <div className="vh-text">
          <h1 className="vh-name">{venue?.name || "Attendance"}</h1>
          <div className="vh-meta">
            <span className="vh-type">Attendance</span>
            {venue?.location && <span className="vh-dot">·</span>}
            {venue?.location && <span>{venue.location}</span>}
          </div>
        </div>
      </div>

      <div className="att-page">
        <div className="field">
          <label>Select day</label>
          <DatePicker value={day} onChange={changeDay} placeholder="Select a day" />
        </div>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="loading">Loading…</div>
        ) : data ? (
          <>
            <div className="att-summary">
              <span className="att-count">{data.count}</span>
              <span className="att-count-label">
                {data.count === 1 ? "member attended" : "members attended"}
              </span>
            </div>

            {data.attendees.length === 0 ? (
              <div className="empty">No check-ins on this day.</div>
            ) : (
              <ul className="att-list">
                {data.attendees.map((a) => (
                  <li key={a.memberId || a.phone} className="att-row">
                    <span className="att-avatar">
                      {(a.name || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="att-id">
                      <span className="att-name">{a.name}</span>
                      <span className="att-phone">{a.phone || "No phone"}</span>
                    </span>
                    <span className="att-time">
                      {a.checkInAt
                        ? new Date(a.checkInAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {data.recentDays?.length > 0 && (
              <div className="att-recent">
                <div className="att-recent-head">Recent days</div>
                <div className="att-recent-chips">
                  {data.recentDays.map((d) => (
                    <button
                      type="button"
                      key={d.day}
                      className={`att-day-chip ${d.day === day ? "current" : ""}`}
                      onClick={() => changeDay(d.day)}
                      title={d.day}
                    >
                      <span className="adc-date">
                        {new Date(d.day + "T00:00:00").toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                      <span className="adc-count">{d.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </>
  );
}
