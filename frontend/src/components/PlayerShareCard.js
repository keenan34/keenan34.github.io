import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { toBlob } from "html-to-image";
import { getPlayerHashtags } from "./playerHashtags";
import { useStableImage } from "./useStableImage";

const slugify = (name) =>
  String(name || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const playerPagePath = (season, player) => {
  const slug = player?.slug || slugify(player?.Player);
  if (!slug) return null;
  return season ? `/season/${season}/player/${slug}` : `/player/${slug}`;
};

function photoInitials(name) {
  return String(name || "").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function CardPhoto({ imgUrl, name }) {
  const shown = useStableImage(imgUrl, { crossOrigin: "anonymous" });
  return (
    <span className="relative grid h-16 w-16 flex-none place-items-center rounded-full bg-[#1f1f22] text-center text-xl font-black leading-none tracking-wide text-[#9ca3af] overflow-hidden">
      {shown ? (
        <img src={shown} alt={name} crossOrigin="anonymous"
          className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        photoInitials(name)
      )}
    </span>
  );
}

function StripPhoto({ imgUrl, name, selected, onClick }) {
  const shown = useStableImage(imgUrl, { crossOrigin: "anonymous" });
  return (
    <button type="button" onClick={onClick}
      className="relative flex h-[62px] w-[58px] flex-none flex-col items-center justify-end pb-1.5"
      aria-label={name}
    >
      <span className="relative grid h-12 w-12 place-items-center rounded-full bg-[#1f1f22] text-xs font-black leading-none text-[#9ca3af] overflow-hidden">
        {shown ? (
          <img src={shown} alt="" crossOrigin="anonymous"
            className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          photoInitials(name)
        )}
      </span>
      {selected && <span className="absolute bottom-0 h-1 w-full bg-[#0284c7]" />}
    </button>
  );
}

function MiniPhoto({ imgUrl, name }) {
  const shown = useStableImage(imgUrl);
  return (
    <span className="relative grid h-9 w-9 flex-none place-items-center rounded-full bg-[#1f1f22] text-xs font-black leading-none text-[#9ca3af] overflow-hidden">
      {shown ? (
        <img src={shown} alt={name} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        photoInitials(name)
      )}
    </span>
  );
}

function BigStat({ value, label }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-3xl font-black leading-none text-white">{value}</span>
      <span className="text-lg font-medium lowercase text-[#8f939d]">{label}</span>
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

// --- play-by-play helpers (events carry stat deltas from the box-score API) ---
function eventMatchesPlayer(event, player) {
  if (player?.id != null && event.playerId != null) {
    return event.playerId === player.id;
  }
  return event.playerName === player?.Player;
}

const isMadeShotEvent = (event) => Number(event.points) > 0;
const isAssistEvent = (event) =>
  Number(event.assists) > 0 &&
  Number(event.points) === 0 &&
  Number(event.fga) === 0;

// Describe a single event as a play row { title, value }, or null if not notable.
function playFromEvent(event) {
  const points = Number(event.points);
  const ftm = Number(event.ftm);
  const fta = Number(event.fta);
  const fga = Number(event.fga);
  const threePa = Number(event.threePa);
  const rebounds = Number(event.rebounds);
  const assists = Number(event.assists);
  const stealsBlocks = Number(event.stealsBlocks);
  const turnovers = Number(event.turnovers);

  if (points > 0) {
    const title =
      ftm > 0 ? "Free throw" : points === 3 ? "3PT bucket" : "2PT bucket";
    return { title, value: `+${points}` };
  }
  if (fta > 0 && ftm === 0) return { title: "Missed free throw", value: "" };
  if (fga > 0) {
    return { title: threePa > 0 ? "Missed 3PT shot" : "Missed 2PT shot", value: "" };
  }
  if (rebounds > 0) return { title: "Rebound", value: "" };
  if (assists > 0) return { title: "Assist", value: "" };
  if (stealsBlocks > 0) return { title: "Steal / block", value: "" };
  if (turnovers > 0) return { title: "Turnover", value: "" };
  return null;
}

// Link each assist event to the made shot it set up (mirrors the admin feed
// logic). Returns a map of eventId -> { role, otherName } so plays can show the
// connected player: the scorer on an assist, or the passer on a made shot.
function buildAssistLinks(events) {
  const desc = [...events].reverse();
  const links = new Map();

  for (let i = 0; i < desc.length; i += 1) {
    const assist = desc[i];
    const scorer = desc[i + 1];
    if (
      isAssistEvent(assist) &&
      scorer &&
      isMadeShotEvent(scorer) &&
      assist.teamId === scorer.teamId
    ) {
      links.set(assist.id, { role: "assist", otherName: scorer.playerName });
      links.set(scorer.id, { role: "scored", otherName: assist.playerName });
      i += 1;
    }
  }

  return links;
}

// Pair each assist with the made shot it set up (mirrors the admin feed logic),
// then return the current player's assists grouped by the teammate who scored.
function assistBreakdown(events, player, teamPlayers) {
  const desc = [...events].reverse();
  const counts = new Map();

  for (let i = 0; i < desc.length; i += 1) {
    const assist = desc[i];
    const scorer = desc[i + 1];
    if (
      isAssistEvent(assist) &&
      eventMatchesPlayer(assist, player) &&
      scorer &&
      isMadeShotEvent(scorer) &&
      assist.teamId === scorer.teamId
    ) {
      const key = scorer.playerId ?? scorer.playerName;
      const entry = counts.get(key) || {
        name: scorer.playerName,
        playerId: scorer.playerId,
        assists: 0,
        points: 0,
      };
      entry.assists += 1;
      entry.points += Number(scorer.points) || 0;
      counts.set(key, entry);
      i += 1;
    }
  }

  return Array.from(counts.values())
    .map((entry) => {
      const teammate = teamPlayers.find(
        (mate) =>
          (entry.playerId != null && mate.id === entry.playerId) ||
          mate.Player === entry.name
      );
      return {
        ...entry,
        imgUrl: teammate?.imgUrl,
      };
    })
    .sort((a, b) => b.points - a.points || b.assists - a.assists);
}

// One player's card (profile + assist breakdown + plays). Rendered three across
// in the swipe track so a drag reveals the neighbouring player taped alongside.
function CardBody({
  player,
  imgUrl,
  events = [],
  teamPlayers = [],
  date,
  opponentName,
  season,
  teamScore,
  opponentScore,
  cardRef,
  onShare,
}) {
  const [showAllPlays, setShowAllPlays] = useState(false);
  useEffect(() => {
    setShowAllPlays(false);
  }, [player?.Player]);

  const assists = assistBreakdown(events, player, teamPlayers);
  const assistLinks = buildAssistLinks(events);
  const plays = events
    .filter((event) => eventMatchesPlayer(event, player))
    .map((event) => {
      const play = playFromEvent(event);
      if (!play) return { id: event.id };
      const link = assistLinks.get(event.id);
      let subtitle = "";
      if (link?.role === "assist") subtitle = `Bucket by ${link.otherName}`;
      else if (link?.role === "scored") subtitle = `Assisted by ${link.otherName}`;
      return { ...play, id: event.id, subtitle };
    })
    .filter((play) => play.title)
    .reverse(); // most recent first
  const visiblePlays = showAllPlays ? plays : plays.slice(0, 3);
  const isDnp = player?.Points == null;

  const grid = [
    { label: "PTS", value: player.Points ?? 0, strong: true },
    { label: "REB", value: player.REB ?? 0, strong: true },
    { label: "AST", value: player.AST ?? 0, strong: true },
    { label: "STK", value: player["STLS/BLKS"] ?? 0 },
    { label: "TO", value: player.TOs ?? 0 },
    { label: "PF", value: player.Fouls ?? 0 },
    { label: "FG", value: `${player.FGM ?? 0}/${player.FGA ?? 0}` },
    { label: "FG%", value: player["FG %"] ?? 0 },
    { label: "2FG", value: `${player["2 PTM"] ?? 0}/${player["2 PTA"] ?? 0}` },
    { label: "2FG%", value: player["2 Pt %"] ?? 0 },
    { label: "3FG", value: `${player["3 PTM"] ?? 0}/${player["3 PTA"] ?? 0}` },
    { label: "3FG%", value: player["3 Pt %"] ?? 0 },
    { label: "FT", value: `${player.FTM ?? 0}/${player.FTA ?? 0}` },
    { label: "FT%", value: player["FT %"] ?? 0 },
  ];

  const hasScore =
    typeof teamScore === "number" && typeof opponentScore === "number";
  const seasonNumber = String(season || "").match(/\d+/)?.[0];
  const playerLink = playerPagePath(season, player);
  const playerHashtags = getPlayerHashtags(player, {
    teamScore,
    opponentScore,
    careerHigh: player.careerHigh === true,
    limit: 4,
  });

  return (
    <>
      <div
        ref={cardRef}
        className="ifn-export-card bg-[#050505] px-4 pb-5 text-white"
      >
        <div className="ifn-export-profile relative border-b border-[#1f1f22] py-5 pl-[76px]">
          {playerLink ? (
            <Link
              to={playerLink}
              className="ifn-export-photo absolute left-0 top-5"
              aria-label={`Open ${player.Player} player page`}
            >
              <CardPhoto imgUrl={imgUrl} name={player.Player} />
            </Link>
          ) : (
            <span className="ifn-export-photo absolute left-0 top-5">
              <CardPhoto imgUrl={imgUrl} name={player.Player} />
            </span>
          )}
          <div className="min-w-0 pr-12">
            {playerLink ? (
              <Link
                to={playerLink}
                className="block truncate text-[17px] font-medium leading-tight text-[#d6d8df] hover:text-white"
              >
                {player.Player}
              </Link>
            ) : (
              <div className="truncate text-[17px] font-medium leading-tight text-[#d6d8df]">
                {player.Player}
              </div>
            )}
            {isDnp ? (
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black leading-none text-white">DNP</span>
                <span className="text-sm font-medium italic text-[#8f939d]">did not play</span>
              </div>
            ) : (
              <div className="mt-2 flex items-end gap-4">
                <BigStat value={player.Points ?? 0} label="pts" />
                <BigStat value={player.REB ?? 0} label="reb" />
                <BigStat value={player.AST ?? 0} label="ast" />
              </div>
            )}
          </div>
        </div>

        <div className="ifn-export-matchup mt-2 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-baseline gap-2">
            {date && (
              <span className="flex-none text-xs font-medium italic text-[#8f939d]">
                {date}
              </span>
            )}
            {opponentName && (
              <span className="truncate text-base font-bold text-[#d6d8df]">
                vs {opponentName}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onShare}
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
            <span className="ifn-capture-brand text-sm font-black text-white">
              ifnbl.com
            </span>
          </button>
        </div>

        {playerHashtags.length > 0 && (
          <div className="ifn-export-tags mt-6 flex flex-wrap gap-x-6 gap-y-2 text-lg font-black text-[#0284c7]">
            {playerHashtags.map((hashtag) => (
              <span key={hashtag}>{hashtag}</span>
            ))}
          </div>
        )}

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
              {teamScore}-{opponentScore}
            </div>
          )}
        </div>

        {!isDnp && (
          <div className="ifn-export-stats mt-3 grid grid-cols-6 gap-x-2 gap-y-3">
            {grid.map((cell) => (
              <div className="flex min-w-0 flex-col items-start" key={cell.label}>
                <span
                  className={`font-black leading-none text-white ${
                    cell.strong ? "text-[22px]" : "text-[19px]"
                  }`}
                >
                  {cell.value}
                </span>
                <span className="mt-1 text-[11px] font-black uppercase leading-none text-[#777b86]">
                  {cell.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {assists.length > 0 && (
        <div className="mt-6 border-t border-[#1f1f22] px-4 pt-5">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-[15px] font-black text-[#d6d8df]">
              Assist breakdown
            </span>
            <span className="text-sm font-bold text-[#8f939d]">
              {assists.reduce((sum, row) => sum + row.assists, 0)} ast
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {assists.map((row) => (
              <div
                key={row.playerId ?? row.name}
                className="flex items-center gap-3"
              >
                <MiniPhoto imgUrl={row.imgUrl} name={row.name} />
                <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#d6d8df]">
                  {row.name}
                </span>
                {row.points != null && (
                  <span className="text-sm font-medium text-[#8f939d]">
                    {row.points} pts
                  </span>
                )}
                <span className="w-12 text-right text-sm font-black text-[#0284c7]">
                  {row.assists} ast
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {plays.length > 0 && (
        <div className="mt-6 border-t border-[#1f1f22] px-4 pt-5">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-[15px] font-black text-[#d6d8df]">Plays</span>
            {plays.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllPlays((value) => !value)}
                className="text-sm font-bold text-[#0284c7]"
              >
                {showAllPlays ? "Show less" : "View all"}
              </button>
            )}
          </div>
          <div className="flex flex-col">
            {visiblePlays.map((play) => (
              <div
                key={play.id}
                className="flex items-center justify-between gap-3 border-b border-[#161618] py-2.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="text-[15px] font-medium text-[#d6d8df]">
                    {play.title}
                  </div>
                  {play.subtitle && (
                    <div className="mt-0.5 truncate text-xs font-medium text-[#8f939d]">
                      {play.subtitle}
                    </div>
                  )}
                </div>
                {play.value && (
                  <span className="flex-none text-sm font-black text-white">
                    {play.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
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
  season,
  teamPlayers = [],
  events = [],
  onSelectPlayer,
  onClose,
}) {
  const cardRef = useRef(null);
  const blobRef = useRef(null);
  const playerSlideRef = useRef(false);
  const drag = useRef(null);
  const scrollRef = useRef(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetClosing, setSheetClosing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [closing, setClosing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [sliding, setSliding] = useState(false); // true => animate transform

  useEffect(() => {
    setSheetOpen(false);
    blobRef.current = null;
    setPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return "";
    });
  }, [player?.Player]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const canSwipe = teamPlayers.length > 1;
  const currentIndex = teamPlayers.findIndex(
    (teammate) => teammate.Player === player.Player
  );
  const count = teamPlayers.length;
  const prevPlayer =
    canSwipe && currentIndex >= 0
      ? teamPlayers[(currentIndex - 1 + count) % count]
      : null;
  const nextPlayer =
    canSwipe && currentIndex >= 0
      ? teamPlayers[(currentIndex + 1) % count]
      : null;

  const slideWidth = () => scrollRef.current?.clientWidth || window.innerWidth || 360;

  // direction: +1 => advance to next (track slides left), -1 => previous.
  function slideToPlayer(target, direction) {
    if (!target || playerSlideRef.current) return;

    playerSlideRef.current = true;
    setSliding(true);
    setOffset(-direction * slideWidth()); // slide the neighbour fully into view
    window.setTimeout(() => {
      // The neighbour slide already shows `target`, so swap it into the centre
      // and snap the track back with no transition — visually seamless.
      setSliding(false);
      setOffset(0);
      onSelectPlayer?.(target);
      playerSlideRef.current = false;
    }, 200);
  }

  function selectByOffset(step) {
    if (currentIndex < 0 || !canSwipe) return;
    const nextIndex =
      (currentIndex + step + teamPlayers.length) % teamPlayers.length;
    slideToPlayer(teamPlayers[nextIndex], step);
  }

  function handlePlayerClick(teammate) {
    const nextIndex = teamPlayers.findIndex(
      (candidate) => candidate.Player === teammate.Player
    );
    if (nextIndex < 0 || nextIndex === currentIndex) return;

    const len = teamPlayers.length;
    const fwd = (nextIndex - currentIndex + len) % len;
    const bwd = (currentIndex - nextIndex + len) % len;
    const dist = Math.min(fwd, bwd);

    if (dist === 1) {
      slideToPlayer(teammate, fwd <= bwd ? 1 : -1);
    } else {
      onSelectPlayer?.(teammate);
    }
  }

  function handleTouchStart(event) {
    if (!canSwipe || playerSlideRef.current) return;
    const touch = event.touches[0];
    drag.current = { x: touch.clientX, y: touch.clientY, active: false };
    setSliding(false);
  }

  function handleTouchMove(event) {
    if (!drag.current) return;
    const touch = event.touches[0];
    const dx = touch.clientX - drag.current.x;
    const dy = touch.clientY - drag.current.y;
    // lock to horizontal once the gesture is clearly sideways
    if (!drag.current.active) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dx) < Math.abs(dy)) {
        drag.current = null; // vertical scroll — let it through
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
      const dir = dx < 0 ? 1 : -1; // swipe left -> next
      selectByOffset(dir);
    } else {
      setSliding(true);
      setOffset(0); // snap back
    }
  }

  async function capture() {
    const source = cardRef.current;
    if (!source) return null;

    // Render with html-to-image (SVG <foreignObject>), which rasterizes via the
    // browser's own layout engine. Unlike html2canvas it positions the Inter
    // webfont exactly like the live page (html2canvas misreads Inter's vertical
    // metrics and drops text a few px low) and embeds the font + images itself.
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (err) {
        /* ignore */
      }
    }

    // Capture from a detached clone instead of the live card, so applying the
    // export-only `is-capturing` styles (padding/radius/border) never reflows
    // the card the user is looking at behind the share sheet.
    const clone = source.cloneNode(true);
    clone.classList.add("is-capturing");
    const holder = document.createElement("div");
    holder.style.cssText =
      "position:fixed;left:-10000px;top:0;pointer-events:none;";
    holder.style.width = `${source.offsetWidth}px`;
    holder.appendChild(clone);
    document.body.appendChild(holder);

    try {
      // iOS can paint the card before its profile image has been decoded. Wait
      // for every usable image in the clone so html-to-image embeds it.
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
      // html-to-image inlines remote images lazily, so the first pass often
      // drops the profile photo (it embeds it into its cache only as it runs).
      // A throwaway warm-up pass guarantees the real capture has the photo.
      await toBlob(clone, options);
      return await toBlob(clone, options);
    } finally {
      holder.remove();
    }
  }

  // Capture once per player and reuse the same image for preview + actions.
  async function getBlob() {
    if (blobRef.current) return blobRef.current;
    const blob = await capture();
    blobRef.current = blob;
    return blob;
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

  async function openShareSheet() {
    setSheetClosing(false);
    setSheetOpen(true);
    setBusy("preview");
    try {
      // Let the sheet finish sliding up before the heavy capture runs, so the
      // open animation stays smooth instead of janking mid-slide.
      await new Promise((resolve) => window.setTimeout(resolve, 260));
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

  function closeShareSheet() {
    setSheetClosing(true);
    window.setTimeout(() => {
      setSheetOpen(false);
      setSheetClosing(false);
    }, 220);
  }

  function closeWithAnimation() {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 180);
  }

  async function handleShare() {
    setBusy("share");
    try {
      const blob = await getBlob();
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
        (!window.ClipboardItem.supports ||
          window.ClipboardItem.supports("image/png"));

      if (navigator.clipboard && supportsPngClipboard) {
        await navigator.clipboard.write([
          new window.ClipboardItem({ "image/png": blobPromise }),
        ]);
        flash("Copied image");
      } else {
        const blob = await blobPromise;
        const file = new File([blob], fileName(), { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `${player.Player} stats` });
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
            await navigator.share({ files: [file], title: `${player.Player} stats` });
            flash("Shared image");
            return;
          } catch (shareErr) {
            if (shareErr?.name === "AbortError") return;
          }
        }

        flash("Copy unavailable");
        return;
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
    } finally {
      setBusy("");
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex flex-col overflow-hidden bg-[#050505] text-white"
      style={{
        animation: `${closing ? "ifnPlayerSlideOut" : "ifnPlayerSlideIn"} 180ms ease-out forwards`,
      }}
      onClick={closeWithAnimation}
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
          .ifn-capture-brand { display: none; }
          .is-capturing .ifn-share-icon { display: none; }
          .is-capturing .ifn-capture-brand { display: inline; }
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
          .is-capturing .ifn-export-tags {
            margin-top: 10px;
            column-gap: 14px;
            row-gap: 4px;
            font-size: 15px;
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
        className="flex h-[74px] min-h-[74px] flex-none items-center gap-3 border-b border-[#1f1f22] bg-[#151515] px-3"
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
          {teamPlayers.map((teammate) => (
            <StripPhoto
              key={teammate.Player}
              imgUrl={teammate.imgUrl}
              name={teammate.Player}
              selected={teammate.Player === player.Player}
              onClick={() => handlePlayerClick(teammate)}
            />
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex w-full items-start"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translateX(calc(-100% + ${offset}px))`,
            transition: sliding ? "transform 200ms ease-out" : "none",
          }}
        >
          <div className="w-full flex-none">
            <div className="mx-auto w-full max-w-md pb-8 pt-4">
              {prevPlayer && (
                <CardBody
                  player={prevPlayer}
                  imgUrl={prevPlayer.imgUrl}
                  events={events}
                  teamPlayers={teamPlayers}
                  date={date}
                  opponentName={opponentName}
                  season={season}
                  teamScore={teamScore}
                  opponentScore={opponentScore}
                />
              )}
            </div>
          </div>

          <div className="w-full flex-none">
            <div className="mx-auto w-full max-w-md pb-8 pt-4">
              <CardBody
                player={player}
                imgUrl={imgUrl}
                events={events}
                teamPlayers={teamPlayers}
                date={date}
                opponentName={opponentName}
                season={season}
                teamScore={teamScore}
                opponentScore={opponentScore}
                cardRef={cardRef}
                onShare={openShareSheet}
              />
            </div>
          </div>

          <div className="w-full flex-none">
            <div className="mx-auto w-full max-w-md pb-8 pt-4">
              {nextPlayer && (
                <CardBody
                  player={nextPlayer}
                  imgUrl={nextPlayer.imgUrl}
                  events={events}
                  teamPlayers={teamPlayers}
                  date={date}
                  opponentName={opponentName}
                  season={season}
                  teamScore={teamScore}
                  opponentScore={opponentScore}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {sheetOpen && (
        <div
          className="fixed inset-0 z-[1110] flex items-end justify-center bg-black/60"
          style={{ animation: "ifnSheetFade 180ms ease-out" }}
          onClick={(event) => {
            event.stopPropagation();
            closeShareSheet();
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
                <img
                  src={previewUrl}
                  alt="Stat card preview"
                  className="block w-full"
                />
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

            {notice && (
              <div className="mt-4 text-center text-xs font-bold text-white/80">
                {notice}
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
