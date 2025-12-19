import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const teamColors = {
  UMMA: "bg-red-700 text-black",
  Umma: "bg-red-700 text-black",

  TNB: "bg-green-600 text-white",

  "The Northmen": "bg-slate-800 text-gray-300",

  "Chi-Elite": "bg-orange-500 text-red-700",

  Mujahideens: "bg-sky-300 text-yellow-400",
  "The Mujahideens": "bg-sky-300 text-yellow-400",
};

export default function TeamRoster() {
  const { season, id } = useParams();
  const activeSeason = season || "szn4";

  const teamName = decodeURIComponent(id);
  const colorClass = teamColors[teamName] || "bg-black text-pink-500";

  const [roster, setRoster] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetch(`/seasons/${activeSeason}/team_rosters.json`).then((r) => r.json()),
      fetch(`/seasons/${activeSeason}/players_with_images.json`).then((r) =>
        r.json()
      ),
      fetch(`/seasons/${activeSeason}/full_schedule.json?v=${Date.now()}`).then(
        (r) => r.json()
      ),
    ])
      .then(([teamsData, imagesData, schedule]) => {
        const plainRoster = teamsData?.[teamName] || [];

        const merged = plainRoster.map((p) => {
          const info = imagesData?.[teamName]?.find((pi) => pi.name === p.name);
          return info ? { ...p, imgUrl: info.imgUrl } : p;
        });

        setRoster(merged);

        const teamGames = (schedule || [])
          .filter((g) => g.teamA === teamName || g.teamB === teamName)
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        setGames(teamGames);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeSeason, teamName]);

  const playerLink = (slug) =>
    season ? `/season/${activeSeason}/player/${slug}` : `/player/${slug}`;

  const boxscoreLink = (game) => {
    // expects game.gameId like "week1-game1" OR "week1-1"
    if (!game?.gameId) return null;
    const [weekPart, idPart] = game.gameId.split("-");
    if (!weekPart || !idPart) return null;
    return `/season/${activeSeason}/boxscore/${weekPart}/${idPart}`;
  };

  return (
    <div className="p-6">
      <h2
        className={`text-3xl font-bold text-center mb-6 p-4 rounded ${colorClass}`}
      >
        {teamName} Team Page
      </h2>

      {loading ? (
        <p className="text-center text-gray-400">Loading...</p>
      ) : (
        <div className="max-w-xl mx-auto space-y-8">
          {/* ROSTER */}
          <div>
            <h3 className="text-xl font-bold mb-3 text-white">Roster</h3>
            <div className="space-y-3">
              {roster.map((player, idx) => {
                const slug = player.name.toLowerCase().replace(/ /g, "_");
                return (
                  <Link
                    key={idx}
                    to={playerLink(slug)}
                    className="w-full bg-white rounded-xl shadow p-4 flex items-center hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <span className="text-gray-800 font-semibold">
                        {player.name}
                      </span>
                    </div>
                    <span className="text-gray-600 ml-2">#{player.number}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* GAME HISTORY */}
          <div>
            <h3 className="text-xl font-bold mb-3 text-white">Game History</h3>

            {games.length === 0 ? (
              <p className="text-gray-400">No games yet.</p>
            ) : (
              <div className="space-y-3">
                {games.map((g, idx) => {
                  const isHome = g.teamA === teamName;
                  const myScore = isHome ? g.scoreA : g.scoreB;
                  const oppScore = isHome ? g.scoreB : g.scoreA;
                  const opp = isHome ? g.teamB : g.teamA;

                  const hasScore =
                    typeof g.scoreA === "number" &&
                    typeof g.scoreB === "number";
                  const won = hasScore && myScore > oppScore;
                  const lost = hasScore && myScore < oppScore;

                  const link = hasScore ? boxscoreLink(g) : null;

                  const row = (
                    <div className="bg-gray-800 rounded-xl shadow px-4 py-3 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-400">
                          {g.date} {g.time ? `· ${g.time}` : ""}
                        </span>
                        <span className="text-white font-semibold">
                          vs {opp}
                        </span>
                      </div>

                      <div className="text-right">
                        {hasScore ? (
                          <>
                            <span className="font-bold text-white">
                              {myScore}-{oppScore}
                            </span>
                            <div
                              className={`text-xs font-semibold ${
                                won
                                  ? "text-green-400"
                                  : lost
                                  ? "text-red-400"
                                  : "text-gray-400"
                              }`}
                            >
                              {won ? "W" : lost ? "L" : ""}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400 text-sm">
                            Scheduled
                          </span>
                        )}
                      </div>
                    </div>
                  );

                  return link ? (
                    <Link key={idx} to={link} className="block no-underline">
                      {row}
                    </Link>
                  ) : (
                    <div key={idx}>{row}</div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
