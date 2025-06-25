import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const PUBLIC_URL = process.env.PUBLIC_URL || "";
function ProfileImage({ name, onClick }) {
    const [error, setError] = useState(false);
  
    // 🚨 single exception for three-part name
    const slug =
      name === "Jerremiah Dujuan Wright" ? "dujuan_wright" : slugify(name);
  
    const src = `${PUBLIC_URL}/images/players/${slug}.png`;
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
  const [players, setPlayers] = useState([]);
  const [modalImage, setModalImage] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("/week1.json"),
      fetch("/week2.json"),
      fetch("/week3.json"),
      fetch("/week4.json"),
    ])
      .then(async ([r1, r2, r3, r4]) => {
        if (!r1.ok || !r2.ok || !r3.ok|| !r4.ok) throw new Error("JSON load error");
        const [data1, data2, data3, data4] = await Promise.all([
          r1.json(),
          r2.json(),
          r3.json(),
          r4.json(),
        ]);

        const playerMap = {};
        const extractWeek = (weekJson) => {
          Object.values(weekJson).forEach((game) => {
            ["teamA", "teamB"].forEach((side) => {
              game[side].players.forEach((p) => {
                if (!p.Player) return;
                if (p.Points == null) return;

                const name = p.Player;
                const pts = +p.Points;
                const three = +p["3 PTM"];
                const reb = +p.REB;
                const tos = +p.TOs;
                const fouls = +p.Fouls;
                const stlBlk = +p["STLS/BLKS"];

                if (!playerMap[name]) {
                  playerMap[name] = {
                    name,
                    totalPts: pts,
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

        [data1, data2, data3, data4].forEach(extractWeek);

        const arr = Object.values(playerMap).map((p) => {
          const g = p.games || 1;
          return {
            ...p,
            avgPts: +(p.totalPts / g).toFixed(1),
            avg3: +(p.total3 / g).toFixed(1),
            avgReb: +(p.totalReb / g).toFixed(1),
            avgTO: +(p.totalTO / g).toFixed(1),
            avgFouls: +(p.totalFouls / g).toFixed(1),
            avgStlBlk: +(p.totalStlBlk / g).toFixed(1),
          };
        });

        const filtered = arr.filter(
          (p) => p.name !== "Josiah" && p.name !== "Danial Asim"
        );
        setPlayers(filtered);
      })
      .catch((err) => {
        console.error("Error loading leader data:", err);
        setPlayers([]);
      });
  }, []);

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
                const imgSrc = `${PUBLIC_URL}/images/players/${slug}.png`;
                return (
                  <tr
                    key={p.name}
                    className={idx % 2 === 1 ? "bg-gray-700" : "bg-gray-800"}
                  >
                    <td className="p-1 flex items-center whitespace-nowrap text-white">
                      <ProfileImage
                        name={p.name}
                        onClick={() => setModalImage(imgSrc)}
                      />
                      <span className="font-bold mr-1 text-xs">#{idx + 1}</span>
                      <Link
                        to={`/player/${slug}`}
                        state={{
                          from: "/leaders",
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

      {players.length === 0 ? (
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
