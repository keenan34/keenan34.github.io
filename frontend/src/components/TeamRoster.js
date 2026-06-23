
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const teamColors = {
  UMMA: "bg-[#ffffff] text-[#0f172a]",
  Umma: "bg-[#ffffff] text-[#0f172a]",

  TNB: "bg-[#ffffff] text-[#0f172a]",

  "The Northmen": "bg-[#ffffff] text-[#0f172a]",

  "Chi-Elite": "bg-[#ffffff] text-[#0f172a]",

  Mujahideens: "bg-[#ffffff] text-[#0f172a]",
  "The Mujahideens": "bg-[#ffffff] text-[#0f172a]",
};

const PUBLIC_URL = process.env.PUBLIC_URL || "";

// same slug rule you used elsewhere
const slugify = (str) =>
  String(str)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const isPlayedGame = (status) => status === "final" || status === "finished";

function ProfileImage({ name, season, imgUrl }) {
  const [error, setError] = useState(false);

  const overrideSlugMap = {
    "Jerremiah Dujuan Wright": "dujuan_wright",
  };

  const slug = overrideSlugMap[name] || slugify(name);

  // prefer imgUrl from players_with_images.json, fallback to local images folder
  const src =
    imgUrl || `${PUBLIC_URL}/seasons/${season}/images/players/${slug}.png`;

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 3);

  if (error) {
    return (
      <div className="mr-3 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#f8fafc] text-xs font-black text-[#64748b]">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      width="44"
      height="44"
      className="h-11 w-11 rounded-full object-cover mr-3 flex-shrink-0"
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

export default function TeamRoster() {
  const { season, id } = useParams();
  const activeSeason = season || "szn5";

  const teamName = decodeURIComponent(id);
  const colorClass = teamColors[teamName] || "bg-[#ffffff] text-[#0f172a]";

  const [roster, setRoster] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const v = Date.now();
    Promise.all([
      fetch(`/seasons/${activeSeason}/team_rosters.json?v=${v}`).then((r) => r.json()),
      fetch(`/seasons/${activeSeason}/players_with_images.json?v=${v}`).then((r) =>
        r.json()
      ),
      fetch(`/seasons/${activeSeason}/full_schedule.json?v=${v}`).then(
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
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 text-[#0f172a] sm:px-6">
      <h2
        className={`mx-auto mb-8 max-w-3xl rounded-lg border border-[#e2e8f0] p-5 text-center text-3xl font-black shadow-sm ${colorClass}`}
      >
        {teamName} Team Page
      </h2>

      {loading ? (
        <p className="text-center font-bold text-[#64748b]">Loading...</p>
      ) : (
        <div className="mx-auto max-w-3xl space-y-8">
          {/* ROSTER */}
          <div>
            <h3 className="mb-3 text-xl font-black text-[#0f172a]">Roster</h3>
            <div className="space-y-3">
              {roster.map((player, idx) => {
                const overrideSlugMap = {
                  "Jerremiah Dujuan Wright": "dujuan_wright",
                };
                const slug = overrideSlugMap[player.name] || slugify(player.name);

                return (
                  <Link
                    key={idx}
                    to={playerLink(slug)}
                    className="flex w-full items-center rounded-lg border border-[#e2e8f0] bg-[#ffffff] p-4 shadow-sm transition hover:border-[#0284c7] hover:shadow-md"
                  >
                    <ProfileImage
                      name={player.name}
                      season={activeSeason}
                      imgUrl={player.imgUrl}
                    />

                    <div className="flex-1 min-w-0">
                      <span className="text-[#0f172a] font-semibold block truncate">
                        {player.name}
                      </span>
                    </div>

                    <span className="text-[#64748b] ml-2 flex-shrink-0">
                      #{player.number}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* GAME HISTORY */}
          <div>
            <h3 className="mb-3 text-xl font-black text-[#0f172a]">Game History</h3>

            {games.length === 0 ? (
              <p className="font-bold text-[#64748b]">No games yet.</p>
            ) : (
              <div className="space-y-3">
                {games.map((g, idx) => {
                  const isHome = g.teamA === teamName;
                  const myScore = isHome ? g.scoreA : g.scoreB;
                  const oppScore = isHome ? g.scoreB : g.scoreA;
                  const opp = isHome ? g.teamB : g.teamA;

                  const hasScore =
                    isPlayedGame(g.status) &&
                    typeof g.scoreA === "number" &&
                    typeof g.scoreB === "number";
                  const won = hasScore && myScore > oppScore;
                  const lost = hasScore && myScore < oppScore;

                  const link = hasScore ? boxscoreLink(g) : null;

                  const row = (
                    <div className="flex items-center justify-between rounded-lg border border-[#e2e8f0] bg-[#ffffff] px-4 py-3 shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#64748b]">
                          {g.date} {g.time ? `· ${g.time}` : ""}
                        </span>
                        <span className="font-black text-[#0f172a]">vs {opp}</span>
                      </div>

                      <div className="text-right">
                        {hasScore ? (
                          <>
                            <span className="font-black text-[#0f172a]">
                              {myScore}-{oppScore}
                            </span>
                            <div
                              className={`text-xs font-semibold ${
                                won
                                  ? "text-[#34d399]"
                                  : lost
                                  ? "text-[#f87171]"
                                  : "text-[#64748b]"
                              }`}
                            >
                              {won ? "W" : lost ? "L" : ""}
                            </div>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-[#64748b]">Scheduled</span>
                        )}
                      </div>
                    </div>
                  );

                  return link ? (
                    <Link
                      key={idx}
                      to={link}
                      className="block no-underline"
                      onClick={() => window.scrollTo(0, 0)}
                    >
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
