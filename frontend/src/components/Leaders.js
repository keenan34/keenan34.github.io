
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { resolveApiBaseUrl } from "../api/baseUrl";

const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const API_BASE_URL = resolveApiBaseUrl();
const PUBLIC_URL = process.env.PUBLIC_URL || "";

async function apiGet(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `API request failed with ${response.status}`);
  }

  return data;
}

const playerImageUrl = (player) =>
  player.imgUrl || player.image_url || player.imageUrl || null;

function seasonPlayerImageUrl(season, name) {
  const fileName =
    name === "Jerremiah Dujuan Wright"
      ? "dujuan_wright"
      : slugify(name);
  return `${PUBLIC_URL}/seasons/${season}/images/players/${fileName}.png`;
}

function ProfileImage({ name, src, fallbackSrc, onClick }) {
  const [error, setError] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);

  useEffect(() => {
    setError(false);
    setTriedFallback(false);
  }, [src, fallbackSrc]);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");

  if ((!src && !fallbackSrc) || error) {
    return (
      <div
        onClick={onClick}
        className="mr-2 flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-base font-black text-slate-600"
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      onClick={onClick}
      src={triedFallback ? fallbackSrc : src}
      alt={name}
      width="40"
      height="40"
      className="h-10 w-10 flex-shrink-0 rounded-full object-cover mr-2 cursor-pointer"
      onError={() => {
        if (!triedFallback && fallbackSrc) {
          setTriedFallback(true);
          return;
        }
        setError(true);
      }}
    />
  );
}

export default function Leaders() {
  const { season } = useParams();
  const activeSeason = season || "szn5";

  const [players, setPlayers] = useState([]);
  const [modalImage, setModalImage] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError("");
      setPlayers([]);

      try {
        const data = await apiGet(
          `/api/leaders/${encodeURIComponent(activeSeason)}`,
          {
            signal: controller.signal,
          }
        );

        const filtered = (data?.leaders || []).filter(
          (p) =>
            p.name !== "Josiah" &&
            p.name !== "Danial Asim" &&
            p.name !== "Salman" &&
            p.name !== "Ibrahim" &&
            p.name !== "Imran" &&
            p.name !== "Anthony" &&
            p.name !== "Raedh Talha" &&
            p.name !== "Devon" &&
            p.name !== "Suhail" &&
            p.name !== "Sufyan" &&
            p.name !== "Saif Rehman" &&
            p.name !== "Amaar Zafar" &&
            p.name !== "Luqman Ali" &&
            p.name !== "Ryan" &&
            p.name !== "Imam Azfar Uddin"
        );

        setPlayers(filtered);
      } catch (e) {
        if (e.name === "AbortError") return;
        console.error("Error loading leader data:", e);
        setError(e?.message || "Failed to load leaders.");
        setPlayers([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    run();

    return () => {
      controller.abort();
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
      <div className="mx-auto w-full max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:max-w-md">
        <div className="border-b border-slate-200 bg-slate-50 py-3">
          <h2 className="text-center text-base font-black text-slate-950">
            {label}
          </h2>
        </div>
        <div className="overflow-x-auto bg-white p-2">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-1/2 p-1 text-left font-black text-slate-500">Player</th>
                <th className="w-1/6 border-l border-slate-200 px-1 py-2 text-right font-black text-slate-500">
                  GP
                </th>
                <th className="w-1/6 border-l border-slate-200 px-1 py-2 text-right font-black text-slate-500">
                  {avgLabel}
                </th>
                <th className="w-1/6 border-l border-slate-200 px-1 py-2 text-right font-black text-slate-500">
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

                const apiImgSrc = playerImageUrl(p);
                const imgSrc = season
                  ? seasonPlayerImageUrl(activeSeason, p.name)
                  : apiImgSrc;

                return (
                  <tr
                    key={p.name}
                    className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}
                  >
                    <td className="flex items-center whitespace-nowrap p-1 text-slate-950">
                      <ProfileImage
                        name={p.name}
                        src={imgSrc}
                        fallbackSrc={season ? null : apiImgSrc}
                        onClick={() => imgSrc && setModalImage(imgSrc)}
                      />
                      <span className="mr-1 text-xs font-black">
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
                        className="text-xs font-black text-slate-950 hover:text-blue-700 hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>

                    <td className="px-1 py-2 text-right font-black text-slate-800">
                      {p.games}
                    </td>
                    <td className="px-1 py-2 text-right font-black text-slate-800">
                      {p[avgKey]}
                    </td>
                    <td className="px-1 py-2 text-right font-black text-slate-800">
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
        <p className="py-4 text-center font-bold text-red-600">{error}</p>
      ) : loading ? (
        <p className="py-4 text-center font-bold text-slate-500">Loading leaders…</p>
      ) : players.length === 0 ? (
        <p className="py-4 text-center font-bold text-slate-500">No leaders found.</p>
      ) : (
        <div className="min-h-screen bg-[#f6f8fb] px-4 py-8">
          <h1 className="mb-6 text-center text-3xl font-black tracking-tight text-slate-950">
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
