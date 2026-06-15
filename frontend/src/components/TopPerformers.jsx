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
  const [status, setStatus] = useState("loading"); // loading | ok | missing

  // UI label fallback
  const displayWeek =
    label ?? (typeof weekNum === "number" ? `Week ${weekNum}` : "this week");

  // Resolve which week to display.
  useEffect(() => {
    let cancelled = false;

    if (week) {
      // Explicit override.
      setWeekNum(parseInt(String(week).replace("week", ""), 10));
      return () => {
        cancelled = true;
      };
    }

    setWeekNum(null);
    getSeasonGames(activeSeason)
      .then((data) => {
        const games = Array.isArray(data) ? data : data?.games || [];
        if (!cancelled) setWeekNum(latestCompletedWeek(games));
      })
      .catch(() => {
        if (!cancelled) setWeekNum(null);
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
      // No fully-completed week yet (or still resolving).
      setStatus(week ? "loading" : "missing");
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

          (Array.isArray(game?.teamA?.players)
            ? game.teamA.players
            : []
          ).forEach((p) => all.push({ ...p, opponent: teamB }));
          (Array.isArray(game?.teamB?.players)
            ? game.teamB.players
            : []
          ).forEach((p) => all.push({ ...p, opponent: teamA }));
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
      return (
        <div className="mb-2 rounded-lg border border-[#e2e8f0] bg-[#ffffff] p-4 shadow-sm">
          <div className="text-sm font-bold text-[#64748b]">Loading Top Performers…</div>
        </div>
      );
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

  return (
    <div className="mx-auto mb-4 max-w-5xl rounded-lg border border-[#e2e8f0] bg-[#ffffff] p-4 shadow-sm">
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
                const slug =
                  player.Player === "Jerremiah Dujuan Wright"
                    ? "dujuan_wright"
                    : player.Player.toLowerCase()
                        .split(" ")
                        .map((w) => w.replace(/[^\w]/g, ""))
                        .join("_");

                return (
                  <Link
                    key={`${stat}-${player.Player}`}
                    to={`/season/${activeSeason}/player/${slug}`}
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
