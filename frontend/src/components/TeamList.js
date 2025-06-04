// src/components/TeamList.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// If you have this array elsewhere, you can import it, otherwise define here:
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
        // Initialize records
        const recordMap = {};
        allTeams.forEach((team) => {
          recordMap[team] = { wins: 0, losses: 0 };
        });

        // Iterate through each game, update wins/losses
        games.forEach((game) => {
          const { teamA, teamB, scoreA, scoreB } = game;
          // Only count if both scores exist (i.e. game has been played)
          if (typeof scoreA === 'number' && typeof scoreB === 'number') {
            if (scoreA > scoreB) {
              recordMap[teamA].wins += 1;
              recordMap[teamB].losses += 1;
            } else if (scoreB > scoreA) {
              recordMap[teamB].wins += 1;
              recordMap[teamA].losses += 1;
            }
            // If tie logic is needed, add here (e.g. ties++, but we assume no ties)
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

  // Convert recordMap into a sorted array by win% (wins / gamesPlayed), descending
  const sortedStandings = React.useMemo(() => {
    const arr = allTeams.map((team) => {
      const { wins, losses } = standings[team] || { wins: 0, losses: 0 };
      const gamesPlayed = wins + losses;
      const winPct = gamesPlayed > 0 ? wins / gamesPlayed : 0;
      return {
        team,
        wins,
        losses,
        winPct,
      };
    });

    return arr.sort((a, b) => b.winPct - a.winPct || b.wins - a.wins);
  }, [standings]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-6">Teams & Standings</h1>

      {/* 1. Standings Table */}
      <div className="mb-10 max-w-lg mx-auto bg-white shadow rounded">
        <h2 className="text-xl font-semibold bg-gray-100 px-4 py-2 border-b">
          Standings
        </h2>
        {loading ? (
          <p className="p-4 text-center text-gray-600">Loading standings…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-200 text-gray-800">
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
                  <tr key={row.team} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-2">{idx + 1}</td>
                    <td className="p-2">{row.team}</td>
                    <td className="p-2 text-center">{row.wins}</td>
                    <td className="p-2 text-center">{row.losses}</td>
                    <td className="p-2 text-center">
                      {(row.winPct * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Team Grid (same as before) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {allTeams.map((teamName) => (
          <Link
            key={teamName}
            to={`/teams/${encodeURIComponent(teamName)}/roster`}
            className="bg-white rounded-xl shadow hover:shadow-lg hover:scale-105 transition duration-300 border border-gray-100 p-6 flex flex-col items-center"
          >
            <h3 className="text-xl font-semibold text-black">{teamName}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
}
