// File: src/components/TopPerformers.jsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSeasonGames, getWeekPlayerStats } from "../api/client";

const EXCLUDED_PLAYERS = [
  "Josiah",
  "Danial Asim",
  "Ibrahim",
  "Salman",
  "Devon",
  "Sufyan",
  "Raedh Talha",
  "Saif Rehman",
  "Amaar Zafar",
];

const PUBLIC_URL = process.env.PUBLIC_URL || "";

const normalizeName = (s = "") => String(s).trim();

const playerSlug = (name) =>
  name === "Jerremiah Dujuan Wright"
    ? "dujuan_wright"
    : String(name || "")
        .toLowerCase()
        .split(" ")
        .map((w) => w.replace(/[^\w]/g, ""))
        .join("_");
const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const isFinishedGame = (g) =>
  g?.status === "final" || g?.status === "finished";

// Latest week number whose games are ALL completed (e.g. show Week 2 once
// every Week 2 game is final). Returns null if no week is fully completed.
function latestCompletedWeek(games) {
  const byWeek = {};
  (Array.isArray(games) ? games : []).forEach((g) => {
    const m =
      typeof g?.gameId === "string" ? g.gameId.match(/^week(\d+)-/i) : null;
    if (!m) return;
    const wk = Number(m[1]);
    if (!byWeek[wk]) byWeek[wk] = { total: 0, done: 0 };
    byWeek[wk].total += 1;
    if (isFinishedGame(g)) byWeek[wk].done += 1;
  });

  const completed = Object.keys(byWeek)
    .map(Number)
    .filter((wk) => byWeek[wk].total > 0 && byWeek[wk].done === byWeek[wk].total)
    .sort((a, b) => b - a);

  return completed.length ? completed[0] : null;
}

// allow alt keys if you ever change format
const STAT_KEYS = {
  Points: ["Points", "PTS", "points"],
  REB: ["REB", "Reb", "rebounds"],
  "3 PTM": ["3 PTM", "3PM", "3ptm"],
  "STLS/BLKS": ["STLS/BLKS", "STL/BLK", "stocks"],
};

function getStat(p, stat) {
  const keys = STAT_KEYS[stat] || [stat];
  for (const k of keys) {
    if (p && p[k] != null) return p[k];
  }
  return null;
}

function isDNPRow(p) {
  // DNP if Points AND the common stats are all null
  const checks = [
    getStat(p, "Points"),
    p?.FGM,
    p?.FGA,
    getStat(p, "REB"),
    p?.TOs,
    p?.Fouls,
    getStat(p, "3 PTM"),
    getStat(p, "STLS/BLKS"),
  ];
  return checks.every((v) => v == null);
}

