/**
 * InstallBanner
 *
 * Shows a subtle bottom banner when the browser fires the
 * `beforeinstallprompt` event (Chrome / Samsung Internet / Edge on Android).
 * On iOS Safari it shows a manual "tap Share → Add to Home Screen" hint.
 *
 * The banner dismisses permanently once installed or when the user taps ✕.
 */
import { useEffect, useState } from "react";

const DISMISSED_KEY = "pwa_install_dismissed";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isInStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIos, setShowIos]               = useState(false);
  const [visible, setVisible]               = useState(false);

  useEffect(() => {
    // Already installed or user dismissed before
    if (isInStandaloneMode()) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    if (isIos()) {
      // iOS can't trigger the native prompt — show manual instructions
      setShowIos(true);
      setVisible(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Hide if user installs through another path
    window.addEventListener("appinstalled", () => setVisible(false));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  }

  if (!visible) return null;

  return (
    <div className="install-banner" role="banner" aria-label="Install app">
      <div className="ib-icon">
        <img src="/icons/icon-192.png" alt="Clubsy icon" width="36" height="36" />
      </div>

      <div className="ib-text">
        <strong>Install Clubsy</strong>
        {showIos ? (
          <span>
            Tap <ShareIcon /> then <em>"Add to Home Screen"</em>
          </span>
        ) : (
          <span>Get the app — works offline too</span>
        )}
      </div>

      {!showIos && (
        <button className="ib-install btn" onClick={install}>
          Install
        </button>
      )}

      <button className="ib-close" onClick={dismiss} aria-label="Dismiss">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" width="16" height="16">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="14"
      height="14"
      style={{ display: "inline", verticalAlign: "middle", margin: "0 2px" }}
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
