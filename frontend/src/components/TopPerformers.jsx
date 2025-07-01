// File: src/components/TopPerformers.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function ProfileImage({ name }) {
  const [error, setError] = useState(false);
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");

  const overrideMap = {
    jerremiah_dujuan_wright: "Jerremiah Dujuan Wright",
    "Jerremiah Dujuan Wright": "dujuan_wright.png",
    // add other mismatches here...
  };

  const fileName =
    overrideMap[name] ||
    name
      .toLowerCase()
      .split(" ")
      .map((n) => n.replace(/[^\w]/g, ""))
      .join("_") + ".png";

  const src = `/images/players/${fileName}`;

  if (error) {
    return (
      <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-200">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setError(true)}
      className="h-10 w-10 rounded-full object-cover"
    />
  );
}

export default function TopPerformers({ week = "week5" }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    fetch(`/${week}.json`)
      .then((res) => res.json())
      .then((json) => {
        const all = [];
        Object.values(json).forEach((game) => {
          const teamA = game.teamA?.name || "";
          const teamB = game.teamB?.name || "";
          game.teamA?.players?.forEach((p) =>
            all.push({ ...p, opponent: teamB })
          );
          game.teamB?.players?.forEach((p) =>
            all.push({ ...p, opponent: teamA })
          );
        });
        setPlayers(all);
      })
      .catch(() => setPlayers([]));
  }, [week]);

  if (!players.length) return null;
  const getTopPlayers = (stat) => {
    const max = Math.max(...players.map((p) => +p[stat] || 0));
    return players.filter((p) => +p[stat] === max && max > 0);
  };

  const topScorers = getTopPlayers("Points");
  const topRebounders = getTopPlayers("REB");
  const topStlBlks = getTopPlayers("STLS/BLKS");
  const top3PT = getTopPlayers("3 PTM");

  return (
    <div className="p-4 bg-gray-900 rounded-lg mb-1">
      <h2 className="text-xl font-bold text-white mb-4">
        Top Performers ({week.replace("week", "Week ")})
      </h2>
      <div className="flex flex-col gap-2">
        {[
          { label: "Scoring Week Leader", stat: "Points", players: topScorers },
          { label: "Rebound Week Leader", stat: "REB", players: topRebounders },
          { label: "3PTM Week Leader", stat: "3 PTM", players: top3PT },
          {
            label: "STL/BLK Week Leader",
            stat: "STLS/BLKS",
            players: topStlBlks,
          },
        ].map(({ label, stat, players: tiedPlayers }) => {
          return (
            <div
              key={stat}
              className="bg-gray-800 p-4 rounded-lg flex flex-col hover:bg-gray-700 transition-colors duration-150"
            >
              <div className="text-sm text-gray-400 mb-2">{label}</div>
              <div className="flex flex-wrap gap-4">
                {tiedPlayers.map((player) => {
                  const overrideSlugMap = {
                    "Jerremiah Dujuan Wright": "dujuan_wright",
                  };
                  const slug =
                    overrideSlugMap[player.Player] ||
                    player.Player.toLowerCase()
                      .split(" ")
                      .map((w) => w.replace(/[^\w]/g, ""))
                      .join("_");
                  return (
                    <Link
                      to={`/player/${slug}`}
                      key={`${stat}-${player.Player}`}
                      className="flex items-center"
                    >
                      <ProfileImage name={player.Player} />
                      <div className="ml-2">
                        <div className="text-sm font-semibold text-white">
                          {player.Player}
                        </div>
                        <div className="text-xs italic text-gray-400">
                          vs {player.opponent}
                        </div>
                        <div className="text-xs text-gray-300">
                          {player[stat]}{" "}
                          {{
                            Points: "Points",
                            REB: "Rebounds",
                            "3 PTM": "Threes Made",
                            "STLS/BLKS": "Steals/Blocks",
                          }[stat] || stat}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