function ProfileImage({ name, season }) {
  const [error, setError] = useState(false);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("");

  const overrideFileMap = {
    "Jerremiah Dujuan Wright": "dujuan_wright.png",
  };

  const fileName =
    overrideFileMap[name] ||
    name
      .toLowerCase()
      .split(" ")
      .map((n) => n.replace(/[^\w]/g, ""))
      .join("_") + ".png";

  const src = `${PUBLIC_URL}/seasons/${season}/images/players/${fileName}`;

  if (error) {
    return (
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#101820] text-xs font-black text-[color:var(--muted)] ring-2 ring-[color:var(--border)]">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setError(true)}
      className="h-12 w-12 flex-shrink-0 rounded-full object-cover ring-2 ring-[color:var(--border)]"
      loading="lazy"
    />
  );
}

// Skeleton that mirrors the real card layout so loading fades in smoothly
// instead of popping from a bare text line into a full card.
function TopPerformersSkeleton({ label }) {
  return (
    <div className="mx-auto mb-4 w-full max-w-5xl animate-pulse px-4 pt-8">
      <div className="mb-2 h-3 w-40 rounded bg-[#101820]" />
      <div className="mb-5 h-8 w-64 rounded bg-[#101820]" />
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((card) => (
          <div
            key={card}
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4"
          >
            <div className="mb-3 flex items-center justify-between border-b border-[color:var(--border)] pb-3">
              <div className="h-4 w-24 rounded bg-[#101820]" />
              <div className="h-9 w-14 rounded bg-[#101820]" />
            </div>
            <div className="flex items-center gap-3 p-2">
              <div className="h-12 w-12 flex-none rounded-full bg-[#101820]" />
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-32 rounded bg-[#101820]" />
                <div className="h-3 w-24 rounded bg-[#101820]" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading Top Performers ({label})…</span>
    </div>
  );
}

export default function TopPerformers({
  week, // optional explicit override, e.g. "week2". If omitted, auto-detect.
  label, // optional UI label override (ex: "Playoffs")
  showIfMissing = true,
}) {
  const { season } = useParams();
  const activeSeason = season || "szn5";

  // null = not resolved yet; number = chosen week; "none" = no completed week
  const [weekNum, setWeekNum] = useState(null);
  const [rows, setRows] = useState([]);
  const [games, setGames] = useState([]); // season schedule, for box-score links
  const [status, setStatus] = useState("loading"); // loading | ok | missing

  // UI label fallback
  const displayWeek =
    label ?? (typeof weekNum === "number" ? `Week ${weekNum}` : "this week");

  // Resolve which week to display, and keep the schedule for box-score links.
  useEffect(() => {
    let cancelled = false;

    setWeekNum(week ? parseInt(String(week).replace("week", ""), 10) : null);

    getSeasonGames(activeSeason)
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.games || [];
        if (cancelled) return;
        setGames(list);
        if (!week) {
          // "none" (not null) means resolved-but-empty, so the stats effect can
          // tell it apart from "still resolving" and not flash "not available".
          const wk = latestCompletedWeek(list);
          setWeekNum(wk == null ? "none" : wk);
        }
      })
      .catch(() => {
        if (!cancelled && !week) setWeekNum("none");
      });

    return () => {
      cancelled = true;
    };
  }, [activeSeason, week]);

  // Fetch player stats for the resolved week.
  useEffect(() => {
    let cancelled = false;
    setRows([]);

    if (weekNum == null) {
      // Week still being resolved — keep the skeleton, don't flash "missing".
      setStatus("loading");
      return () => {
        cancelled = true;
      };
    }

    if (weekNum === "none") {
      // Resolved: no fully-completed week to show.
      setStatus("missing");
      return () => {
        cancelled = true;
      };
    }

    setStatus("loading");

    getWeekPlayerStats(activeSeason, weekNum)
      .then((json) => {
        const all = [];
        Object.values(json || {}).forEach((game) => {
          const teamA = game?.teamA?.name || "";
          const teamB = game?.teamB?.name || "";

          // teamA is the home side, teamB the away side (see player-stats API).
          (Array.isArray(game?.teamA?.players)
            ? game.teamA.players
            : []
          ).forEach((p) =>
            all.push({ ...p, opponent: teamB, team: teamA, homeName: teamA, awayName: teamB })
          );
          (Array.isArray(game?.teamB?.players)
            ? game.teamB.players
            : []
          ).forEach((p) =>
            all.push({ ...p, opponent: teamA, team: teamB, homeName: teamA, awayName: teamB })
          );
        });

        const filtered = all.filter((p) => {
          const name = normalizeName(p?.Player);
          if (!name) return false;
          if (EXCLUDED_PLAYERS.includes(name)) return false;
          if (isDNPRow(p)) return false;
          return true;
        });

        if (!cancelled) {
          setRows(filtered);
          setStatus("ok");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("missing");
      });

    return () => {
      cancelled = true;
    };
  }, [activeSeason, weekNum, week]);

  if (!rows.length) {
    if (!showIfMissing) return null;

    if (status === "loading") {
      return <TopPerformersSkeleton label={displayWeek} />;
    }

    return (
      <div className="mx-auto mb-4 w-full max-w-5xl px-4 pt-8">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
          <div className="text-sm font-bold text-[color:var(--muted)]">
            Top performers for{" "}
            <span className="font-black text-white">{displayWeek}</span> will
            appear once every game is final.
          </div>
        </div>
      </div>
    );
  }

  const getTopPlayers = (stat) => {
    const max = Math.max(...rows.map((p) => safeNum(getStat(p, stat))));
    if (max <= 0) return [];
    return rows.filter((p) => safeNum(getStat(p, stat)) === max);
  };

  const topScorers = getTopPlayers("Points");
  const topRebounders = getTopPlayers("REB");
  const top3PT = getTopPlayers("3 PTM");
  const topStlBlks = getTopPlayers("STLS/BLKS");

  const seasonTag = (() => {
    const m = /^szn(\d+)$/i.exec(activeSeason || "");
    return m ? `Season ${m[1]}` : (activeSeason || "").toUpperCase();
  })();

  const leadersLink = season ? `/season/${activeSeason}/leaders` : "/leaders";

  // Box-score link for a player's week game: match the schedule by week +
  // home/away names, then land on that player's team tab. Falls back to the
  // player page if we can't resolve the game.
  const playerLink = (player) => {
    const playerPage = `/season/${activeSeason}/player/${playerSlug(player.Player)}`;
    const game = games.find((g) => {
      const m = typeof g.gameId === "string" ? g.gameId.match(/^week(\d+)-/i) : null;
      if (!m || Number(m[1]) !== weekNum) return false;
      return g.teamA === player.homeName && g.teamB === player.awayName;
    });
    if (!game?.gameId) return playerPage;

    const gameId = String(game.gameId);
    const sep = gameId.indexOf("-");
    if (sep <= 0 || sep >= gameId.length - 1) return playerPage;
    const weekPart = gameId.slice(0, sep);
    const idPart = gameId.slice(sep + 1);
    const teamQuery = player.team ? `?team=${encodeURIComponent(player.team)}` : "";
    return `/season/${activeSeason}/boxscore/${weekPart}/${idPart}${teamQuery}`;
  };

  return (
    <section className="ifn-fade-in mx-auto mb-4 w-full max-w-5xl px-4 pt-8 text-left">
      {/* Header */}
      <p className="text-[11px] font-black uppercase italic tracking-[0.3em] text-[#38bdf8]">
        {displayWeek} · {seasonTag}
      </p>
      <div className="mt-1 mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-3xl font-black italic tracking-tight text-white">
          Top Performers
        </h2>
        <Link
          to={leadersLink}
          className="rounded-full border border-transparent px-3 py-1.5 text-xs font-black uppercase italic tracking-wide text-[color:var(--muted)] transition hover:border-[color:var(--border)] hover:bg-[color:var(--panel)] hover:text-white"
        >
          Season leaders →
        </Link>
      </div>

      {/* Honors board */}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { label: "Points", stat: "Points", list: topScorers },
          { label: "Rebounds", stat: "REB", list: topRebounders },
          { label: "3PT Made", stat: "3 PTM", list: top3PT },
          { label: "Steals + Blocks", stat: "STLS/BLKS", list: topStlBlks },
        ].map(({ label, stat, list }) => {
          if (!list.length) return null;
          const value = safeNum(getStat(list[0], stat));

          return (
            <div
              key={stat}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4"
            >
              {/* Category + the week-best number (shared across ties) */}
              <div className="mb-2 flex items-center justify-between gap-3 border-b border-[color:var(--border)] pb-2">
                <h3 className="text-sm font-black uppercase italic tracking-[0.18em] text-white">
                  {label}
                </h3>
                <span className="ifn-display text-4xl leading-none text-[#38bdf8] tabular-nums">
                  {value}
                </span>
              </div>

              {list.map((player) => (
                <Link
                  key={`${stat}-${player.Player}`}
                  to={playerLink(player)}
                  className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-[#101820]"
                >
                  <ProfileImage name={player.Player} season={activeSeason} />
                  <div className="min-w-0">
                    <div className="truncate text-base font-black italic text-white">
                      {player.Player}
                    </div>
                    <div className="truncate text-xs font-semibold text-[color:var(--muted)]">
                      {player.team ? `${player.team} · ` : ""}vs {player.opponent}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
