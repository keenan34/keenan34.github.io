import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const teamColors = {
  "Team Flight": "bg-teal-700 text-white",
  YNS: "bg-purple-900 text-white",
  UMMA: "bg-yellow-500 text-black",
  Mambas: "bg-black text-white",
  "Shariah Stepback": "bg-green-900 text-white",
  Mujahideens: "bg-red-600 text-white",
  "Opium Hoopers": "bg-black text-pink-400",
};

const TeamRoster = () => {
  const { id } = useParams();
  const teamName = decodeURIComponent(id);
  const colorClass = teamColors[teamName] || "bg-black text-pink-500";

  const [roster, setRoster] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoomUrl, setZoomUrl] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("/team_rosters.json"),
      fetch("/players_with_images.json"),
      fetch("/full_schedule.json"),
    ])
      .then(async ([r1, r2, r3]) => {
        const teamsData = await r1.json();
        const imagesData = await r2.json();
        const scheduleData = await r3.json();

        const plainRoster = teamsData[teamName] || [];

        const merged = plainRoster.map((p) => {
          const info = imagesData[teamName]?.find((pi) => pi.name === p.name);
          return info ? { ...p, imgUrl: info.imgUrl } : p;
        });

        const teamGames = scheduleData.filter(
          (g) => g.teamA === teamName || g.teamB === teamName
        );

        setRoster(merged);
        setSchedule(teamGames);
        setLoading(false);
      })
      .catch(console.error);
  }, [teamName]);

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
    <div className="p-6">
      <h2
        className={`text-3xl font-bold text-center mb-6 p-4 rounded ${colorClass}`}
      >
        {teamName} Roster
      </h2>

      {loading ? (
        <p className="text-center text-gray-600">Loading...</p>
      ) : (
        <div className="max-w-xl mx-auto space-y-4">
          {roster.length === 0 ? (
            <p className="text-center text-red-500">No players found.</p>
          ) : (
            roster.map((player, idx) => {
              const slug = player.name.toLowerCase().replace(/ /g, "_");
              return (
                <Link
                  key={idx}
                  to={`/player/${slug}`}
                  state={{
                    from: `/teams/${encodeURIComponent(teamName)}/roster`,
                    label: "Team",
                  }}
                  className="w-full bg-white rounded-xl shadow p-4 flex items-center hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  {player.imgUrl ? (
                    <img
                      src={player.imgUrl}
                      alt={player.name}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                      className="w-12 h-12 rounded-full object-cover mr-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomUrl(player.imgUrl);
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 mr-4">
                      {player.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <span className="text-gray-800 font-semibold">
                      {player.name}
                    </span>
                  </div>
                  <span className="text-gray-600 ml-2">#{player.number}</span>
                </Link>
              );
            })
          )}
        </div>
      )}

      {schedule.length > 0 && (
        <div className="mb-6 max-w-xl mx-auto">
          <h3 className="text-lg font-semibold mb-2 text-center">
            Game History
          </h3>
          <ul className="space-y-2 text-sm">
            {schedule
              .filter((g) => g.gameId) // only include played games
              .map((game, idx) => {
                const opponent =
                  game.teamA === teamName ? game.teamB : game.teamA;
                const teamScore =
                  game.teamA === teamName ? game.scoreA : game.scoreB;
                const opponentScore =
                  game.teamA === teamName ? game.scoreB : game.scoreA;
                const isWin = teamScore > opponentScore;
                const gameUrl = `/boxscore/${game.gameId.replace("-", "/")}`;
                const week = game.gameId
                  ?.split("-")[0]
                  ?.replace("week", "Week ");

                return (
                  <li key={idx}>
                    <Link
                      to={gameUrl}
                      className={`block px-3 py-2 rounded-md shadow-sm ${
                        isWin ? "bg-green-800" : "bg-red-800"
                      } text-white hover:opacity-90 transition`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="truncate">
                          {week} vs {opponent}
                        </span>
                        <span className="font-mono">
                          {teamScore} - {opponentScore}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      {zoomUrl && <ZoomModal />}
    </div>
  );
};

export default TeamRoster;
