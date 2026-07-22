import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toBlob } from "html-to-image";

import "./LeaguePreviewCard.css";

const PUBLIC_URL = process.env.PUBLIC_URL || "";

function ActionButton({ label, busy, onClick, children }) {
  return (
    <button
      type="button"
      className="league-preview-action"
      disabled={busy}
      onClick={onClick}
    >
      <span className="league-preview-action-icon">
        {busy ? <span className="league-preview-spinner" /> : children}
      </span>
      <span>{label}</span>
    </button>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="m16 6-4-4-4 4M12 2v14" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  );
}

export default function LeaguePreviewCard({ season = "szn5", onClose }) {
  const cardRef = useRef(null);
  const blobRef = useRef(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const seasonNumber = String(season).match(/\d+/)?.[0] || "5";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function flash(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 1800);
  }

  async function capture() {
    const source = cardRef.current;
    if (!source) return null;

    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch (err) {
        /* The system font fallback is safe for export. */
      }
    }

    const logo = source.querySelector("img");
    if (logo && !logo.complete) {
      await new Promise((resolve) => {
        logo.addEventListener("load", resolve, { once: true });
        logo.addEventListener("error", resolve, { once: true });
      });
    }

    const options = {
      width: 600,
      height: 315,
      pixelRatio: 2,
      cacheBust: false,
    };

    // Warm html-to-image's resource cache so the real pass always embeds the logo.
    await toBlob(source, options);
    return toBlob(source, options);
  }

  async function getBlob() {
    if (!blobRef.current) blobRef.current = await capture();
    return blobRef.current;
  }

  function downloadBlob(blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ifnbl-season-${seasonNumber}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleShare() {
    setBusy("share");
    try {
      const blob = await getBlob();
      if (!blob) throw new Error("Capture failed");

      const file = new File([blob], `ifnbl-season-${seasonNumber}.png`, {
        type: "image/png",
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "IFN Basketball League",
          text: "Scores, schedules, standings, and player stats from IFNBL.",
        });
        flash("Shared image");
      } else {
        downloadBlob(blob);
        flash("Saved image");
      }
    } catch (err) {
      if (err?.name !== "AbortError") flash("Share failed");
    } finally {
      setBusy("");
    }
  }

  async function handleCopy() {
    setBusy("copy");
    try {
      if (!window.isSecureContext || !navigator.clipboard || !window.ClipboardItem) {
        throw new Error("Clipboard unavailable");
      }

      const blob = await getBlob();
      if (!blob) throw new Error("Capture failed");
      await navigator.clipboard.write([
        new window.ClipboardItem({ "image/png": blob }),
      ]);
      flash("Copied image");
    } catch (err) {
      flash(window.isSecureContext ? "Copy unavailable" : "Use HTTPS to copy");
    } finally {
      setBusy("");
    }
  }

  async function handleSave() {
    setBusy("save");
    try {
      const blob = await getBlob();
      if (!blob) throw new Error("Capture failed");
      downloadBlob(blob);
      flash("Saved image");
    } catch (err) {
      flash("Save failed");
    } finally {
      setBusy("");
    }
  }

  return createPortal(
    <div
      className="league-preview-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        className="league-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="league-preview-title"
      >
        <header className="league-preview-dialog-header">
          <div>
            <span className="league-preview-eyebrow">Share IFNBL</span>
            <h2 id="league-preview-title">League preview</h2>
          </div>
          <button
            type="button"
            className="league-preview-close"
            aria-label="Close league preview"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="league-preview-frame">
          <article ref={cardRef} className="league-preview-card">
            <div className="league-preview-glow" />
            <div className="league-preview-court" aria-hidden="true">
              <span className="league-preview-court-ring" />
              <span className="league-preview-court-line" />
            </div>

            <div className="league-preview-card-content">
              <header className="league-preview-card-header">
                <div className="league-preview-brand">
                  <span className="league-preview-logo-wrap">
                    <img
                      src={`${PUBLIC_URL}/ifnbl-logo.png`}
                      alt=""
                      className="league-preview-logo"
                    />
                  </span>
                  <div>
                    <strong>IFNBL</strong>
                    <span>IFN Basketball League</span>
                  </div>
                </div>
                <span className="league-preview-season">Season {seasonNumber}</span>
              </header>

              <div className="league-preview-copy">
                <span className="league-preview-kicker">The league lives here.</span>
                <h3>Every game.<br />Every bucket.</h3>
              </div>

              <footer className="league-preview-card-footer">
                <div className="league-preview-features">
                  <span>Scores</span>
                  <i />
                  <span>Stats</span>
                  <i />
                  <span>Standings</span>
                </div>
                <strong>IFNBL.COM</strong>
              </footer>
            </div>
          </article>
        </div>

        <div className="league-preview-actions" aria-label="Preview actions">
          <ActionButton label="Share" busy={busy === "share"} onClick={handleShare}>
            <ShareIcon />
          </ActionButton>
          <ActionButton label="Copy" busy={busy === "copy"} onClick={handleCopy}>
            <CopyIcon />
          </ActionButton>
          <ActionButton label="Save" busy={busy === "save"} onClick={handleSave}>
            <SaveIcon />
          </ActionButton>
        </div>

        <div className="league-preview-notice" role="status" aria-live="polite">
          {notice}
        </div>
      </section>
    </div>,
    document.body
  );
}
