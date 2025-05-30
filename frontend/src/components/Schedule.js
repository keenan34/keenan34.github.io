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

const Schedule = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/full_schedule.json')
      .then(res => res.json())
      .then(data => {
        setGames(data);
        setLoading(false);
      });
  }, []);

  const gamesByDate = games.reduce((acc, game) => {
    if (!acc[game.date]) acc[game.date] = [];
    acc[game.date].push(game);
    return acc;
  }, {});

  const dateEntries = Object.entries(gamesByDate);

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-center mb-8 text-black">Season Schedule</h2>

      {loading ? (
        <p className="text-center text-gray-600">Loading...</p>
      ) : (
        dateEntries.map(([date, dayGames], i) => {
          const isLast = i === dateEntries.length - 1;
          const playingTeams = dayGames.flatMap(g => [g.teamA, g.teamB]);
          const byeTeams = allTeams.filter(team => !playingTeams.includes(team));

          return (
            <div key={date} className="mb-10">
              <h3 className="text-xl font-semibold text-green-700 mb-4">{date}</h3>

              <div className="space-y-4 mb-2">
                {dayGames.map((game, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row justify-between items-center"
                  >
                    <div className="text-gray-500 text-sm mb-2 sm:mb-0">{game.time}</div>

                    <div className="text-center font-semibold">
                      {game.scoreA !== undefined && game.scoreB !== undefined && game.gameId ? (
                        <Link
                          to={`/boxscore/${game.gameId.split('-')[0]}/${game.gameId.split('-')[1]}`}
                          className="text-blue-600 hover:text-red-600 underline"
                        >
                          {game.teamA} ({game.scoreA}) <span className="text-black font-bold">vs</span> {game.teamB} ({game.scoreB})
                        </Link>
                      ) : (
                        <span>
                          {game.teamA} <span className="text-black font-bold">vs</span> {game.teamB}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!isLast && byeTeams.length > 0 && (
                <p className="text-sm text-center text-red-600 font-semibold">
                  Bye Week: {byeTeams.join(', ')}
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default Schedule;
