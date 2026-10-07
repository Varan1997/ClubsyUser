import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import Modal from "./Modal.jsx";

// Shows a scannable QR for a venue's attendance URL, with a download button.
export default function QrModal({ venue, onClose }) {
  const canvasRef = useRef(null);
  const [dataUrl, setDataUrl] = useState("");

  const attendUrl = `${window.location.origin}/attend/${venue._id}`;

  useEffect(() => {
    QRCode.toCanvas(
      canvasRef.current,
      attendUrl,
      { width: 240, margin: 2, color: { dark: "#101010", light: "#ffffff" } },
      () => {}
    );
    QRCode.toDataURL(attendUrl, { width: 600, margin: 2 }).then(setDataUrl).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendUrl]);

  function download() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${venue.name.replace(/\s+/g, "-")}-attendance-qr.png`;
    a.click();
  }

  return (
    <Modal title="Attendance QR" onClose={onClose}>
      <p style={{ color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
        Print or display this at <strong style={{ color: "var(--text)" }}>{venue.name}</strong>.
        Members scan it to check in for the day.
      </p>
      <div className="qr-box">
        <canvas ref={canvasRef} />
      </div>
      <div className="qr-url">{attendUrl}</div>
      <div className="modal-actions">
        <button className="btn secondary" onClick={onClose}>
          Close
        </button>
        <button className="btn" onClick={download} disabled={!dataUrl}>
          Download PNG
        </button>
      </div>
    </Modal>
  );
}
