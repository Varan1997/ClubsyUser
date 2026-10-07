import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function  () {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const { owner, loading: authLoading } = useAuth();

  const [state, setState] = useState({ status: "loading", data: null, error: "" });

  useEffect(() => {
    if (authLoading) return;

    // Not logged in -> send to login, remember where to come back.
    if (!owner) {
      localStorage.setItem("postLoginRedirect", `/attend/${venueId}`);
      navigate("/login", { replace: true });
      return;
    }

    api
      .post(`/attend/${venueId}`)
      .then((res) => setState({ status: "ok", data: res.data, error: "" }))
      .catch((err) =>
        setState({
          status: "error",
          data: null,
          error: err.response?.data?.message || "Could not mark attendance",
        })
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, owner, venueId]);

  const checkInTime = state.data?.checkInAt
    ? new Date(state.data.checkInAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="attend-wrap">
      <div className="attend-card">
        {state.status === "loading" && (
          <>
            <div className="attend-spinner" />
            <h2>Checking you in…</h2>
          </>
        )}

        {state.status === "ok" && (
          <>
            <div className={`attend-badge ${state.data.alreadyMarked ? "already" : "success"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2>
              {state.data.alreadyMarked ? "Already checked in" : "Check-in successful!"}
            </h2>
            <p className="attend-venue">{state.data.venue}</p>
            <div className="attend-meta">
              <div>
                <span className="am-label">Member</span>
                <span className="am-val">{state.data.memberName}</span>
              </div>
              <div>
                <span className="am-label">Date</span>
                <span className="am-val">{todayStr}</span>
              </div>
              <div>
                <span className="am-label">Time</span>
                <span className="am-val">{checkInTime}</span>
              </div>
            </div>
            <Link to="/my" className="btn block">
              View my memberships
            </Link>
          </>
        )}

        {state.status === "error" && (
          <>
            <div className="attend-badge error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </div>
            <h2>Couldn't check in</h2>
            <p className="attend-venue">{state.error}</p>
            <Link to="/my" className="btn secondary block">
              Go to my memberships
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
