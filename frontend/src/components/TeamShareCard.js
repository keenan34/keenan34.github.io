import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toBlob } from "html-to-image";

const PUBLIC_URL = process.env.PUBLIC_URL || "";

// match the logo filenames: lowercase, spaces -> underscores, leading "The" dropped
const teamLogoUrl = (season, name) => {
  const slug = String(name || "")
    .replace(/^the\s+/i, "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  return `${PUBLIC_URL}/seasons/${season}/images/teams/${slug}.png`;
};

function ActionButton({ label, color, onClick, busy, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 text-xs font-black uppercase tracking-wide text-white"
      style={{ opacity: busy ? 0.6 : 1 }}
      disabled={busy}
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: color }}
      >
        {busy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          children
        )}
      </span>
      <span>{label}</span>
    </button>
  );
}

function TeamChip({ season, name, selected, onClick }) {
  const [error, setError] = useState(false);
  const letter = String(name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-[62px] w-[58px] flex-none flex-col items-center justify-end pb-1.5"
      aria-label={name}
    >
      {error ? (
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[#1f1f22] text-xs font-black leading-none text-[#9ca3af]">
          {letter}
        </span>
      ) : (
        <img
          src={teamLogoUrl(season, name)}
          alt={name}
          onError={() => setError(true)}
          className="h-12 w-12 object-contain"
        />
      )}
      {selected && <span className="absolute bottom-0 h-1 w-full bg-[#0284c7]" />}
    </button>
  );
}

function TeamBadge({ season, name }) {
  const [error, setError] = useState(false);
  const letter = String(name || "?").trim().charAt(0).toUpperCase() || "?";

  if (error) {
    return (
      <span
        className="grid h-16 w-16 flex-none place-items-center bg-[#1f1f22] text-center text-xl font-black leading-none tracking-wide text-[#9ca3af]"
        aria-hidden="true"
      >
        {letter}
      </span>
    );
  }

  return (
    <img
      src={teamLogoUrl(season, name)}
      alt={name}
      onError={() => setError(true)}
      className="h-16 w-16 flex-none object-contain"
      aria-hidden="true"
    />
  );
}

function BigStat({ value, label, strong = false }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className={strong ? "text-[22px] font-black leading-none text-white" : "text-[19px] font-black leading-none text-white"}>
        {value}
      </span>
      <span className="text-lg font-medium lowercase text-[#8f939d]">{label}</span>
    </div>
  );
}

function MiniStat({ value, label }) {
  return (
    <div className="flex min-w-0 flex-col items-start">
      <span className="text-[19px] font-black leading-none text-white">{value}</span>
      <span className="mt-1 text-[11px] font-black uppercase leading-none text-[#777b86]">
        {label}
      </span>
    </div>
  );
}

