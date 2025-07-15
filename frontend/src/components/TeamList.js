// src/components/TeamList.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const allTeams = [
  "0pium Hoopers",
  "Team Flight",
  "YNS",
  "Shariah Stepback",
  "Mambas",
  "UMMA",
  "Mujahideens",
];

export default function TeamList() {
  const [standings, setStandings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/full_schedule.json')
      .then((res) => {
        if (!res.ok) throw new Error('Could not load full_schedule.json');
        return res.json();
      })
      .then((games) => {
        const recordMap = {};
        allTeams.forEach((team) => {
          recordMap[team] = { wins: 0, losses: 0 };
        });
        games.forEach((game) => {
          const { teamA, teamB, scoreA, scoreB } = game;
          if (typeof scoreA === 'number' && typeof scoreB === 'number') {
            if (scoreA > scoreB) {
              recordMap[teamA].wins += 1;
              recordMap[teamB].losses += 1;
            } else if (scoreB > scoreA) {
              recordMap[teamB].wins += 1;
              recordMap[teamA].losses += 1;
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

const sortedStandings = React.useMemo(() => {
  // Custom tiebreaker order: lower number wins the tie
  const priorities = {
    Mujahideens: 0,
    "Shariah Stepback": 1,
    // add more teams here if you need further tiebreakers
  };

  const arr = allTeams.map((team) => {
    const { wins = 0, losses = 0 } = standings[team] || {};
    const gamesPlayed = wins + losses;
    const winPct = gamesPlayed > 0 ? wins / gamesPlayed : 0;
    return { team, wins, losses, winPct };
  });

  return arr.sort((a, b) => {
    // 1) win percentage descending
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
    // 2) total wins descending
    if (b.wins !== a.wins) return b.wins - a.wins;
    // 3) custom tiebreaker
    const pa = priorities[a.team] ?? Infinity;
    const pb = priorities[b.team] ?? Infinity;
    return pa - pb;
  });
}, [standings]);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <h1 className="text-3xl font-bold text-center mb-6 text-white">Teams & Standings</h1>

      {/* Standings Table */}
      <div className="mb-10 max-w-lg mx-auto bg-gray-800 shadow-lg rounded">
        <h2 className="text-xl font-semibold bg-gray-700 px-4 py-2 border-b border-gray-600 text-white">
          Standings
        </h2>
        {loading ? (
          <p className="p-4 text-center text-gray-400">Loading standings…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-700 text-gray-200">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Team</th>
                  <th className="p-2 text-center">W</th>
                  <th className="p-2 text-center">L</th>
                  <th className="p-2 text-center">Win%</th>
                </tr>
              </thead>
              <tbody>
                {sortedStandings.map((row, idx) => (
                  <tr
                    key={row.team}
                    className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'}
                  >
                    <td className="p-2 text-gray-300">{idx + 1}</td>
                    <td className="p-2 text-gray-100">{row.team}</td>
                    <td className="p-2 text-center text-gray-100">{row.wins}</td>
                    <td className="p-2 text-center text-gray-100">{row.losses}</td>
                    <td className="p-2 text-center text-gray-100">
                      {(row.winPct * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {allTeams.map((teamName) => (
          <Link
            key={teamName}
            to={`/teams/${encodeURIComponent(teamName)}/roster`}
            className="bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition duration-300 border border-gray-700 p-6 flex flex-col items-center"
          >
            <h3 className="text-xl font-semibold text-white">{teamName}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
}