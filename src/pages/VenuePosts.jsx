import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios.js";
import { useToast } from "../context/ToastContext.jsx";
import { formatDate } from "../utils/format.js";

export default function VenuePosts() {
  const { id } = useParams();
  const toast = useToast();

  const [posts, setPosts]       = useState([]);
  const [center, setCenter]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [content, setContent]   = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState("");
  const fileRef = useRef(null);

  async function load() {
    try {
      const [postsRes, centerRes] = await Promise.all([
        api.get(`/centers/${id}/posts`),
        api.get(`/centers/${id}`),
      ]);
      setPosts(postsRes.data.posts);
      setCenter(centerRes.data.center);
    } catch {
      // center fetch may fail if not owner — ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_048_576) {
      setError("Image too large — please pick one under 1 MB.");
      e.target.value = "";
      return;
    }
    if (file.size > 512_000) {
      setError("Image is over 500 KB — it may load slowly for members.");
    } else {
      setError("");
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageUrl(ev.target.result);
      setImagePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageUrl("");
    setImagePreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handlePost(e) {
    e.preventDefault();
    if (!content.trim()) { setError("Write something before posting."); return; }
    setError("");
    setBusy(true);
    try {
      await api.post(`/centers/${id}/posts`, { content, imageUrl });
      setContent("");
      setImageUrl("");
      setImagePreview("");
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Post published");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not publish post");
    } finally { setBusy(false); }
  }

  async function handleDelete(postId) {
    if (!window.confirm("Delete this post?")) return;
    try {
      await api.delete(`/posts/${postId}`);
      toast.success("Post deleted");
      setPosts((p) => p.filter((x) => x._id !== postId));
    } catch (err) {
      toast.error?.(err.response?.data?.message || "Could not delete");
    }
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <>
      <Link to="/dashboard" className="back-link">
        <span className="back-icon" aria-hidden="true">←</span> Dashboard
      </Link>

      <div className="posts-header">
        <h1 className="posts-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {center?.name ? `${center.name} — Posts` : "Venue Posts"}
        </h1>
        <p className="posts-sub">Announcements visible to all members of this venue.</p>
      </div>

      {/* ── Create post form ── */}
      <div className="post-compose">
        <form onSubmit={handlePost}>
          {error && <div className="error" style={{ marginBottom: 10 }}>{error}</div>}
          <textarea
            className="post-compose-input"
            placeholder="Write an announcement, schedule update, or any news…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
            rows={3}
          />
          <div className="post-compose-footer">
            <div className="post-compose-left">
              {/* Image upload */}
              <label className="post-img-btn" title="Attach image">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImage}
                />
              </label>
              <span className="post-char-count">{content.length}/1000</span>
            </div>
            <button className="btn" type="submit" disabled={busy || !content.trim()}>
              {busy ? "Posting…" : "Post"}
            </button>
          </div>

          {/* Image preview */}
          {imagePreview && (
            <div className="post-img-preview">
              <img src={imagePreview} alt="preview" />
              <button type="button" className="post-img-remove" onClick={removeImage} aria-label="Remove image">✕</button>
            </div>
          )}
        </form>
      </div>

      {/* ── Posts list ── */}
      {posts.length === 0 ? (
        <div className="empty">No posts yet. Publish your first announcement above.</div>
      ) : (
        <div className="posts-list">
          {posts.map((p) => (
            <div key={p._id} className="post-card">
              <div className="post-card-top">
                <span className="post-date">{formatDate(p.createdAt)}</span>
                <button
                  type="button"
                  className="post-delete-btn"
                  onClick={() => handleDelete(p._id)}
                  aria-label="Delete post"
                  title="Delete post"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
              <p className="post-content">{p.content}</p>
              {p.imageUrl && (
                <img src={p.imageUrl} alt="post" className="post-image" />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