export default function TeamShareCard({
  team,
  opponent,
  teamScore,
  opponentScore,
  date,
  season,
  teamTotals,
  opponentTotals,
  onClose,
}) {
  const cardRef = useRef(null);
  const drag = useRef(null);
  const blobRef = useRef(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetClosing, setSheetClosing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [closing, setClosing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [sliding, setSliding] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const teams = [
    { team, totals: teamTotals, score: teamScore, opponent, opponentTotals },
    { team: opponent, totals: opponentTotals, score: opponentScore, opponent: team, opponentTotals: teamTotals },
  ].filter((entry) => entry.team?.name);

  const active = teams[activeIndex] || teams[0];
  const activeTeam = active?.team;
  const activeTotals = active?.totals || {};
  const activeScore = active?.score;
  const activeOpponent = active?.opponent;
  const activeOpponentScore = activeIndex === 0 ? opponentScore : teamScore;
  const hasScore = typeof activeScore === "number" && typeof activeOpponentScore === "number";
  const seasonNumber = String(season || "").match(/\d+/)?.[0];
  const canSwipe = teams.length > 1;

  useEffect(() => {
    setSheetOpen(false);
    blobRef.current = null;
    setPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return "";
    });
  }, [activeTeam?.name, date, season]);

  async function openShareSheet() {
    setSheetClosing(false);
    setSheetOpen(true);
    setBusy("preview");

    try {
      const blob = await getBlob();
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
      }
    } catch (err) {
      flash("Preview failed");
    } finally {
      setBusy("");
    }
  }

  function slideToIndex(nextIndex, direction) {
    if (!teams[nextIndex] || nextIndex === activeIndex || closing || sliding) return;
    const width = window.innerWidth || 360;

    setSliding(true);
    setOffset(-direction * width);
    window.setTimeout(() => {
      setActiveIndex(nextIndex);
      setSliding(false);
      setOffset(direction * width);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setSliding(true);
          setOffset(0);
          window.setTimeout(() => {
            setSliding(false);
          }, 200);
        })
      );
    }, 200);
  }

  function selectByOffset(step) {
    if (!canSwipe) return;
    const nextIndex = (activeIndex + step + teams.length) % teams.length;
    slideToIndex(nextIndex, step);
  }

  function handleTouchStart(event) {
    if (!canSwipe || closing) return;
    const touch = event.touches[0];
    drag.current = { x: touch.clientX, y: touch.clientY, active: false };
    setSliding(false);
  }

  function handleTouchMove(event) {
    if (!drag.current) return;
    const touch = event.touches[0];
    const dx = touch.clientX - drag.current.x;
    const dy = touch.clientY - drag.current.y;

    if (!drag.current.active) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dx) < Math.abs(dy)) {
        drag.current = null;
        return;
      }
      drag.current.active = true;
    }

    setOffset(dx);
  }

  function handleTouchEnd() {
    if (!drag.current || !drag.current.active) {
      drag.current = null;
      return;
    }

    const dx = offset;
    drag.current = null;

    if (Math.abs(dx) > 60) {
      const dir = dx < 0 ? 1 : -1;
      selectByOffset(dir);
    } else {
      setSliding(true);
      setOffset(0);
    }
  }

  async function capture() {
    const source = cardRef.current;
    if (!source) return null;

    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (err) {
        /* ignore */
      }
    }

    // Capture from a detached clone so the export-only styles never reflow the
    // card the user is looking at behind the share sheet.
    const clone = source.cloneNode(true);
    clone.classList.add("is-capturing");
    const holder = document.createElement("div");
    holder.style.cssText =
      "position:fixed;left:-10000px;top:0;pointer-events:none;";
    holder.style.width = `${source.offsetWidth}px`;
    holder.appendChild(clone);
    document.body.appendChild(holder);

    try {
      // Wait for every image in the clone to load/decode so html-to-image can
      // embed the logo on the first try (it inlines images lazily otherwise).
      const images = Array.from(clone.querySelectorAll("img"));
      await Promise.all(
        images.map(async (image) => {
          if (!image.complete) {
            await new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            });
          }
          if (image.naturalWidth > 0 && typeof image.decode === "function") {
            try {
              await image.decode();
            } catch (err) {
              /* the loaded image can still be captured when decode is unsupported */
            }
          }
        })
      );

      const options = {
        pixelRatio: 2,
        cacheBust: false,
      };
      // A throwaway warm-up pass populates html-to-image's resource cache so the
      // real capture reliably includes the team logo on the first export.
      await toBlob(clone, options);
      return await toBlob(clone, options);
    } finally {
      holder.remove();
    }
  }

  async function getBlob() {
    if (blobRef.current) return blobRef.current;
    const blob = await capture();
    blobRef.current = blob;
    return blob;
  }

  function fileName() {
    const parts = [activeTeam?.name, "team", date].filter(Boolean);
    return `${parts.join("-").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "team"}-stats.png`;
  }

  function flash(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 1800);
  }

  function downloadBlob(blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName();
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleShare() {
    setBusy("share");
    try {
      const blob = await getBlob();
      if (!blob) return;
      const file = new File([blob], fileName(), { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${activeTeam?.name} team stats` });
        flash("Shared image");
      } else {
        downloadBlob(blob);
        flash("Saved image");
      }
    } catch (err) {
      flash("Share failed");
    } finally {
      setBusy("");
    }
  }

  async function handleCopy() {
    setBusy("copy");

    if (!window.isSecureContext) {
      flash("Use HTTPS to copy");
      setBusy("");
      return;
    }

    const blobPromise = getBlob().then((blob) => {
      if (!blob) throw new Error("Capture failed");
      return blob;
    });

    try {
      const supportsPngClipboard =
        window.ClipboardItem &&
        (!window.ClipboardItem.supports || window.ClipboardItem.supports("image/png"));

      if (navigator.clipboard && supportsPngClipboard) {
        await navigator.clipboard.write([
          new window.ClipboardItem({ "image/png": blobPromise }),
        ]);
        flash("Copied image");
      } else {
        const blob = await blobPromise;
        const file = new File([blob], fileName(), { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `${activeTeam?.name} team stats` });
          flash("Shared image");
        } else {
          flash("Copy unavailable");
        }
      }
    } catch (err) {
      const blob = await blobPromise.catch(() => null);
      if (blob) {
        const file = new File([blob], fileName(), { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: `${activeTeam?.name} team stats` });
            flash("Shared image");
            return;
          } catch (shareErr) {
            if (shareErr?.name === "AbortError") return;
          }
        }
      }

      flash("Copy unavailable");
    } finally {
      setBusy("");
    }
  }

  async function handleSave() {
    setBusy("save");
    try {
      const blob = await getBlob();
      if (blob) {
        downloadBlob(blob);
        flash("Saved image");
      }
    } catch (err) {
      flash("Save failed");
    } finally {
      setBusy("");
    }
  }

  function closeWithAnimation() {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 180);
  }

  const cells = [
    { value: activeTotals?.Points ?? 0, label: "PTS", strong: true },
    { value: activeTotals?.REB ?? 0, label: "REB", strong: true },
    { value: activeTotals?.AST ?? 0, label: "AST", strong: true },
    { value: `${activeTotals?.FGM ?? 0}/${activeTotals?.FGA ?? 0}`, label: "FG" },
    { value: `${activeTotals?.["3 PTM"] ?? 0}/${activeTotals?.["3 PTA"] ?? 0}`, label: "3FG" },
    { value: `${activeTotals?.FTM ?? 0}/${activeTotals?.FTA ?? 0}`, label: "FT" },
    { value: activeTotals?.TOs ?? 0, label: "TO" },
    { value: activeTotals?.Fouls ?? 0, label: "PF" },
    { value: activeTotals?.["STLS/BLKS"] ?? 0, label: "STK" },
    { value: `${activeTotals?.["FG %"] ?? 0}%`, label: "FG%" },
    { value: `${activeTotals?.["3 Pt %"] ?? 0}%`, label: "3FG%" },
    { value: `${activeTotals?.["FT %"] ?? 0}%`, label: "FT%" },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex flex-col overflow-y-auto bg-[#050505] text-white"
      style={{
        animation: `${closing ? "ifnPlayerSlideOut" : "ifnPlayerSlideIn"} 180ms ease-out forwards`,
      }}
      onClick={closeWithAnimation}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <style>
        {`
          @keyframes ifnPlayerSlideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          @keyframes ifnPlayerSlideOut {
            from { transform: translateX(0); }
            to { transform: translateX(100%); }
          }
          @keyframes ifnSheetUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          @keyframes ifnSheetDown {
            from { transform: translateY(0); }
            to { transform: translateY(100%); }
          }
          @keyframes ifnSheetFade {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .is-capturing.ifn-export-card {
            padding: 0 16px 16px;
            border-radius: 14px;
            border: 0.5px solid #34343a;
            overflow: hidden;
          }
          .is-capturing .ifn-export-profile {
            padding-top: 16px;
            padding-bottom: 16px;
            min-height: 88px;
          }
          .is-capturing .ifn-export-photo {
            top: 16px;
          }
          .is-capturing .ifn-export-matchup {
            margin-top: 6px;
          }
          .is-capturing .ifn-export-score {
            margin-top: 8px;
          }
          .is-capturing .ifn-export-stats {
            margin-top: 8px;
            column-gap: 6px;
            row-gap: 8px;
          }
        `}
      </style>

      <div
        className="sticky top-0 z-20 flex h-[74px] min-h-[74px] flex-none items-center gap-3 border-b border-[#1f1f22] bg-[#151515] px-3"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeWithAnimation}
          className="flex h-12 w-9 flex-none items-center justify-center text-5xl font-light leading-none text-white/90 hover:text-white"
          aria-label="Close"
        >
          ‹
        </button>
        <div className="flex min-w-0 flex-1 gap-4 overflow-x-auto pr-2">
          {teams.map((entry, index) => (
            <TeamChip
              key={entry.team.name}
              season={season}
              name={entry.team.name}
              selected={index === activeIndex}
              onClick={() => slideToIndex(index, index > activeIndex ? 1 : -1)}
            />
          ))}
        </div>
      </div>

      <div
        className="mx-auto w-full max-w-md pb-8 pt-10"
        onClick={(event) => event.stopPropagation()}
        style={{
          transform: `translateX(${offset}px)`,
          transition: sliding ? "transform 200ms ease-out" : "none",
        }}
      >
        <div ref={cardRef} className="ifn-export-card bg-[#050505] px-4 pb-5 text-white">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openShareSheet();
            }}
            className="ifn-export-profile relative block w-full border-b border-[#1f1f22] py-5 pl-[76px] text-left"
            aria-label={`${activeTeam?.name || "Team"} export`}
          >
            <span className="ifn-export-photo absolute left-0 top-5">
              <TeamBadge season={season} name={activeTeam?.name} />
            </span>
            <div className="min-w-0 pr-12">
              <div className="truncate text-[17px] font-medium leading-tight text-[#d6d8df]">
                {activeTeam?.name}
              </div>
              <div className="mt-2 flex items-end gap-4">
                <BigStat value={activeTotals?.Points ?? 0} label="pts" strong />
                <BigStat value={activeTotals?.REB ?? 0} label="reb" strong />
                <BigStat value={activeTotals?.AST ?? 0} label="ast" strong />
              </div>
            </div>
          </button>

          <div className="ifn-export-matchup mt-2 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-baseline gap-2">
              {date && (
                <span className="flex-none text-xs font-medium italic text-[#8f939d]">
                  {date}
                </span>
              )}
              {activeOpponent?.name && (
                <span className="truncate text-base font-bold text-[#d6d8df]">
                  vs {activeOpponent.name}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openShareSheet();
              }}
              aria-label="Share"
              className="flex-none text-[#d6d8df] hover:text-white"
            >
              <svg
                className="ifn-share-icon"
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          <div className="ifn-export-score mt-3 flex items-center justify-between">
            <div className="flex items-baseline gap-2 text-lg font-black text-[#8f939d]">
              <span>IFNBL</span>
              {seasonNumber && (
                <span className="text-xs font-medium italic text-[#777b86]">
                  Season {seasonNumber}
                </span>
              )}
            </div>
            {hasScore && (
              <div className="text-lg font-black text-[#0284c7]">
                {activeScore}-{activeOpponentScore}
              </div>
            )}
          </div>

          <div className="ifn-export-stats mt-3 grid grid-cols-3 gap-x-2 gap-y-3">
            {cells.map((cell) => (
              <MiniStat key={cell.label} value={cell.value} label={cell.label} strong={cell.strong} />
            ))}
          </div>
        </div>

        {notice && (
          <div className="mt-4 text-center text-xs font-bold text-white/80">{notice}</div>
        )}
      </div>

      {sheetOpen && (
        <div
          className="fixed inset-0 z-[1110] flex items-end justify-center bg-black/60"
          style={{ animation: "ifnSheetFade 180ms ease-out" }}
          onClick={(event) => {
            event.stopPropagation();
            setSheetClosing(true);
            window.setTimeout(() => {
              setSheetOpen(false);
              setSheetClosing(false);
            }, 220);
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl border-t border-[#262626] bg-[#111113] px-5 pb-9 pt-3"
            style={{
              animation: `${sheetClosing ? "ifnSheetDown" : "ifnSheetUp"} 220ms ease-out forwards`,
            }}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#3a3a3d]" />
            <div className="mb-4 text-center text-lg font-black text-white">
              Share Image
            </div>

            <div className="mb-6 overflow-hidden rounded-xl border border-[#262626] bg-[#050505]">
              {previewUrl ? (
                <img src={previewUrl} alt="Team card preview" className="block w-full" />
              ) : (
                <div className="flex h-44 items-center justify-center text-sm font-bold text-[#8f939d]">
                  {busy === "preview" ? "Generating preview…" : "Preview unavailable"}
                </div>
              )}
            </div>

            <div className="flex items-start justify-center gap-9">
              <ActionButton label="Share" color="#0284c7" onClick={handleShare} busy={busy === "share"}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                  <path d="M16 6l-4-4-4 4" />
                  <path d="M12 2v14" />
                </svg>
              </ActionButton>
              <ActionButton label="Copy" color="#0284c7" onClick={handleCopy} busy={busy === "copy"}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </ActionButton>
              <ActionButton label="Save" color="#0284c7" onClick={handleSave} busy={busy === "save"}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12" />
                  <path d="M7 10l5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
