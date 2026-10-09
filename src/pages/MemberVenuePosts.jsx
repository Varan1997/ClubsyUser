import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios.js";
import { formatDate } from "../utils/format.js";
import CategoryIcon from "../components/CategoryIcon.jsx";

export default function MemberVenuePosts() {
  const { centerId } = useParams();

  const [posts, setPosts]     = useState([]);
  const [center, setCenter]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    async function load() {
      try {
        const postsRes = await api.get(`/centers/${centerId}/posts`);
        setPosts(postsRes.data.posts);
        // Try to get center info from the first post's context, else fall back gracefully
      } catch (err) {
        setError(err.response?.data?.message || "Could not load posts");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [centerId]);

  // Also fetch memberships to get center name/type
  useEffect(() => {
    api.get("/my/memberships")
      .then((r) => {
        const membership = r.data.memberships.find(
          (m) => m.venue?._id?.toString() === centerId
        );
        if (membership?.venue) setCenter(membership.venue);
      })
      .catch(() => {});
  }, [centerId]);

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <>
      <button
        type="button"
        className="back-link"
        onClick={() => window.history.back()}
      >
        <span className="back-icon" aria-hidden="true">←</span> My memberships
      </button>

      <div className="posts-header">
        {center && (
          <div className="posts-venue-id">
            <span className="posts-venue-icon">
              <CategoryIcon type={center.type || "Other"} />
            </span>
            <div>
              <h1 className="posts-title">{center.name}</h1>
              <p className="posts-sub">{center.type}{center.location ? ` · ${center.location}` : ""}</p>
            </div>
          </div>
        )}
        {!center && <h1 className="posts-title">Announcements</h1>}
      </div>

      {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

      {posts.length === 0 && !error ? (
        <div className="empty">No announcements yet from this venue.</div>
      ) : (
        <div className="posts-list">
          {posts.map((p) => (
            <div key={p._id} className="post-card">
              <span className="post-date">{formatDate(p.createdAt)}</span>
              <p className="post-content">{p.content}</p>
              {p.imageUrl && (
                <img src={p.imageUrl} alt="announcement" className="post-image" />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
