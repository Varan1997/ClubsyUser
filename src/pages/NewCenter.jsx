import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../api/axios.js";
import CategoryIcon from "../components/CategoryIcon.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { CENTER_TYPES } from "../utils/categories.js";

export default function NewCenter() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const presetType = searchParams.get("type");
  const type = CENTER_TYPES.includes(presetType) ? presetType : "Gym";

  const [form, setForm] = useState({
    name: "",
    address: "",
    pincode: "",
    capacity: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.pincode && !/^[0-9]{6}$/.test(form.pincode)) {
      setError("Pincode must be a valid 6-digit number");
      return;
    }

    setBusy(true);
    try {
      await api.post("/centers", {
        name: form.name.trim(),
        type,
        address: form.address.trim(),
        pincode: form.pincode.trim(),
        capacity: form.capacity ? Number(form.capacity) : 0,
      });
      toast.success(`${form.name.trim()} venue created`);
      // Back to the dashboard, which now shows the new centre.
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Could not create centre");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link to="/centers/add" className="back-link">
        <span className="back-icon" aria-hidden="true">←</span> Back
      </Link>

      <div className="form-page">
        <div className="form-page-head">
          <span className="fp-icon">
            <CategoryIcon type={type} />
          </span>
          <div>
            <h1>New {type} Venue</h1>
            <div className="sub">Add your {type.toLowerCase()} details to get started</div>
          </div>
        </div>

        <div className="form-card">
          <form className="form" onSubmit={handleSubmit}>
            {error && <div className="error">{error}</div>}

            <div className="field">
              <label>{type} name</label>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder={`e.g. ABC ${type} Venue`}
                autoFocus
                required
              />
            </div>

            <div className="field">
              <label>Address</label>
              <input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="Street, area, city"
              />
            </div>

            <div className="form-row">
              <div className="field">
                <label>Pincode</label>
                <input
                  inputMode="numeric"
                  value={form.pincode}
                  onChange={(e) =>
                    update("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="6-digit pincode"
                  maxLength={6}
                />
              </div>
              <div className="field">
                <label>Capacity (optional)</label>
                <input
                  type="number"
                  min="0"
                  value={form.capacity}
                  onChange={(e) => update("capacity", e.target.value)}
                  placeholder="e.g. 250"
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => navigate("/centers/add")}
              >
                Cancel
              </button>
              <button className="btn" type="submit" disabled={busy || !form.name.trim()}>
                {busy ? "Creating…" : "Create Venue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
