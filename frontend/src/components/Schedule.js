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

export default function Schedule() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/full_schedule.json")
      .then((res) => res.json())
      .then((data) => {
        setGames(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading schedule:", err);
        setLoading(false);
      });
  }, []);

  const records = {};
  allTeams.forEach((team) => {
    records[team] = { wins: 0, losses: 0 };
  });

  games.forEach((game) => {
    const { teamA, teamB, scoreA, scoreB } = game;
    if (typeof scoreA === "number" && typeof scoreB === "number") {
      if (scoreA > scoreB) {
        records[teamA].wins += 1;
        records[teamB].losses += 1;
      } else if (scoreB > scoreA) {
        records[teamB].wins += 1;
        records[teamA].losses += 1;
      }
    }
  });

  const gamesByDate = games.reduce((acc, game) => {
    if (!acc[game.date]) acc[game.date] = [];
    acc[game.date].push(game);
    return acc;
  }, {});
  const dateEntries = Object.entries(gamesByDate);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <h2 className="text-3xl font-bold text-center mb-8 text-white">
        Season Schedule
      </h2>

      {loading ? (
        <p className="text-center text-gray-400">Loading...</p>
      ) : (
        dateEntries.map(([date, dayGames], dateIdx) => {
          const playingTeams = dayGames.flatMap((g) => [g.teamA, g.teamB]);
          const byeTeams = allTeams.filter((t) => !playingTeams.includes(t));

          return (
            <div key={date} className="mb-10">
              <h3 className="text-xl font-semibold text-green-400 mb-4">
                {date}
              </h3>

              <div className="space-y-4">
                {dayGames.map((game, idx) => {
                  const [weekPart, idPart] =
                    typeof game.gameId === "string"
                      ? game.gameId.split("-")
                      : ["", ""];

                  const teamAWon = game.scoreA > game.scoreB;
                  const teamBWon = game.scoreB > game.scoreA;

                  const recA = records[game.teamA] || { wins: 0, losses: 0 };
                  const recB = records[game.teamB] || { wins: 0, losses: 0 };

                  const content = (
                    <div className="flex flex-col items-center bg-gray-800 rounded-xl shadow-lg px-4 py-3 transition-all duration-200 cursor-pointer">
                      {game.time && (
                        <p className="text-sm text-gray-400 mb-1">
                          {game.time}
                        </p>
                      )}

                      <div className="text-center flex flex-col items-center gap-1">
                        <span
                          className={`text-center max-w-[130px] whitespace-nowrap text-base leading-tight font-semibold ${
                            teamAWon ? "text-green-400" : "text-gray-200"
                          }`}
                        >
                          {game.teamA}
                          <span className="ml-1 text-xs text-gray-400 opacity-70">
                            ({recA.wins}-{recA.losses})
                          </span>
                        </span>
                        <span className="block text-blue-300 font-bold text-sm">
                          ({game.scoreA})
                        </span>
                        <span className="text-gray-500">vs</span>
                        <span
                          className={`text-center max-w-[130px] whitespace-nowrap text-base leading-tight font-semibold ${
                            teamBWon ? "text-green-400" : "text-gray-200"
                          }`}
                        >
                          {game.teamB}
                          <span className="ml-1 text-xs text-gray-400 opacity-70">
                            ({recB.wins}-{recB.losses})
                          </span>
                        </span>
                        <span className="block text-blue-300 font-bold text-sm">
                          ({game.scoreB})
                        </span>
                      </div>
                    </div>
                  );

                  return weekPart && idPart ? (
                    <Link
                      key={idx}
                      to={`/boxscore/${weekPart}/${idPart}`}
                      className="no-underline block"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={idx}>{content}</div>
                  );
                })}
              </div>

              {byeTeams.length > 0 && dateIdx < dateEntries.length - 1 && (
                <p className="text-sm text-red-500 font-semibold text-center mt-2">
                  Bye Week: {byeTeams.join(", ")}
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
