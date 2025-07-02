import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";

// simple slugify utility
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

function ProfileImage({ src, name, onClick }) {
  const [error, setError] = useState(false);
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");
  const baseClasses =
    "w-16 h-16 rounded-full flex items-center justify-center mt-8 cursor-pointer";

  if (!src || error) {
    return (
      <div
        onClick={onClick}
        className={`${baseClasses} bg-gray-700 text-xs font-bold text-gray-300`}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setError(true)}
      onClick={onClick}
      className={`${baseClasses} object-cover`}
    />
  );
}

export default function BoxScore() {
  const { week, gameId } = useParams();
  const [data, setData] = useState(null);
  const [scores, setScores] = useState({ a: null, b: null });
  const [matchInfo, setMatchInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("home");
  const [zoomUrl, setZoomUrl] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/${week}.json`),
      fetch("/full_schedule.json"),
      fetch("/players_with_images.json"),
    ])
      .then(async ([r1, r2, r3]) => {
        const w = await r1.json();
        const f = await r2.json();
        const roster = await r3.json();
        const game = w[gameId];

        // attach youtube URL
        setYoutubeUrl(game.youtubeUrl ?? null);

        // merge in imgUrl
        ["teamA", "teamB"].forEach((side) => {
          game[side].players = game[side].players.map((p) => {
            const info = roster[game[side].name]?.find(
              (rp) => rp.name === p.Player
            );
            return info ? { ...p, imgUrl: info.imgUrl } : p;
          });
        });

        setData(game);

        // find schedule entry
        const match =
          Array.isArray(f) && f.find((g) => g.gameId === `${week}-${gameId}`);
        setMatchInfo(match);

        if (match) {
          // align match.scoreA to game.teamA.name
          const aScore =
            match.teamA === game.teamA.name ? match.scoreA : match.scoreB;
          const bScore =
            match.teamB === game.teamB.name ? match.scoreB : match.scoreA;
          setScores({ a: aScore, b: bScore });
        } else {
          setScores({ a: null, b: null });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [week, gameId]);

  if (loading) return <p className="text-center py-8">Loading…</p>;
  if (!data) return <p className="text-center py-8">No box score found.</p>;

  const { teamA, teamB } = data;
  const totalA =
    scores.a ?? teamA.players.reduce((s, p) => s + (p.Points || 0), 0);
  const totalB =
    scores.b ?? teamB.players.reduce((s, p) => s + (p.Points || 0), 0);

  // --- always show teamA on left, teamB on right ---
  const Header = () => (
    <div className="grid grid-cols-3 justify-items-center mb-4">
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold">{totalA}</span>
        <span className="text-xs text-gray-400 mt-1">{teamA.name}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-sm uppercase text-gray-400">Final</span>
        {matchInfo?.date && (
          <span className="text-xs text-gray-400 mt-1">
            {matchInfo.date}
            {matchInfo.time ? ` · ${matchInfo.time}` : ""}
          </span>
        )}
      </div>
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold">{totalB}</span>
        <span className="text-xs text-gray-400 mt-1">{teamB.name}</span>
      </div>
    </div>
  );

  // which stats to render
  const statFields = [
    { label: "PTS", get: (p) => p.Points ?? 0 },
    { label: "FGM", get: (p) => p.FGM ?? 0 },
    { label: "FGA", get: (p) => p.FGA ?? 0 },
    { label: "FG%", get: (p) => p["FG %"] ?? "0%" },
    { label: "2PTM", get: (p) => p["2 PTM"] ?? 0 },
    { label: "2PTA", get: (p) => p["2 PTA"] ?? 0 },
    { label: "2PT%", get: (p) => p["2 Pt %"] ?? "0%" },
    { label: "3PTM", get: (p) => p["3 PTM"] ?? 0 },
    { label: "3PTA", get: (p) => p["3 PTA"] ?? 0 },
    { label: "3PT%", get: (p) => p["3 Pt %"] ?? "0%" },
    { label: "FTM", get: (p) => p.FTM ?? 0 },
    { label: "FTA", get: (p) => p.FTA ?? 0 },
    { label: "FT%", get: (p) => p["FT %"] ?? "0%" },
    { label: "REB", get: (p) => p.REB ?? 0 },
    { label: "TOs", get: (p) => p.TOs ?? 0 },
    { label: "Fouls", get: (p) => p.Fouls ?? 0 },
    { label: "STLS/BLKS", get: (p) => p["STLS/BLKS"] ?? 0 },
  ];

  // left‐hand column: images + names
  const LeftColumn = ({ team }) => (
    <div className="flex-none w-28">
      {team.players.map((p, idx) => {
        const overrideSlugMap = {
          "Jerremiah Dujuan Wright": "dujuan_wright",
        };
        const slug = overrideSlugMap[p.Player] || slugify(p.Player);

        return (
          <div
            key={idx}
            className="h-32 flex items-start justify-center border-b border-gray-800 relative"
          >
            <ProfileImage
              src={p.imgUrl}
              name={p.Player}
              onClick={() => setZoomUrl(p.imgUrl)}
            />
            <Link
              to={`/player/${slug}`}
              state={{
                from: `/boxscore/${week}/${gameId}`,
                label: "Box Score",
              }}
              className="absolute bottom-1 text-xs text-white text-center w-full whitespace-normal break-words px-.5 font-bold hover:text-green-400"
            >
              {p.Player}
            </Link>
          </div>
        );
      })}
    </div>
  );

  // stats table (horizontal scroll)
  const StatsTable = ({ team }) => (
    <div className="overflow-x-auto flex-1 -mt-8" ref={scrollRef}>
      <table className="min-w-full table-auto text-white border-separate border-spacing-0">
        <thead>
          <tr className="border-b border-gray-800">
            {statFields.map(({ label }) => (
              <th
                key={label}
                className="px-4 py-1 text-center whitespace-nowrap"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {team.players.map((p, idx) => {
            const isDNP = p.Points == null;
            return (
              <tr
                key={idx}
                className={`border-b border-gray-800 even:bg-gray-900 ${
                  isDNP ? "opacity-50" : ""
                }`}
              >
                {statFields.map(({ get, label }, i) => (
                  <td
                    key={i}
                    className="h-32 px-4 py-1 text-center whitespace-nowrap"
                  >
                    {isDNP ? (
                      <span className="font-bold text-lg leading-none">
                        DNP
                      </span>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <span className="font-bold text-lg leading-none">
                          {get(p)}
                        </span>
                        <span className="text-[12px] text-gray-400 mt-1">
                          {label}
                        </span>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // glue left + right
  const renderBoard = (team) => (
    <div className="flex">
      <LeftColumn team={team} />
      <StatsTable team={team} />
    </div>
  );

  // player-photo zoom modal
  const ZoomModal = () => (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={() => setZoomUrl(null)}
    >
      <div
        className="rounded-full overflow-hidden w-[80vw] h-[80vw] max-w-[600px] max-h-[600px]"
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
    <div
      style={{ zoom: 0.9 }}
      className="min-h-screen bg-black text-white p-4 max-w-full mx-auto"
    >
      <Header />

      {/* tabs */}
      <div className="flex border-b border-gray-700 mb-12">
        {[
          { id: "home", label: teamA.name },
          { id: "away", label: teamB.name },
          { id: "game", label: "Replay" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "flex-1 py-2 text-center " +
              (tab === t.id
                ? "border-b-2 border-red-500 text-red-500"
                : "text-gray-400")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* content */}
      {tab === "home" && renderBoard(teamA)}
      {tab === "away" && renderBoard(teamB)}
      {tab === "game" && (
        <div className="w-full h-[70vh]">
          <iframe
            src={youtubeUrl}
            title="Game Replay"
            allowFullScreen
            className="w-full h-full rounded-lg"
          />
        </div>
      )}

      {zoomUrl && <ZoomModal />}
    </div>
  );
}
