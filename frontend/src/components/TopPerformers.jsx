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
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f8fafc] text-xs font-black text-[#64748b]">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setError(true)}
      className="h-10 w-10 rounded-full object-cover"
    />
  );
}

// Skeleton that mirrors the real card layout so loading fades in smoothly
// instead of popping from a bare text line into a full card.
function TopPerformersSkeleton({ label }) {
  return (
    <div className="mx-auto mb-4 max-w-5xl animate-pulse rounded-lg border border-[#e2e8f0] bg-[#ffffff] p-4 shadow-sm">
      <div className="mb-4 h-6 w-56 rounded bg-[#e2e8f0]" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4"
          >
            <div className="mb-3 h-4 w-32 rounded bg-[#e2e8f0]" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex-none rounded-full bg-[#e2e8f0]" />
              <div className="flex flex-col gap-1.5">
                <div className="h-3.5 w-28 rounded bg-[#e2e8f0]" />
                <div className="h-3 w-20 rounded bg-[#e2e8f0]" />
                <div className="h-3 w-16 rounded bg-[#e2e8f0]" />
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

    if (status === "missing") {
      return (
        <div className="mb-2 rounded-lg border border-[#e2e8f0] bg-[#ffffff] p-4 shadow-sm">
          <div className="text-sm font-bold text-[#64748b]">
            Top Performers not available for{" "}
            <span className="font-black text-[#0f172a]">{displayWeek}</span> yet.
          </div>
        </div>
      );
    }

    return (
      <div className="mb-2 rounded-lg border border-[#e2e8f0] bg-[#ffffff] p-4 shadow-sm">
        <div className="text-sm font-bold text-[#64748b]">
          Top Performers not available for{" "}
          <span className="font-black text-[#0f172a]">{displayWeek}</span> yet.
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

  const statLabels = {
    Points: "Points",
    REB: "Rebounds",
    "3 PTM": "Threes Made",
    "STLS/BLKS": "Steals/Blocks",
  };

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
    <div className="ifn-fade-in mx-auto mb-4 max-w-5xl rounded-lg border border-[#e2e8f0] bg-[#ffffff] p-4 shadow-sm">
      <h2 className="mb-4 text-xl font-black text-[#0f172a]">
        Top Performers ({displayWeek})
      </h2>

      <div className="flex flex-col gap-2">
        {[
          { label: "Scoring Week Leader", stat: "Points", list: topScorers },
          { label: "Rebound Week Leader", stat: "REB", list: topRebounders },
          { label: "3PTM Week Leader", stat: "3 PTM", list: top3PT },
          { label: "STL/BLK Week Leader", stat: "STLS/BLKS", list: topStlBlks },
        ].map(({ label, stat, list }) => (
          <div
            key={stat}
            className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 transition-colors hover:border-[#0284c7]"
          >
            <div className="mb-2 text-sm font-black text-[#64748b]">{label}</div>

            <div className="flex flex-wrap gap-4">
              {list.map((player) => {
                return (
                  <Link
                    key={`${stat}-${player.Player}`}
                    to={playerLink(player)}
                    className="flex items-center rounded-md p-1 transition hover:bg-[#ffffff]"
                  >
                    <ProfileImage name={player.Player} season={activeSeason} />
                      <div className="ml-2">
                      <div className="text-sm font-black text-[#0f172a]">
                        {player.Player}
                      </div>
                      <div className="text-xs font-bold italic text-[#64748b]">
                        vs {player.opponent}
                      </div>
                      <div className="text-xs font-bold text-[#0284c7]">
                        {safeNum(getStat(player, stat))} {statLabels[stat]}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
