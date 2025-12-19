// --- PlayerPage.js ---
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";

function ordinal(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

const PUBLIC_URL = process.env.PUBLIC_URL || "";

// normalize team names so Umma === UMMA === The Umma, etc
const normalizeTeam = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/^the\s+/, "")
    .replace(/\s+/g, " ");

export default function PlayerPage() {
  const { season, slug } = useParams();
  const activeSeason = season || "szn4";

  const location = useLocation();
  const navigate = useNavigate();

  const backTo = location.state?.from || "/";
  const backLabel = location.state?.label || "Home";

  const [games, setGames] = useState([]);
  const [allAverages, setAllAverages] = useState([]);
  const [zoomUrl, setZoomUrl] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [rosters, setRosters] = useState({});
  const [playerNumber, setPlayerNumber] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // load schedule + rosters (cache-busted)
  useEffect(() => {
    fetch(`/seasons/${activeSeason}/full_schedule.json?v=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => setSchedule(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch(`/seasons/${activeSeason}/team_rosters.json?v=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => setRosters(data || {}))
      .catch(console.error);
  }, [activeSeason]);

  const playerName =
    slug === "dujuan_wright"
      ? "Jerremiah Dujuan Wright"
      : slug
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

  const playerTeam = useMemo(() => {
    return (
      Object.entries(rosters).find(([, list]) =>
        (list || []).some((p) => p.name === playerName)
      )?.[0] || ""
    );
  }, [rosters, playerName]);

  // helper: find the schedule entry for a given week + opponent
  const findScheduleEntry = (weekKey, opponent) => {
    if (!schedule?.length || !playerTeam) return null;

    const teamNorm = normalizeTeam(playerTeam);
    const oppNorm = normalizeTeam(opponent);

    // all games in that week involving player's team
    const teamGames = schedule.filter((gm) => {
      if (!gm?.gameId?.startsWith(weekKey)) return false;
      const a = normalizeTeam(gm.teamA);
      const b = normalizeTeam(gm.teamB);
      return a === teamNorm || b === teamNorm;
    });

    if (!teamGames.length) return null;

    // pick the one against this opponent
    const exact = teamGames.find((gm) => {
      const a = normalizeTeam(gm.teamA);
      const b = normalizeTeam(gm.teamB);
      return (
        (a === teamNorm && b === oppNorm) || (b === teamNorm && a === oppNorm)
      );
    });

    return exact || null;
  };

  // load weeks -> games + league averages
  useEffect(() => {
    const rosterNames = Object.values(rosters)
      .flat()
      .map((p) => p.name);

    const playerEntry = Object.values(rosters)
      .flat()
      .find((p) => p.name === playerName);

    if (playerEntry && playerEntry.number != null) {
      setPlayerNumber(playerEntry.number);
    }

    const weekNums = [1, 2, 3, 4, 5, 6, 7, 8];

    const fetchWeek = async (n) => {
      const r = await fetch(
        `/seasons/${activeSeason}/week${n}.json?v=${Date.now()}`
      );
      if (!r.ok) return null;
      try {
        return await r.json();
      } catch {
        return null;
      }
    };

    Promise.all(weekNums.map(fetchWeek))
      .then((weeksRaw) => {
        const weeks = weeksRaw.filter(Boolean);
        const allPlayers = new Map();

        weeks.forEach((weekData, idx) => {
          const weekLabel = `Week ${idx + 1}`;

          Object.values(weekData || {}).forEach((game) => {
            ["teamA", "teamB"].forEach((side) => {
              (game?.[side]?.players || []).forEach((p) => {
                const fullName = p?.Player;
                if (!fullName) return;

                const opponent =
                  side === "teamA" ? game.teamB.name : game.teamA.name;

                const entry = {
                  week: weekLabel,
                  opponent,
                  points: p.Points,
                  fgm: p.FGM,
                  fga: p.FGA,
                  fgPct: p["FG %"],
                  twoPtM: p["2 PTM"],
                  twoPtA: p["2 PTA"],
                  twoPtPct: p["2 Pt %"],
                  threePtM: p["3 PTM"],
                  threePtA: p["3 PTA"],
                  threePtPct: p["3 Pt %"],
                  ftm: p.FTM,
                  fta: p.FTA,
                  ftPct: p["FT %"],
                  rebounds: p.REB,
                  tos: p.TOs,
                  fouls: p.Fouls,
                  steals: p["STLS/BLKS"],
                };

                if (!allPlayers.has(fullName)) allPlayers.set(fullName, []);
                allPlayers.get(fullName).push(entry);
              });
            });
          });
        });

        const allAveragesArr = [];
        const excluded = [
          "Josiah",
          "Danial Asim",
          "Salman",
          "Ibrahim",
          "Raedh Talha",
          "Sufyan",
          "Devon",
          "Saif Rehman",
          "Amaar Zafar",
        ];

        allPlayers.forEach((gms, name) => {
          if (!rosterNames.includes(name)) return;
          if (excluded.includes(name)) return;

          const avg = {};
          [
            "points",
            "rebounds",
            "fgm",
            "fga",
            "fgPct",
            "twoPtM",
            "twoPtA",
            "twoPtPct",
            "threePtM",
            "threePtA",
            "threePtPct",
            "ftm",
            "fta",
            "ftPct",
            "tos",
            "steals",
          ].forEach((k) => {
            const valid = gms.filter((g) => g[k] != null);
            const total = valid.reduce((sum, g) => sum + Number(g[k] || 0), 0);
            avg[k] = valid.length ? +(total / valid.length).toFixed(1) : 0;
          });

          allAveragesArr.push({ name, avg });
        });

        setGames(allPlayers.get(playerName) || []);
        setAllAverages(allAveragesArr);
      })
      .catch(console.error);
  }, [activeSeason, playerName, rosters]);

  // player averages
  const avg = {};
  if (games.length) {
    [
      "points",
      "rebounds",
      "fgm",
      "fga",
      "fgPct",
      "twoPtM",
      "twoPtA",
      "twoPtPct",
      "threePtM",
      "threePtA",
      "threePtPct",
      "ftm",
      "fta",
      "ftPct",
      "tos",
      "steals",
    ].forEach((k) => {
      const valid = games.filter((g) => g[k] != null);
      const total = valid.reduce((sum, g) => sum + Number(g[k] || 0), 0);
      avg[k] = valid.length ? +(total / valid.length).toFixed(1) : 0;
    });
  }

  // ranks
  const ranks = {};
  if (allAverages.length) {
    const rosterNames = Object.values(rosters)
      .flat()
      .map((p) => p.name);

    Object.keys(avg).forEach((stat) => {
      const filtered = allAverages.filter((p) => rosterNames.includes(p.name));
      const sorted = filtered
        .slice()
        .sort((a, b) => (b.avg[stat] || 0) - (a.avg[stat] || 0));

      let currentRank = 1;
      let previousValue = null;
      const rankMap = {};
      for (let i = 0; i < sorted.length; i++) {
        const val = sorted[i].avg[stat];
        if (val !== previousValue) currentRank = i + 1;
        rankMap[sorted[i].name] = ordinal(currentRank);
        previousValue = val;
      }

      if (playerName in rankMap) ranks[stat] = rankMap[playerName];
    });
  }

  const ZoomModal = () => (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={() => setZoomUrl(null)}
    >
      <div
        className="rounded-full overflow-hidden w-[60vw] h-[60vw] max-w-[600px] max-h-[600px]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={zoomUrl}
          alt="Zoomed player"
          className="w-full h-full object-cover"
        />
      </div>
      <button
        className="absolute top-4 right-4 text-white text-3xl"
        onClick={() => setZoomUrl(null)}
      >
        &times;
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 text-2xl sm:text-3xl">
      <div className="relative w-full max-w-4xl mx-auto mb-6">
        {/* Top Buttons */}
        <div className="flex justify-between items-start mb-4">
          <button
            onClick={() => navigate(backTo)}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Back to {backLabel}
          </button>

          {playerTeam && (
            <button
              onClick={() =>
                navigate(
                  `/season/${activeSeason}/teams/${encodeURIComponent(
                    playerTeam
                  )}/roster`
                )
              }
              className="text-gray-400 hover:text-white text-sm"
            >
              → {playerTeam} Team Page
            </button>
          )}
        </div>

        {/* Centered Player Info & Averages */}
        <div className="flex flex-col items-center">
          {/* Avatar */}
          <div
            className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-gray-700 text-white flex items-center justify-center text-4xl sm:text-5xl font-bold mb-3 overflow-hidden cursor-pointer"
            onClick={() =>
              setZoomUrl(
                `${PUBLIC_URL}/seasons/${activeSeason}/images/players/${slug}.png`
              )
            }
          >
            <img
              src={`${PUBLIC_URL}/seasons/${activeSeason}/images/players/${slug}.png`}
              alt={playerName}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.style.display = "none";
              }}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {playerName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>

          {/* Player Name */}
          <h1 className="text-4xl mb-4">
            {playerNumber ? (
              <span className="italic text-gray-500">#{playerNumber} </span>
            ) : (
              ""
            )}
            {playerName}
          </h1>

          {/* Averages Box */}
          {games.length > 0 && (
            <div className="w-full max-w-md bg-gray-800 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-2">
                {activeSeason.toUpperCase()}
              </div>

              {/* First Row */}
              <div className="grid grid-cols-8 gap-1 mb-1 text-center font-semibold text-gray-400 text-[10px] sm:text-[12px]">
                {["PTS", "REB", "FGM", "FGA", "FG%", "2PTM", "2PTA", "2P%"].map(
                  (label) => (
                    <div key={label}>{label}</div>
                  )
                )}
              </div>
              <div className="grid grid-cols-8 gap-1 -mb-1 text-center font-bold text-base sm:text-lg relative z-10">
                {[
                  avg.points,
                  avg.rebounds,
                  avg.fgm,
                  avg.fga,
                  avg.fgPct,
                  avg.twoPtM,
                  avg.twoPtA,
                  avg.twoPtPct,
                ].map((v, i) => (
                  <div key={i}>{v}</div>
                ))}
              </div>
              <div className="grid grid-cols-8 gap-1 mb-3 mt-3 text-center text-gray-500 text-xs sm:text-sm">
                {[
                  "points",
                  "rebounds",
                  "fgm",
                  "fga",
                  "fgPct",
                  "twoPtM",
                  "twoPtA",
                  "twoPtPct",
                ].map((k, i) => (
                  <div key={i}>{ranks[k]}</div>
                ))}
              </div>

              {/* Second Row */}
              <div className="grid grid-cols-8 gap-1 mb-1 text-center font-semibold text-gray-400 text-[10px] sm:text-[12px]">
                {[
                  "3PTM",
                  "3PTA",
                  "3P%",
                  "FTM",
                  "FTA",
                  "FT%",
                  "TO",
                  "STL/BLK",
                ].map((label) => (
                  <div key={label}>{label}</div>
                ))}
              </div>
              <div className="grid grid-cols-8 gap-1 -mb-1 text-center font-bold text-base sm:text-lg relative z-10">
                {[
                  avg.threePtM,
                  avg.threePtA,
                  avg.threePtPct,
                  avg.ftm,
                  avg.fta,
                  avg.ftPct,
                  avg.tos,
                  avg.steals,
                ].map((v, i) => (
                  <div key={i}>{v}</div>
                ))}
              </div>
              <div className="grid grid-cols-8 gap-1 text-center text-gray-500 text-xs sm:text-sm mt-3">
                {[
                  "threePtM",
                  "threePtA",
                  "threePtPct",
                  "ftm",
                  "fta",
                  "ftPct",
                  "tos",
                  "steals",
                ].map((k, i) => (
                  <div key={i}>{ranks[k]}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {zoomUrl && <ZoomModal />}
      </div>

      {/* GAME LOG TABLE */}
      <div className="overflow-x-auto mt-10 text-base sm:text-lg">
        <table className="w-full border-separate border-spacing-y-2 text-white">
          <thead className="bg-gray-800">
            <tr className="rounded-lg">
              {[
                "Week",
                "Opp",
                "Result",
                "PTS",
                "FGM",
                "FGA",
                "FG%",
                "2PM",
                "2PA",
                "2P%",
                "3PM",
                "3PA",
                "3P%",
                "FTM",
                "FTA",
                "FT%",
                "REB",
                "TO",
                "FLS",
                "STL/BLKS",
              ].map((col, idx) => (
                <th
                  key={col}
                  className={`px-4 py-3 text-center font-semibold text-sm sm:text-base bg-gray-800 ${
                    idx === 0
                      ? "rounded-l-lg"
                      : idx === 19
                      ? "rounded-r-lg"
                      : ""
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {games.map((g, i) => {
              const weekKey = g.week.toLowerCase().replace(/ /g, "");
              const entry = findScheduleEntry(weekKey, g.opponent);

              // compute W/L + show score
              let resultText = "-";
              if (entry) {
                const a = Number(entry.scoreA);
                const b = Number(entry.scoreB);

                if (Number.isFinite(a) && Number.isFinite(b)) {
                  const teamNorm = normalizeTeam(playerTeam);
                  const aIsTeam = normalizeTeam(entry.teamA) === teamNorm;

                  const myScore = aIsTeam ? a : b;
                  const oppScore = aIsTeam ? b : a;

                  resultText = `${
                    myScore > oppScore ? "W" : "L"
                  } ${myScore}-${oppScore}`;
                }
              }

              return (
                <tr
                  key={i}
                  className={`${
                    i % 2 === 0 ? "bg-gray-800/60" : "bg-gray-700/60"
                  } cursor-pointer`}
                  onClick={() => {
                    if (!entry?.gameId) return;
                    const [, gameKey] = entry.gameId.split("-");
                    if (!gameKey) return;
                    navigate(
                      `/season/${activeSeason}/boxscore/${weekKey}/${gameKey}`
                    );
                  }}
                >
                  <td className="px-4 py-4 text-left whitespace-nowrap rounded-l-lg">
                    {g.week}
                  </td>

                  <td className="px-4 py-4 text-left whitespace-nowrap">
                    {g.opponent}
                  </td>

                  <td className="px-4 py-4 text-center font-bold">
                    {resultText}
                  </td>

                  {[
                    g.points,
                    g.fgm,
                    g.fga,
                    g.fgPct,
                    g.twoPtM,
                    g.twoPtA,
                    g.twoPtPct,
                    g.threePtM,
                    g.threePtA,
                    g.threePtPct,
                    g.ftm,
                    g.fta,
                    g.ftPct,
                    g.rebounds,
                    g.tos,
                    g.fouls,
                    g.steals,
                  ].map((val, idx) => (
                    <td
                      key={idx}
                      className={`px-4 py-4 text-center ${
                        idx === 16 ? "rounded-r-lg" : ""
                      }`}
                    >
                      {val == null ? "DNP" : val}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
