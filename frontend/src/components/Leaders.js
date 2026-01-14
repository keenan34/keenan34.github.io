
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const PUBLIC_URL = process.env.PUBLIC_URL || "";

function ProfileImage({ name, season, onClick }) {
  const [error, setError] = useState(false);

  // single exception for three-part name
  const slug =
    name === "Jerremiah Dujuan Wright" ? "dujuan_wright" : slugify(name);

  const src = `${PUBLIC_URL}/seasons/${season}/images/players/${slug}.png`;

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");

  if (error) {
    return (
      <div
        onClick={onClick}
        className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-700 flex items-center justify-center text-base font-bold text-gray-200 mr-2 cursor-pointer"
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      onClick={onClick}
      src={src}
      alt={name}
      width="40"
      height="40"
      className="h-10 w-10 flex-shrink-0 rounded-full object-cover mr-2 cursor-pointer"
      onError={() => setError(true)}
    />
  );
}

export default function Leaders() {
  const { season } = useParams();
  const activeSeason = season || "szn4";

  const [players, setPlayers] = useState([]);
  const [modalImage, setModalImage] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const weekNums = [1, 2, 3, 4, 5, 6, 7];

    const fetchWeek = async (n) => {
      // skip weeks that don't exist yet (prevents infinite "loading")
      const r = await fetch(
        `/seasons/${activeSeason}/week${n}.json?v=${Date.now()}`
      );
      if (!r.ok) return null;
      try {
        return await r.json();
      } catch {
        return null;
      }
    };

    const run = async () => {
      setError("");
      setPlayers([]);

      try {
        const weeks = (await Promise.all(weekNums.map(fetchWeek))).filter(
          Boolean
        );

        if (!weeks.length) {
          if (!cancelled)
            setError(
              `No week JSON files found for ${activeSeason} (expected week1.json, week2.json, etc).`
            );
          return;
        }

        const playerMap = {};

        const extractWeek = (weekJson) => {
          Object.values(weekJson || {}).forEach((game) => {
            ["teamA", "teamB"].forEach((side) => {
              (game?.[side]?.players || []).forEach((p) => {
                if (!p?.Player) return;
                if (p.Points == null) return; // DNP

                const name = p.Player;

                const pts = Number(p.Points) || 0;
                const ast = Number(p.AST ?? p.Assists ?? p.assists) || 0; // ✅ ASSISTS
                const three = Number(p["3 PTM"]) || 0;
                const reb = Number(p.REB) || 0;
                const tos = Number(p.TOs) || 0;
                const fouls = Number(p.Fouls) || 0;
                const stlBlk = Number(p["STLS/BLKS"]) || 0;

                if (!playerMap[name]) {
                  playerMap[name] = {
                    name,
                    totalPts: pts,
                    totalAst: ast, // ✅
                    total3: three,
                    totalReb: reb,
                    totalTO: tos,
                    totalFouls: fouls,
                    totalStlBlk: stlBlk,
                    games: 1,
                  };
                } else {
                  const cur = playerMap[name];
                  cur.totalPts += pts;
                  cur.totalAst += ast; // ✅
                  cur.total3 += three;
                  cur.totalReb += reb;
                  cur.totalTO += tos;
                  cur.totalFouls += fouls;
                  cur.totalStlBlk += stlBlk;
                  cur.games += 1;
                }
              });
            });
          });
        };

        weeks.forEach(extractWeek);

        const arr = Object.values(playerMap).map((p) => {
          const g = p.games || 1;
          return {
            ...p,
            avgPts: +(p.totalPts / g).toFixed(1),
            avgAst: +(p.totalAst / g).toFixed(1), // ✅
            avg3: +(p.total3 / g).toFixed(1),
            avgReb: +(p.totalReb / g).toFixed(1),
            avgTO: +(p.totalTO / g).toFixed(1),
            avgFouls: +(p.totalFouls / g).toFixed(1),
            avgStlBlk: +(p.totalStlBlk / g).toFixed(1),
          };
        });

        const filtered = arr.filter(
          (p) =>
            p.name !== "Josiah" &&
            p.name !== "Danial Asim" &&
            p.name !== "Salman" &&
            p.name !== "Ibrahim" &&
            p.name !== "Raedh Talha" &&
            p.name !== "Devon" &&
            p.name !== "Sufyan" &&
            p.name !== "Saif Rehman" &&
            p.name !== "Amaar Zafar" &&
            p.name !== "Luqman Ali" &&
            p.name !== "Imam Azfar Uddin"
            
        );

        if (!cancelled) setPlayers(filtered);
      } catch (e) {
        console.error("Error loading leader data:", e);
        if (!cancelled) {
          setError(e?.message || "Failed to load leaders.");
          setPlayers([]);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [activeSeason]);

  const getTopByAverage = (avgKey) =>
    [...players].sort((a, b) => b[avgKey] - a[avgKey]).slice(0, 10);

  const renderCategory = ({
    label,
    avgKey,
    totalKey,
    avgLabel,
    totalLabel,
  }) => {
    const top10 = getTopByAverage(avgKey);

    return (
      <div className="w-full max-w-full md:max-w-md mx-auto rounded-lg overflow-hidden shadow-lg bg-gray-800">
        <div className="bg-gray-900 py-2">
          <h2 className="text-center text-base font-semibold text-white">
            {label}
          </h2>
        </div>
        <div className="bg-gray-700 p-2 rounded-b-lg overflow-x-auto">
          <table className="table-fixed w-full text-sm border-collapse">
            <thead className="bg-gray-600">
              <tr>
                <th className="w-1/2 p-1 text-left text-gray-200">Player</th>
                <th className="w-1/6 px-1 py-2 text-right text-gray-200 font-bold border-l border-gray-500">
                  GP
                </th>
                <th className="w-1/6 px-1 py-2 text-right text-gray-200 font-bold border-l border-gray-500">
                  {avgLabel}
                </th>
                <th className="w-1/6 px-1 py-2 text-right text-gray-200 font-bold border-l border-gray-500">
                  {totalLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {top10.map((p, idx) => {
                const slug =
                  p.name === "Jerremiah Dujuan Wright"
                    ? "dujuan_wright"
                    : slugify(p.name);

                const imgSrc = `${PUBLIC_URL}/seasons/${activeSeason}/images/players/${slug}.png`;

                return (
                  <tr
                    key={p.name}
                    className={idx % 2 === 1 ? "bg-gray-700" : "bg-gray-800"}
                  >
                    <td className="p-1 flex items-center whitespace-nowrap text-white">
                      <ProfileImage
                        name={p.name}
                        season={activeSeason}
                        onClick={() => setModalImage(imgSrc)}
                      />
                      <span className="font-bold mr-1 text-xs">
                        {idx === 0
                          ? "🥇"
                          : idx === 1
                          ? "🥈"
                          : idx === 2
                          ? "🥉"
                          : `#${idx + 1}`}
                      </span>

                      <Link
                        to={
                          season
                            ? `/season/${activeSeason}/player/${slug}`
                            : `/player/${slug}`
                        }
                        state={{
                          from: season
                            ? `/season/${activeSeason}/leaders`
                            : "/leaders",
                          label: "Leaders",
                        }}
                        className="font-bold text-xs hover:underline text-white"
                      >
                        {p.name}
                      </Link>
                    </td>

                    <td className="px-1 py-2 text-right text-white font-bold">
                      {p.games}
                    </td>
                    <td className="px-1 py-2 text-right text-white font-bold">
                      {p[avgKey]}
                    </td>
                    <td className="px-1 py-2 text-right text-white font-bold">
                      {p[totalKey]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      {modalImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setModalImage(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="relative">
            <button
              className="absolute top-2 right-2 text-white text-2xl"
              onClick={() => setModalImage(null)}
            >
              &times;
            </button>
            <img
              src={modalImage}
              alt="Player"
              className="h-64 w-64 object-cover rounded-full shadow-lg"
            />
          </div>
        </div>
      )}

      {error ? (
        <p className="text-center py-4 text-red-400">{error}</p>
      ) : players.length === 0 ? (
        <p className="text-center py-4 text-gray-400">Loading leaders…</p>
      ) : (
        <div className="bg-gray-900 p-4">
          <h1 className="text-xl font-bold text-center mb-4 text-white">
            League Leaders
          </h1>

          <div className="flex flex-col gap-6 items-center">
            {renderCategory({
              label: "Points",
              avgKey: "avgPts",
              totalKey: "totalPts",
              avgLabel: "PTS/G",
              totalLabel: "PTS",
            })}

            {/* ✅ Assists */}
            {renderCategory({
              label: "Assists",
              avgKey: "avgAst",
              totalKey: "totalAst",
              avgLabel: "AST/G",
              totalLabel: "AST",
            })}

            {renderCategory({
              label: "3PT Made",
              avgKey: "avg3",
              totalKey: "total3",
              avgLabel: "3PT/G",
              totalLabel: "3PT",
            })}
            {renderCategory({
              label: "Rebounds",
              avgKey: "avgReb",
              totalKey: "totalReb",
              avgLabel: "REB/G",
              totalLabel: "REB",
            })}
            {renderCategory({
              label: "STLS/BLKS",
              avgKey: "avgStlBlk",
              totalKey: "totalStlBlk",
              avgLabel: "STL/BLK/G",
              totalLabel: "STL/BLK",
            })}
            {renderCategory({
              label: "Turnovers",
              avgKey: "avgTO",
              totalKey: "totalTO",
              avgLabel: "TO/G",
              totalLabel: "TO",
            })}
            {renderCategory({
              label: "Fouls",
              avgKey: "avgFouls",
              totalKey: "totalFouls",
              avgLabel: "FLS/G",
              totalLabel: "FLS",
            })}
          </div>
        </div>
      )}
    </>
  );
}
