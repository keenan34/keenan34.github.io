import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const allTeams = [
  "0pium Hoopers",
  "Team Flight",
  "YNS",
  "Shariah Stepback",
  "Mambas",
  "UMMA",
  "Mujahideens",
];

// Manually set point differentials here
const manualPointDiff = {
  "0pium Hoopers": 55,
  "Team Flight": 40,
  YNS: 44,
  "Shariah Stepback": -55,
  Mambas: -95,
  UMMA: 63,
  Mujahideens: -52,
};
export default function TeamList() {
  const [standings, setStandings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/full_schedule.json")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load full_schedule.json");
        return res.json();
      })
      .then((games) => {
        const recordMap = {};
        allTeams.forEach((team) => (recordMap[team] = { wins: 0, losses: 0 }));
        games.forEach(({ teamA, teamB, scoreA, scoreB }) => {
          if (typeof scoreA === "number" && typeof scoreB === "number") {
            if (scoreA > scoreB) {
              recordMap[teamA].wins++;
              recordMap[teamB].losses++;
            } else if (scoreB > scoreA) {
              recordMap[teamB].wins++;
              recordMap[teamA].losses++;
            }
          }
        });
        setStandings(recordMap);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const standingsArray = React.useMemo(() => {
    return allTeams
      .map((team) => {
        const { wins = 0, losses = 0 } = standings[team] || {};
        const played = wins + losses;
        const winPct = played ? wins / played : 0;
        return {
          team,
          wins,
          losses,
          winPct,
          pointDiff: manualPointDiff[team] || 0,
        };
      })
      .sort((a, b) => {
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.pointDiff - a.pointDiff;
      });
  }, [standings]);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <h1 className="text-3xl font-bold text-center mb-6 text-white">
        Teams &amp; Standings
      </h1>

      <div className="max-w-xl mx-auto bg-gray-800 shadow-xl rounded-lg overflow-hidden mb-10">
        <div className="bg-gray-700 px-6 py-3">
          <h2 className="text-lg font-semibold text-gray-100">Standings</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-400">
            Loading standings…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-center divide-y divide-gray-600">
              <thead className="bg-gray-700 text-gray-200">
                <tr>
                  {["#", "Team", "W", "L", "Win%", "Pts Diff"].map(
                    (col, idx) => (
                      <th
                        key={col}
                        className={`uppercase text-xs font-medium py-2 ${
                          idx >= 4 ? "px-2" : "px-4"
                        }`}
                      >
                        {col}
                      </th>
                    )
                  )}
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
                    <td className="px-2 py-3 text-gray-100">
                      {(row.winPct * 100).toFixed(1)}%
                    </td>
                    <td className="px-2 py-3 text-gray-100">{row.pointDiff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {allTeams.map((team) => (
          <Link
            key={team}
            to={`/teams/${encodeURIComponent(team)}/roster`}
            className="bg-gray-800 rounded-lg shadow-lg hover:shadow-2xl transition p-5 flex items-center justify-center border border-gray-700"
          >
            <span className="text-lg font-semibold text-white">{team}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
