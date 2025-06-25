// --- PlayerPage.js ---
import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
function ordinal(n) {
    const rem100 = n % 100;
    if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
    switch (n % 10) {
      case 1: return `${n}st`;
      case 2: return `${n}nd`;
      case 3: return `${n}rd`;
      default:  return `${n}th`;
    }
  }
  
const PUBLIC_URL = process.env.PUBLIC_URL || "";

export default function PlayerPage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const backTo = location.state?.from || "/leaders";
  const backLabel = location.state?.label || "Leaders";

  const [games, setGames] = useState([]);
  const [allAverages, setAllAverages] = useState([]);
  const [zoomUrl, setZoomUrl] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [rosters, setRosters] = useState({});
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  
  useEffect(() => {
    fetch("/full_schedule.json")
      .then((r) => r.json())
      .then(setSchedule)
      .catch(console.error);
    fetch("/team_rosters.json")
      .then((r) => r.json())
      .then(setRosters)
      .catch(console.error);
  }, []);

  const playerName =
    slug === "dujuan_wright"
      ? "Jerremiah Dujuan Wright"
      : slug
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
  // figure out which team this player is on
  const playerTeam = React.useMemo(() => {
    return (
      Object.entries(rosters).find(([, list]) =>
        list.some((p) => p.name === playerName)
      )?.[0] || ""
    );
  }, [rosters, playerName]);
  useEffect(() => {
    Promise.all([
      fetch("/week1.json").then((r) => r.json()),
      fetch("/week2.json").then((r) => r.json()),
      fetch("/week3.json").then((r) => r.json()),
      fetch("/week4.json").then((r) => r.json()),
    ])
      .then((weeks) => {
        const allPlayers = new Map();

        weeks.forEach((weekData, weekIdx) => {
          const weekLabel = `Week ${weekIdx + 1}`;
          Object.values(weekData).forEach((game) => {
            ["teamA", "teamB"].forEach((side) => {
              game[side].players.forEach((p) => {
                const fullName = p.Player;
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
        allPlayers.forEach((games, name) => {
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
            // ✅ skip any null (DNP) entries entirely
            const valid = games.filter((g) => g[k] != null);
            const total = valid.reduce((sum, g) => sum + g[k], 0);
            avg[k] = valid.length ? +(total / valid.length).toFixed(1) : 0;
          });
          allAveragesArr.push({ name, avg });
        });

        const thisPlayerGames = allPlayers.get(playerName) || [];
        setGames(thisPlayerGames);
        setAllAverages(allAveragesArr);
      })
      .catch(console.error);
  }, [playerName]);

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
      // ✅ now skips DNPs
      const valid = games.filter((g) => g[k] != null);
      const total = valid.reduce((sum, g) => sum + g[k], 0);
      avg[k] = valid.length ? +(total / valid.length).toFixed(1) : 0;
    });
  }

  const ranks = {};
  if (allAverages.length) {
    // grab a flat list of everyone on the rosters JSON
    const rosterNames = Object.values(rosters)
      .flat()
      .map((p) => p.name);

    Object.keys(avg).forEach((stat) => {
      // only keep players who are actually on a team
      const filtered = allAverages.filter((p) => rosterNames.includes(p.name));

      const sorted = filtered.sort(
        (a, b) => (b.avg[stat] || 0) - (a.avg[stat] || 0)
      );

      const index = sorted.findIndex((p) => p.name === playerName);
      if (index !== -1) ranks[stat] = ordinal(index + 1);
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
      <button
        onClick={() => navigate(backTo)}
        className="text-gray-400 hover:text-white mb-4 inline-block text-lg"
      >
        ← Back to {backLabel}
      </button>

      <div className="flex flex-col items-center mb-6">
        <div
          className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-gray-700 text-white flex items-center justify-center text-4xl sm:text-5xl font-bold mb-3 overflow-hidden cursor-pointer"
          onClick={() => setZoomUrl(`${PUBLIC_URL}/images/players/${slug}.png`)}
        >
          <img
            src={`${PUBLIC_URL}/images/players/${slug}.png`}
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

        <h1 className="text-4xl font-bold mb-4">{playerName}</h1>

        {games.length > 0 && (
          <div className="w-full max-w-md bg-gray-800 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-2">2024-25</div>
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

      <div className="overflow-x-auto mt-10 text-base sm:text-lg">
        <table className="w-full border-separate border-spacing-y-2 text-white">
          <thead className="bg-gray-800">
            <tr className="rounded-lg">
              {[
                "Week",
                "Opp",
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
                      : idx === 18
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
            {games.map((g, i) => (
              <tr
                key={i}
                className={`cursor-pointer ${
                  i % 2 === 0 ? "bg-gray-800/60" : "bg-gray-700/60"
                }`}
                onClick={() => {
                  const weekKey = g.week.toLowerCase().replace(/ /g, "");
                  const weekGames = schedule.filter((gm) =>
                    gm.gameId?.startsWith(weekKey)
                  );
                  const idxInWeek = weekGames.findIndex(
                    (gm) =>
                      (gm.teamA === playerTeam && gm.teamB === g.opponent) ||
                      (gm.teamB === playerTeam && gm.teamA === g.opponent)
                  );
                  const gameNum = idxInWeek >= 0 ? idxInWeek + 1 : 1;
                  navigate(`/boxscore/${weekKey}/game${gameNum}`);
                }}
              >
                <td className="px-4 py-4 text-left whitespace-nowrap rounded-l-lg">
                  {g.week}
                </td>
                <td className="px-4 py-4 text-left whitespace-nowrap">
                  {g.opponent}
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
            ))}
          </tbody>
          
        </table>
      </div>
    </div>
  );
}
