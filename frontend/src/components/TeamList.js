import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

const isPlaceholderTeam = (name = "") =>
  name.startsWith("Seed ") || name.startsWith("Winner of ");

// normalize team names so UMMA === Umma === The UMMA
const normalizeTeam = (s = "") =>
  s
    .toLowerCase()
    .trim()
    .replace(/^the\s+/, "")
    .replace(/\s+/g, " ");

export default function TeamList() {
  const { season } = useParams();
  const activeSeason = season || "szn4";

  const [teams, setTeams] = useState([]);
  const [standings, setStandings] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg("");

    Promise.all([
      fetch(`/seasons/${activeSeason}/team_rosters.json?v=${Date.now()}`),
      fetch(`/seasons/${activeSeason}/full_schedule.json?v=${Date.now()}`),
    ])
      .then(async ([rRosters, rGames]) => {
        if (!rRosters.ok) {
          throw new Error(`Failed to load team_rosters.json`);
        }
        if (!rGames.ok) {
          throw new Error(`Failed to load full_schedule.json`);
        }

        const rosters = await rRosters.json();
        const games = await rGames.json();

        // teams from rosters (source of truth)
        const realTeams = Object.keys(rosters || {}).filter(
          (t) => t && !isPlaceholderTeam(t)
        );

        if (!realTeams.length) {
          throw new Error("No teams found in team_rosters.json");
        }

        // build standings map
        const recordMap = {};
        realTeams.forEach((t) => (recordMap[t] = { wins: 0, losses: 0 }));

        // normalized → canonical team name
        const canonicalByNorm = {};
        realTeams.forEach((t) => {
          canonicalByNorm[normalizeTeam(t)] = t;
        });

        // process games
        (games || []).forEach(({ teamA, teamB, scoreA, scoreB }) => {
          const aKey = canonicalByNorm[normalizeTeam(teamA)];
          const bKey = canonicalByNorm[normalizeTeam(teamB)];

          if (!aKey || !bKey) return;

          const a = Number(scoreA);
          const b = Number(scoreB);

          if (!Number.isFinite(a) || !Number.isFinite(b)) return;

          if (a > b) {
            recordMap[aKey].wins += 1;
            recordMap[bKey].losses += 1;
          } else if (b > a) {
            recordMap[bKey].wins += 1;
            recordMap[aKey].losses += 1;
          }
        });

        if (cancelled) return;
        setTeams(realTeams);
        setStandings(recordMap);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setErrorMsg(err.message || "Failed to load standings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeSeason]);

  const standingsArray = useMemo(() => {
    return teams
      .map((team) => {
        const { wins = 0, losses = 0 } = standings[team] || {};
        const played = wins + losses;
        const winPct = played ? wins / played : 0;
        return { team, wins, losses, winPct };
      })
      .sort((a, b) => {
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
        return b.wins - a.wins;
      });
  }, [teams, standings]);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <h1 className="text-3xl font-bold text-center mb-6 text-white">
        Teams &amp; Standings
      </h1>

      {/* STANDINGS TABLE */}
      <div className="max-w-xl mx-auto bg-gray-800 shadow-xl rounded-lg overflow-hidden mb-10">
        <div className="bg-gray-700 px-6 py-3">
          <h2 className="text-lg font-semibold text-gray-100">Standings</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-400">
            Loading standings…
          </div>
        ) : errorMsg ? (
          <div className="p-6 text-center text-red-400">{errorMsg}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-center divide-y divide-gray-600">
              <thead className="bg-gray-700 text-gray-200">
                <tr>
                  {["#", "Team", "W", "L", "Win%"].map((col) => (
                    <th
                      key={col}
                      className="uppercase text-xs font-medium py-2 px-4"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-gray-800">
                {standingsArray.map((row, idx) => (
                  <tr key={row.team} className={idx % 2 ? "bg-gray-700" : ""}>
                    <td className="px-4 py-3 text-gray-100">{idx + 1}</td>
                    <td className="px-4 py-3 text-gray-100 font-medium">
                      {row.team}
                    </td>
                    <td className="px-4 py-3 text-gray-100">{row.wins}</td>
                    <td className="px-4 py-3 text-gray-100">{row.losses}</td>
                    <td className="px-4 py-3 text-gray-100">
                      {(row.winPct * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TEAM CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <Link
            key={team}
            to={
              season
                ? `/season/${activeSeason}/teams/${encodeURIComponent(
                    team
                  )}/roster`
                : `/teams/${encodeURIComponent(team)}/roster`
            }
            className="bg-gray-800 rounded-lg shadow-lg hover:shadow-2xl transition p-5 flex items-center justify-center border border-gray-700"
          >
            <span className="text-lg font-semibold text-white">{team}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
