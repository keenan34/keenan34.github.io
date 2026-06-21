import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";

function CardPhoto({ imgUrl, name }) {
  const [error, setError] = useState(false);
  const initials = String(name || "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!imgUrl || error) {
    return (
      <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-[#1f1f22] text-sm font-black text-[#9ca3af]">
        {initials}
      </span>
    );
  }

  return (
    <img
      src={imgUrl}
      alt={name}
      crossOrigin="anonymous"
      onError={() => setError(true)}
      className="h-14 w-14 flex-none rounded-full object-cover"
    />
  );
}

function BigStat({ value, label }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-3xl font-black leading-none text-white">{value}</span>
      <span className="text-xs font-black uppercase text-[#9ca3af]">{label}</span>
    </div>
  );
}

function ActionButton({ label, color, onClick, busy, children }) {
  return (
    <button onClick={onClick} type="button" className="flex flex-col items-center gap-1.5">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md transition active:scale-95"
        style={{ background: color, opacity: busy ? 0.6 : 1 }}
      >
        {children}
      </span>
      <span className="text-[11px] font-bold text-[#9ca3af]">{busy ? "..." : label}</span>
    </button>
  );
}

export default function PlayerShareCard({
  player,
  imgUrl,
  teamName,
  opponentName,
  teamScore,
  opponentScore,
  date,
  onClose,
}) {
  const cardRef = useRef(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const grid = [
    { label: "PTS", value: player.Points ?? 0 },
    { label: "REB", value: player.REB ?? 0 },
    { label: "AST", value: player.AST ?? 0 },
    { label: "STK", value: player["STLS/BLKS"] ?? 0 },
    { label: "TO", value: player.TOs ?? 0 },
    { label: "PF", value: player.Fouls ?? 0 },
    { label: "FG", value: `${player.FGM ?? 0}/${player.FGA ?? 0}` },
    { label: "FG%", value: player["FG %"] ?? 0 },
    { label: "2FG", value: `${player["2 PTM"] ?? 0}/${player["2 PTA"] ?? 0}` },
    { label: "3FG", value: `${player["3 PTM"] ?? 0}/${player["3 PTA"] ?? 0}` },
    { label: "3FG%", value: player["3 Pt %"] ?? 0 },
    { label: "FT", value: `${player.FTM ?? 0}/${player.FTA ?? 0}` },
  ];

  const hasScore =
    typeof teamScore === "number" && typeof opponentScore === "number";

  async function capture() {
    if (!cardRef.current) return null;
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: "#0b0b0c",
      scale: 2,
      useCORS: true,
    });
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }

  function fileName() {
    const slug = String(player.Player || "player")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    return `${slug}_stats.png`;
  }

  function downloadBlob(blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName();
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function flash(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 1800);
  }

  async function handleShare() {
    setBusy("share");
    try {
      const blob = await capture();
      if (!blob) return;
      const file = new File([blob], fileName(), { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${player.Player} stats` });
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
      const blob = await capture();
      if (!blob) return;
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new window.ClipboardItem({ "image/png": blob }),
        ]);
        flash("Copied image");
      } else {
        downloadBlob(blob);
        flash("Saved image");
      }
    } catch (err) {
      flash("Copy failed");
    } finally {
      setBusy("");
    }
  }

  async function handleSave() {
    setBusy("save");
    try {
      const blob = await capture();
      if (blob) {
        downloadBlob(blob);
        flash("Saved image");
      }
    } finally {
      setBusy("");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-black/85 px-4 py-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="mb-3 self-end text-2xl font-black text-white/80 hover:text-white"
        aria-label="Close"
      >
        &times;
      </button>

      <div
        className="w-full max-w-sm"
        onClick={(event) => event.stopPropagation()}
      >
        {/* shareable card */}
        <div
          ref={cardRef}
          className="rounded-2xl border border-[#262626] bg-[#0b0b0c] p-5 text-white"
        >
          <div className="flex items-center gap-3">
            <CardPhoto imgUrl={imgUrl} name={player.Player} />
            <div className="min-w-0 flex-1">
              <div className="break-words pb-1 text-base font-black leading-snug">
                {player.Player}
              </div>
              <div className="text-xs font-bold text-[#9ca3af]">{teamName}</div>
            </div>
            {hasScore && (
              <div className="text-sm font-black text-[#f87171]">
                {teamScore}-{opponentScore}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-end gap-5">
            <BigStat value={player.Points ?? 0} label="pts" />
            <BigStat value={player.REB ?? 0} label="reb" />
            <BigStat value={player.AST ?? 0} label="ast" />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-[#6b7280]">
            <span>
              {opponentName ? `vs ${opponentName}` : ""}
              {date ? ` · ${date}` : ""}
            </span>
            <span className="font-black text-[#9ca3af]">ifnbl.com</span>
          </div>

          <div className="mt-4 grid grid-cols-6 gap-y-4 border-t border-[#262626] pt-4">
            {grid.map((cell) => (
              <div className="flex flex-col items-center" key={cell.label}>
                <span className="text-[15px] font-black leading-none text-white">
                  {cell.value}
                </span>
                <span className="mt-1 text-[9px] font-bold uppercase leading-none text-[#6b7280]">
                  {cell.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* actions */}
        <div className="mt-6 flex items-start justify-center gap-7">
          <ActionButton label="Share" color="#ef4444" onClick={handleShare} busy={busy === "share"}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
              <path d="M16 6l-4-4-4 4" />
              <path d="M12 2v14" />
            </svg>
          </ActionButton>
          <ActionButton label="Copy" color="#ef4444" onClick={handleCopy} busy={busy === "copy"}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </ActionButton>
          <ActionButton label="Save" color="#ef4444" onClick={handleSave} busy={busy === "save"}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <path d="M7 10l5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
          </ActionButton>
        </div>

        {notice && (
          <div className="mt-3 text-center text-xs font-bold text-white/80">{notice}</div>
        )}
      </div>
    </div>
  );
}
