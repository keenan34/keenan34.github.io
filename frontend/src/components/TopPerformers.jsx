// File: src/components/TopPerformers.jsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

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
      <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-200">
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
  week = "week1",
  showIfMissing = true,
}) {
  const { season } = useParams();
  const activeSeason = season || "szn4";

  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | missing
  const [debug, setDebug] = useState({ total: 0, filtered: 0 });

  useEffect(() => {
    let cancelled = false;
    setRows([]);
    setStatus("loading");
    setDebug({ total: 0, filtered: 0 });

    const url = `${PUBLIC_URL}/seasons/${activeSeason}/${week}.json?v=${Date.now()}`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error("missing");
        const json = await res.json();

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
          setDebug({ total: all.length, filtered: filtered.length });
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
  }, [activeSeason, week]);

  if (!rows.length) {
    if (!showIfMissing) return null;

    if (status === "loading") {
      return (
        <div className="p-4 bg-gray-900 rounded-lg mb-2">
          <div className="text-sm text-gray-400">Loading Top Performers…</div>
        </div>
      );
    }

    if (status === "missing") {
      return (
        <div className="p-4 bg-gray-900 rounded-lg mb-2">
          <div className="text-sm text-gray-400">
            Top Performers not available for{" "}
            <span className="font-bold text-white">
              {week.replace("week", "Week ")}
            </span>{" "}
            yet.
          </div>
        </div>
      );
    }

    // file loaded but nothing survived filtering -> data format issue
    return (
      <div className="p-4 bg-gray-900 rounded-lg mb-2">
        <div className="text-sm text-gray-400">
          No eligible Top Performers for{" "}
          <span className="font-bold text-white">
            {week.replace("week", "Week ")}
          </span>
          .
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Debug: loaded {debug.total} player rows, kept {debug.filtered}.
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
    <div className="p-4 bg-gray-900 rounded-lg mb-2">
      <h2 className="text-xl font-bold text-white mb-4">
        Top Performers ({week.replace("week", "Week ")})
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
            className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <div className="text-sm text-gray-400 mb-2">{label}</div>

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
                    className="flex items-center"
                  >
                    <ProfileImage name={player.Player} season={activeSeason} />
                    <div className="ml-2">
                      <div className="text-sm font-semibold text-white">
                        {player.Player}
                      </div>
                      <div className="text-xs italic text-gray-400">
                        vs {player.opponent}
                      </div>
                      <div className="text-xs text-gray-300">
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
