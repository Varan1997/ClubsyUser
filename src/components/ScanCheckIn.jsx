import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import Modal from "./Modal.jsx";
import api from "../api/axios.js";
import { useToast } from "../context/ToastContext.jsx";

// In-app QR scanner for members. Opens the camera, reads a venue attendance QR
// (which encodes ".../attend/<venueId>"), and marks today's check-in by calling
// POST /api/attend/:venueId — the same endpoint the QR link uses.
export default function ScanCheckIn({ onClose, onSuccess, expectedVenueId, venueName }) {
  const toast = useToast();
  const regionId = "scan-region";
  const scannerRef = useRef(null);
  const handledRef = useRef(false); // guard against double-scan

  // phase: "scanning" | "working" | "result"
  const [phase, setPhase] = useState("scanning");
  const [result, setResult] = useState(null); // { ok, data } | { ok:false, error }
  const [camError, setCamError] = useState("");

  // Pull a venue id out of the scanned text. Accepts a full URL
  // (".../attend/<id>") or a bare 24-char ObjectId.
  function parseVenueId(text) {
    if (!text) return null;
    const t = text.trim();
    const m = t.match(/attend\/([a-fA-F0-9]{24})/);
    if (m) return m[1];
    if (/^[a-fA-F0-9]{24}$/.test(t)) return t;
    return null;
  }

  async function stopScanner() {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      try {
        await s.stop();
        await s.clear();
      } catch {
        /* already stopped */
      }
    }
  }

  async function handleDecoded(text) {
    if (handledRef.current) return;
    const venueId = parseVenueId(text);
    if (!venueId) return; // keep scanning until a venue QR is seen

    // When scanning from a specific membership card, only accept that venue's QR.
    if (expectedVenueId && venueId !== expectedVenueId) {
      handledRef.current = true;
      await stopScanner();
      setResult({
        ok: false,
        error: venueName
          ? `This QR is for a different venue. Scan the ${venueName} QR.`
          : "This QR is for a different venue.",
      });
      setPhase("result");
      return;
    }

    handledRef.current = true;

    await stopScanner();
    setPhase("working");
    try {
      const res = await api.post(`/attend/${venueId}`);
      setResult({ ok: true, data: res.data });
      toast.success(
        res.data.alreadyMarked
          ? `Already checked in at ${res.data.venue}`
          : `Checked in at ${res.data.venue}`
      );
      onSuccess?.();
      // Reload page after 1.5s so calendar updates with today's attendance
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setResult({
        ok: false,
        error: err.response?.data?.message || "Could not check in",
      });
    } finally {
      setPhase("result");
    }
  }

  useEffect(() => {
    const scanner = new Html5Qrcode(regionId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => handleDecoded(decoded),
        () => {} // per-frame decode failures are normal; ignore
      )
      .catch((err) => {
        setCamError(
          err?.message?.includes("Permission") || err?.name === "NotAllowedError"
            ? "Camera permission denied. Allow camera access and try again."
            : "Could not start the camera on this device."
        );
      });

    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function retry() {
    handledRef.current = false;
    setResult(null);
    setCamError("");
    setPhase("scanning");
    const scanner = new Html5Qrcode(regionId);
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => handleDecoded(decoded),
        () => {}
      )
      .catch(() =>
        setCamError("Could not start the camera on this device.")
      );
  }

  const checkInTime = result?.data?.checkInAt
    ? new Date(result.data.checkInAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <Modal title={venueName ? `Check in · ${venueName}` : "Scan to check in"} onClose={onClose}>
      {phase === "scanning" && (
        <>
          {camError ? (
            <>
              <div className="error">{camError}</div>
              <div className="modal-actions">
                <button className="btn secondary" onClick={onClose}>
                  Close
                </button>
                <button className="btn" onClick={retry}>
                  Try again
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
                {venueName
                  ? `Point your camera at the ${venueName} attendance QR code.`
                  : "Point your camera at the venue's attendance QR code."}
              </p>
              <div className="scan-frame">
                <div id={regionId} className="scan-region" />
              </div>
              <div className="modal-actions">
                <button className="btn secondary" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </>
      )}

      {phase === "working" && (
        <div className="scan-working">
          <div className="attend-spinner" />
          <p>Checking you in…</p>
        </div>
      )}

      {phase === "result" && result && (
        <>
          {result.ok ? (
            <div className="scan-result">
              <div
                className={`attend-badge ${
                  result.data.alreadyMarked ? "already" : "success"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h3>
                {result.data.alreadyMarked
                  ? "Already checked in"
                  : "Check-in successful!"}
              </h3>
              <p className="scan-venue">{result.data.venue}</p>
              {checkInTime && <p className="scan-time">at {checkInTime}</p>}
            </div>
          ) : (
            <div className="scan-result">
              <div className="attend-badge error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </div>
              <h3>Couldn't check in</h3>
              <p className="scan-venue">{result.error}</p>
            </div>
          )}
          <div className="modal-actions">
            {!result.ok && (
              <button className="btn secondary" onClick={retry}>
                Scan again
              </button>
            )}
            <button className="btn" onClick={onClose}>
              Done
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
