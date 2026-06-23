
// --- PlayerPage.js ---
import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { resolveApiBaseUrl } from "../api/baseUrl";
import { getSeasonGames } from "../api/client";

function ordinal(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

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
  player?.imgUrl || player?.image_url || player?.imageUrl || null;

function seasonPlayerImageUrl(season, playerSlug) {
  return `${PUBLIC_URL}/seasons/${season}/images/players/${playerSlug}.png`;
}

// normalize team names so Umma === UMMA === The Umma, etc
const normalizeTeam = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/^the\s+/, "")
    .replace(/\s+/g, " ");

const isPlayedGame = (status) => status === "final" || status === "finished";

export default function PlayerPage() {
  const { season, slug } = useParams();
  const activeSeason = season || "szn5";

  const location = useLocation();
  const navigate = useNavigate();

  const backTo = location.state?.from || "/";
  const backLabel = location.state?.label || "Home";

  const [games, setGames] = useState([]);
  const [allAverages, setAllAverages] = useState([]);
  const [zoomUrl, setZoomUrl] = useState(null);
  const [profile, setProfile] = useState(null);
  const [playerTeam, setPlayerTeam] = useState("");
  const [playerNumber, setPlayerNumber] = useState(null);
  const [scheduleGames, setScheduleGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const fallbackPlayerName =
    slug === "dujuan_wright"
      ? "Jerremiah Dujuan Wright"
      : slug
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
  const playerName = profile?.name || fallbackPlayerName;
  const apiImageUrl = playerImageUrl(profile);
  const imageUrl = season ? seasonPlayerImageUrl(activeSeason, slug) : apiImageUrl;
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // helper: find the schedule entry for a given week + opponent
  const findScheduleEntry = (weekKey, opponent) => {
    if (!scheduleGames?.length || !playerTeam) return null;

    const teamNorm = normalizeTeam(playerTeam);
    const oppNorm = normalizeTeam(opponent);

    // all games in that week involving player's team
    const teamGames = scheduleGames.filter((gm) => {
      if (!gm?.gameId?.startsWith(weekKey)) return false;
      const a = normalizeTeam(gm.teamA);
      const b = normalizeTeam(gm.teamB);
      return a === teamNorm || b === teamNorm;
    });

    if (!teamGames.length) return null;

    // pick the one against this opponent
    const exact = teamGames.find((gm) => {
      const a = normalizeTeam(gm.teamA);
      const b = normalizeTeam(gm.teamB);
      return (
        (a === teamNorm && b === oppNorm) || (b === teamNorm && a === oppNorm)
      );
    });

    return exact || null;
  };

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setErrorMsg("");
    setProfile(null);
    setGames([]);
    setScheduleGames([]);
    setAllAverages([]);
    setPlayerTeam("");
    setPlayerNumber(null);
    setImageFailed(false);
    setImageLoaded(false);

    Promise.all([
      apiGet(`/api/players/${encodeURIComponent(slug)}`, {
        signal: controller.signal,
      }),
      getSeasonGames(activeSeason, { signal: controller.signal }),
    ])
      .then(([data, gamesData]) => {
        const selectedSeason =
          (data?.seasons || []).find((row) => row.season === activeSeason);

        if (!data?.player) {
          throw new Error("Player not found.");
        }

        setProfile(data.player);

        const sched = Array.isArray(gamesData)
          ? gamesData
          : gamesData?.games || [];
        setScheduleGames(sched);

        if (!selectedSeason) {
          setGames([]);
          setAllAverages([]);
          setPlayerTeam("");
          setPlayerNumber(null);
          return;
        }

        setGames(selectedSeason.games || []);
        setAllAverages(selectedSeason.leagueAverages || []);
        setPlayerTeam(selectedSeason.team?.name || "");
        setPlayerNumber(selectedSeason.number || null);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Error loading player data:", err);
        setErrorMsg(err.message || "Failed to load player.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [activeSeason, slug]);

  // player averages
  const avg = {};
  if (games.length) {
    [
      "points",
      "rebounds",
      "assists",
      "fgm",
      "fga",
      "fgPct",
      "twoPtM",
      "twoPtA",
      "twoPtPct",
      "threePtM",
      "threePtA",
      "threePtPct",
      "ftm",
      "fta",
      "ftPct",
      "tos",
      "steals",
    ].forEach((k) => {
      const valid = games.filter((g) => g[k] != null);
      const total = valid.reduce((sum, g) => sum + Number(g[k] || 0), 0);
      avg[k] = valid.length ? +(total / valid.length).toFixed(1) : 0;
    });
  }

  // ranks
  const ranks = {};
  if (allAverages.length) {
    Object.keys(avg).forEach((stat) => {
      const sorted = allAverages
        .slice()
        .sort((a, b) => (b.avg[stat] || 0) - (a.avg[stat] || 0));

      let currentRank = 1;
      let previousValue = null;
      const rankMap = {};
      for (let i = 0; i < sorted.length; i++) {
        const val = sorted[i].avg[stat];
        if (val !== previousValue) currentRank = i + 1;
        rankMap[sorted[i].name] = ordinal(currentRank);
        previousValue = val;
      }

      if (playerName in rankMap) ranks[stat] = rankMap[playerName];
    });
  }

  const ZoomModal = () => (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={() => setZoomUrl(null)}
    >
      <div
        className="rounded-full overflow-hidden w-[70vw] h-[70vw] max-w-[520px] max-h-[520px]"
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

  // stat order (17 stats)
  const statOrder = [
    { label: "PTS", key: "points" },
    { label: "REB", key: "rebounds" },
    { label: "AST", key: "assists" },
    { label: "FGM", key: "fgm" },
    { label: "FGA", key: "fga" },
    { label: "FG%", key: "fgPct" },
    { label: "2PTM", key: "twoPtM" },
    { label: "2PTA", key: "twoPtA" },
    { label: "2P%", key: "twoPtPct" },
    { label: "3PTM", key: "threePtM" },
    { label: "3PTA", key: "threePtA" },
    { label: "3P%", key: "threePtPct" },
    { label: "FTM", key: "ftm" },
    { label: "FTA", key: "fta" },
    { label: "FT%", key: "ftPct" },
    { label: "TO", key: "tos" },
    { label: "STL/BLK", key: "steals" },
  ];

  // chunkA = 9 stats, chunkB = 8 stats
  const chunkA = statOrder.slice(0, 9);
  const chunkB = statOrder.slice(9);

  if (loading) {
    return <p className="py-8 text-center font-bold text-[#64748b]">Loading player…</p>;
  }

  if (errorMsg) {
    return <p className="py-8 text-center font-bold text-[#f87171]">{errorMsg}</p>;
  }

  if (!profile) {
    return <p className="py-8 text-center font-bold text-[#64748b]">No player found.</p>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-3 py-4 text-base text-[#0f172a] sm:px-6 sm:py-6 sm:text-lg">
      <div className="relative w-full max-w-4xl mx-auto mb-6">
        {/* Top Buttons */}
        <div className="flex justify-between items-start mb-4">
          <button
            onClick={() => navigate(backTo)}
            className="text-xs font-bold text-[#64748b] hover:text-[#0284c7] sm:text-sm"
          >
            ← Back to {backLabel}
          </button>

          {playerTeam && (
            <button
              onClick={() =>
                navigate(
                  `/season/${activeSeason}/teams/${encodeURIComponent(
                    playerTeam
                  )}/roster`
                )
              }
              className="text-xs font-bold text-[#64748b] hover:text-[#0284c7] sm:text-sm"
            >
              → {playerTeam} Team Page
            </button>
          )}
        </div>

        {/* Centered Player Info & Averages */}
        <div className="flex flex-col items-center">
          {/* Avatar */}
          <div
            className="relative mb-3 flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#ffffff] text-3xl font-black text-[#64748b] ring-4 ring-[#0f172a] sm:h-40 sm:w-40 sm:text-5xl"
            onClick={() =>
              imageUrl && !imageFailed && setZoomUrl(imageUrl)
            }
          >
            {imageUrl && !imageFailed && (
              <img
                src={imageUrl}
                alt={playerName}
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  if (!season && apiImageUrl && e.currentTarget.src !== apiImageUrl) {
                    e.currentTarget.src = apiImageUrl;
                    return;
                  }
                  setImageFailed(true);
                }}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
            )}
            {playerName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>

          {/* Player Name */}
          <h1 className="mb-4 text-center text-2xl font-black leading-tight sm:text-4xl">
            {playerNumber ? (
              <span className="italic text-[#64748b]">#{playerNumber} </span>
            ) : (
              ""
            )}
            {playerName}
          </h1>

          {/* Averages Box */}
          {games.length > 0 && (
            <div className="w-full max-w-lg rounded-lg border border-[#e2e8f0] bg-[#ffffff] p-2 shadow-sm sm:max-w-md sm:p-3">
              <div className="mb-2 text-xs font-black text-[#64748b]">
                {activeSeason.toUpperCase()}
              </div>

              {/* Chunk A (9 stats) - NO SCROLL */}
              <div>
                <div className="mb-1 grid grid-cols-9 gap-x-1 gap-y-1 text-center text-[9px] font-black leading-none text-[#64748b] sm:gap-x-3 sm:text-[12px]">
                  {chunkA.map((s) => (
                    <div key={s.key} className="whitespace-nowrap">
                      {s.label}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-9 gap-x-1 gap-y-1 text-center text-[11px] font-black leading-none text-[#0f172a] sm:gap-x-3 sm:text-lg">
                  {chunkA.map((s) => (
                    <div key={s.key} className="tabular-nums whitespace-nowrap">
                      {avg[s.key]}
                    </div>
                  ))}
                </div>

                <div className="mt-1 grid grid-cols-9 gap-x-1 gap-y-1 text-center text-[9px] font-bold leading-none text-[#64748b] sm:gap-x-3 sm:text-sm">
                  {chunkA.map((s) => (
                    <div key={s.key} className="whitespace-nowrap">
                      {ranks[s.key]}
                    </div>
                  ))}
                </div>
              </div>

              {/* Chunk B (8 stats) - NO SCROLL */}
              <div className="mt-5">
                <div className="mb-1 grid grid-cols-8 gap-x-1 gap-y-1 text-center text-[9px] font-black leading-none text-[#64748b] sm:gap-x-3 sm:text-[12px]">
                  {chunkB.map((s) => (
                    <div key={s.key} className="whitespace-nowrap">
                      {s.label}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-8 gap-x-1 gap-y-1 text-center text-[11px] font-black leading-none text-[#0f172a] sm:gap-x-3 sm:text-lg">
                  {chunkB.map((s) => (
                    <div key={s.key} className="tabular-nums whitespace-nowrap">
                      {avg[s.key]}
                    </div>
                  ))}
                </div>

                <div className="mt-1 grid grid-cols-8 gap-x-1 gap-y-1 text-center text-[9px] font-bold leading-none text-[#64748b] sm:gap-x-3 sm:text-sm">
                  {chunkB.map((s) => (
                    <div key={s.key} className="whitespace-nowrap">
                      {ranks[s.key]}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {zoomUrl && <ZoomModal />}
      </div>

      {/* GAME LOG TABLE */}
      <div className="mt-10 overflow-x-auto text-sm sm:text-lg">
        <table className="w-full border-separate border-spacing-y-2 text-[#0f172a]">
          <thead className="bg-[#f8fafc]">
            <tr className="rounded-lg">
              {[
                "Week",
                "Opp",
                "Result",
                "PTS",
                "FGM",
                "FGA",
                "FG%",
                "2PM",
                "2PA",
                "2P%",
                "3PM",
                "3PA",
                "3P%",
                "FTM",
                "FTA",
                "FT%",
                "REB",
                "AST",
                "TO",
                "FLS",
                "STL/BLKS",
              ].map((col, idx) => (
                <th
                  key={col}
                  className={`bg-[#f8fafc] px-2 py-3 text-center text-xs font-black text-[#64748b] sm:px-4 sm:text-base ${
                    idx === 0
                      ? "rounded-l-lg"
                      : idx === 20
                      ? "rounded-r-lg"
                      : ""
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {games.length === 0 ? (
              <tr className="bg-[#ffffff]">
                <td
                  colSpan={21}
                  className="rounded-lg px-2 py-6 text-center font-bold text-[#64748b] sm:px-4"
                >
                  No games found.
                </td>
              </tr>
            ) : (
              games.map((g, i) => {
              const weekKey = g.week.toLowerCase().replace(/ /g, "");
              const entry = findScheduleEntry(weekKey, g.opponent);
              const isPlayed = entry ? isPlayedGame(entry.status) : g.points != null;

              // compute W/L + show score
              let resultText = "-";
              if (entry && isPlayed) {
                const a = Number(entry.scoreA);
                const b = Number(entry.scoreB);

                if (Number.isFinite(a) && Number.isFinite(b)) {
                  const teamNorm = normalizeTeam(playerTeam);
                  const aIsTeam = normalizeTeam(entry.teamA) === teamNorm;

                  const myScore = aIsTeam ? a : b;
                  const oppScore = aIsTeam ? b : a;

                  resultText = `${
                    myScore > oppScore ? "W" : "L"
                  } ${myScore}-${oppScore}`;
                }
              }

              return (
                <tr
                  key={i}
                  className={`${
                    i % 2 === 0 ? "bg-[#ffffff]" : "bg-[#f8fafc]"
                  } cursor-pointer`}
                  onClick={() => {
                    if (!isPlayed) return;
                    if (!entry?.gameId) return;
                    const [, gameKey] = entry.gameId.split("-");
                    if (!gameKey) return;
                    window.scrollTo(0, 0);
                    navigate(
                      `/season/${activeSeason}/boxscore/${weekKey}/${gameKey}`
                    );
                  }}
                >
                  <td className="px-2 sm:px-4 py-3 sm:py-4 text-left whitespace-nowrap rounded-l-lg">
                    {g.week}
                  </td>

                  <td className="px-2 sm:px-4 py-3 sm:py-4 text-left whitespace-nowrap">
                    {g.opponent}
                  </td>

                  <td className="px-2 sm:px-4 py-3 sm:py-4 text-center font-bold">
                    {resultText}
                  </td>

                  {[
                    g.points,
                    g.fgm,
                    g.fga,
                    g.fgPct,
                    g.twoPtM,
                    g.twoPtA,
                    g.twoPtPct,
                    g.threePtM,
                    g.threePtA,
                    g.threePtPct,
                    g.ftm,
                    g.fta,
                    g.ftPct,
                    g.rebounds,
                    g.assists,
                    g.tos,
                    g.fouls,
                    g.steals,
                  ].map((val, idx) => (
                    <td
                      key={idx}
                      className={`px-2 sm:px-4 py-3 sm:py-4 text-center ${
                        idx === 17 ? "rounded-r-lg" : ""
                      }`}
                    >
                      {val == null ? (isPlayed ? "DNP" : "-") : val}
                    </td>
                  ))}
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
