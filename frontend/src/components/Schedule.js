// src/components/Schedule.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// All teams in the league
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

  // Fetch the master schedule
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

  // Group by date → { "5/25/2025": [game, …], "6/1/2025": […], … }
  const gamesByDate = games.reduce((acc, game) => {
    if (!acc[game.date]) acc[game.date] = [];
    acc[game.date].push(game);
    return acc;
  }, {});

  const dateEntries = Object.entries(gamesByDate);

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-center mb-8">Season Schedule</h2>

      {loading ? (
        <p className="text-center text-gray-600">Loading...</p>
      ) : (
        dateEntries.map(([date, dayGames], dateIdx) => {
          // Which teams are playing this date; the rest are on bye
          const playingTeams = dayGames.flatMap((g) => [g.teamA, g.teamB]);
          const byeTeams = allTeams.filter((t) => !playingTeams.includes(t));

          return (
            <div key={date} className="mb-10">
              {/* ───────── Date Header ───────── */}
              <h3 className="text-xl font-semibold text-green-700 mb-4">
                {date}
              </h3>

              {/* ───────── All games as individual “cards” ───────── */}
              <div className="space-y-4">
                {dayGames.map((game, idx) => {
                  // Split gameId → ["week1","game1"]
                  const [weekPart, idPart] =
                    typeof game.gameId === "string"
                      ? game.gameId.split("-")
                      : ["", ""];
                  const teamAWon = game.scoreA > game.scoreB;
                  const teamBWon = game.scoreB > game.scoreA;

                  return (
                    <div
                      key={idx}
                      className="
                        flex flex-col items-center
                        bg-white rounded-xl shadow hover:shadow-lg
                        px-4 py-3 transition-all duration-200
                      "
                    >
                      {/* ── Time (new) ── */}
                      {game.time && (
                        <p className="text-sm text-gray-500 mb-1">
                          {game.time}
                        </p>
                      )}

                      {/* ── Center: clickable blue link ── */}
                      <div className="text-center">
                        {weekPart && idPart ? (
                          <Link
                            to={`/boxscore/${weekPart}/${idPart}`}
                            className={`
                              underline text-blue-600 
                              hover:text-red-600 
                              font-semibold whitespace-nowrap
                            `}
                          >
                            {/* Only place we show team names */}
                            <span className={teamAWon ? "text-green-700" : "text-gray-700"}>
                              {game.teamA}
                            </span>{" "}
                            {typeof game.scoreA === "number" && `(${game.scoreA})`}{" "}
                            <span className="text-gray-400">vs</span>{" "}
                            <span className={teamBWon ? "text-green-700" : "text-gray-700"}>
                              {game.teamB}
                            </span>{" "}
                            {typeof game.scoreB === "number" && `(${game.scoreB})`}
                          </Link>
                        ) : (
                          /* If no gameId, just render plain text */
                          <span className="text-gray-700 font-semibold whitespace-nowrap">
                            {game.teamA}{" "}
                            {typeof game.scoreA === "number" && `(${game.scoreA})`}{" "}
                            <span className="text-gray-400">vs</span>{" "}
                            {game.teamB}{" "}
                            {typeof game.scoreB === "number" && `(${game.scoreB})`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ───────── Bye Week Notice ───────── */}
              {byeTeams.length > 0 && dateIdx < dateEntries.length - 1 && (
                <p className="text-sm text-center text-red-600 font-semibold mt-2">
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
