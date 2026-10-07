import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";

const OTP_LEN = 6;

export default function Login() {
  const { sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState(Array(OTP_LEN).fill(""));
  const [name, setName] = useState("");
  const [isNewOwner, setIsNewOwner] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const inputsRef = useRef([]);
  const otp = digits.join("");

  // Resend countdown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function requestOtp() {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const data = await sendOtp(phone.trim());
      setIsNewOwner(data.isNewOwner);
      setStep("otp");
      setResendIn(30);
      setDigits(Array(OTP_LEN).fill(""));
      setInfo(
        data.devOtp ? `Dev mode — your OTP is ${data.devOtp}` : `OTP sent to ${phone}`
      );
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } catch (err) {
      setError(err.response?.data?.message || "Could not send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendOtp(e) {
    e.preventDefault();
    requestOtp();
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await verifyOtp(phone.trim(), otp, name.trim());
      const redirect = localStorage.getItem("postLoginRedirect");
      if (redirect) {
        localStorage.removeItem("postLoginRedirect");
        navigate(redirect, { replace: true });
      } else {
        navigate("/choose");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not verify OTP");
    } finally {
      setBusy(false);
    }
  }

  function setDigit(i, val) {
    const v = val.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
    if (v && i < OTP_LEN - 1) inputsRef.current[i + 1]?.focus();
  }

  function onKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  }

  function onPaste(e) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LEN);
    if (!text) return;
    e.preventDefault();
    const next = Array(OTP_LEN).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    inputsRef.current[Math.min(text.length, OTP_LEN - 1)]?.focus();
  }

  function changeNumber() {
    setStep("phone");
    setDigits(Array(OTP_LEN).fill(""));
    setName("");
    setError("");
    setInfo("");
  }

  return (
    <div className="auth-wrap">
      <div className="auth-top-toggle">
        <ThemeToggle />
      </div>

      {/* Left brand panel */}
      <aside className="auth-aside">
        <div className="aside-top">
          <div className="aside-logo">
            <span className="brand-mark">C</span>
            Clubsy
          </div>
        </div>
        <div className="aside-body">
          <h2>Every membership, in one calm place.</h2>
          <p className="lede">
            Clubsy helps gyms, yoga and swimming centres, tuition classes and sports
            academies track members, renewals and expiries — all from a single dashboard.
          </p>
          <ul className="aside-points">
            <li>
              <span className="tick">✓</span> Live Active / Expiring / Expired counts
            </li>
            <li>
              <span className="tick">✓</span> One-tap renewals
            </li>
            <li>
              <span className="tick">✓</span> Secure phone OTP sign-in
            </li>
          </ul>
        </div>
        <div className="aside-foot">© {new Date().getFullYear()} Clubsy</div>
      </aside>

      {/* Right form panel */}
      <main className="auth-main">
        <div className="auth-card">
          {/* Mobile-only app intro (brand panel is hidden on small screens) */}
          {step === "phone" && (
            <div className="mobile-intro">
              <div className="mi-hero">
                <div className="mi-hero-top">
                  <span className="brand-mark">C</span>
                  <span className="mi-name">
                    Club<span className="brand-accent-light">sy</span>
                  </span>
                </div>
                <h2 className="mi-headline">
                  Every membership,
                  <br /> in one calm place.
                </h2>
                <p className="mi-sub">
                  Smart membership management for gyms, yoga, swimming, tuition &amp; sports
                  academies.
                </p>
              </div>

              <ul className="mi-list">
                <li>
                  <span className="mi-ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v18h18" />
                      <path d="M7 14l4-4 3 3 5-6" />
                    </svg>
                  </span>
                  <div>
                    <strong>Live membership insights</strong>
                    <span>See active, expiring and expired counts at a glance.</span>
                  </div>
                </li>
                <li>
                  <span className="mi-ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-3-6.7" />
                      <path d="M21 4v5h-5" />
                    </svg>
                  </span>
                  <div>
                    <strong>Renew in a single tap</strong>
                    <span>Extend memberships without the paperwork.</span>
                  </div>
                </li>
               
              </ul>
            </div>
          )}

          {step === "phone" ? (
            <>
             
              <form className="form" onSubmit={handleSendOtp}>
                {error && <div className="error">{error}</div>}
                <div className="field">
                  <label>Phone number</label>
                  <div className="phone-input">
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="Enter 10-digit mobile number"
                      autoFocus
                    />
                  </div>
                </div>
                <button
                  className="btn block"
                  type="submit"
                  disabled={busy || phone.length !== 10}
                >
                  {busy ? "Sending…" : "Send OTP"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1>Verify your number</h1>
              <p className="sub">Enter the {OTP_LEN}-digit code we sent you.</p>

              <div className="auth-phone-pill">
                {phone}
                <button type="button" onClick={changeNumber}>
                  Change
                </button>
              </div>

              <form className="form" onSubmit={handleVerify}>
                {error && <div className="error">{error}</div>}
                {info && !error && <div className="info-note">{info}</div>}

                {isNewOwner && (
                  <div className="field">
                    <label>Your name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ravi Kumar"
                      required
                    />
                  </div>
                )}

                <div className="field">
                  <label>OTP</label>
                  <div className="otp-boxes" onPaste={onPaste}>
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => (inputsRef.current[i] = el)}
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => setDigit(i, e.target.value)}
                        onKeyDown={(e) => onKeyDown(i, e)}
                      />
                    ))}
                  </div>
                </div>

                <button
                  className="btn block"
                  type="submit"
                  disabled={busy || otp.length !== OTP_LEN || (isNewOwner && !name.trim())}
                >
                  {busy ? "Verifying…" : isNewOwner ? "Create account" : "Sign in"}
                </button>

                <div className="resend">
                  Didn't get it?{" "}
                  <button
                    type="button"
                    onClick={requestOtp}
                    disabled={resendIn > 0 || busy}
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
