
// --- PlayerPage.js ---
import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { resolveApiBaseUrl } from "../api/baseUrl";
import { getSeasonGames } from "../api/client";
import { SkeletonBlock, SkeletonBar, SkeletonCircle } from "./Skeleton";

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

const isTopThree = (rank) => /^(1st|2nd|3rd)$/.test(rank || "");

const seasonLabel = (slug) => {
  const m = /^szn(\d+)$/i.exec(slug || "");
  return m ? `Season ${m[1]}` : (slug || "").toUpperCase();
};

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

  // Close the zoomed photo with Escape.
  useEffect(() => {
    if (!zoomUrl) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setZoomUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomUrl]);

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
    { label: "STK", key: "steals" },
  ];

  // chunkA = 9 stats, chunkB = 8 stats
  const chunkA = statOrder.slice(0, 9);
  const chunkB = statOrder.slice(9);

  // marquee trio for the hero card
  const heroStats = [
    { label: "PPG", key: "points" },
    { label: "RPG", key: "rebounds" },
    { label: "APG", key: "assists" },
  ];

  const renderAvgChunk = (chunk, cols) => (
    <div>
      <div
        className={`mb-1.5 grid gap-x-1 gap-y-1 text-center text-[9px] font-black uppercase tracking-wide leading-none text-[color:var(--muted)] sm:gap-x-3 sm:text-[11px]`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {chunk.map((s) => (
          <div key={s.key} className="whitespace-nowrap">
            {s.label}
          </div>
        ))}
      </div>

      <div
        className="ifn-display grid gap-x-1 gap-y-1 text-center text-sm leading-none text-white tabular-nums sm:gap-x-3 sm:text-2xl"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {chunk.map((s) => (
          <div key={s.key} className="whitespace-nowrap">
            {avg[s.key]}
          </div>
        ))}
      </div>

      <div
        className="mt-1.5 grid gap-x-1 gap-y-1 text-center text-[9px] font-bold leading-none sm:gap-x-3 sm:text-xs"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {chunk.map((s) => (
          <div
            key={s.key}
            className={`whitespace-nowrap ${
              isTopThree(ranks[s.key]) ? "text-[#38bdf8]" : "text-[#8f9aa8]"
            }`}
          >
            {ranks[s.key]}
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--bg)] px-3 py-6 sm:px-6">
        <SkeletonBlock className="mx-auto w-full max-w-5xl">
          {/* hero */}
          <div className="mb-5 flex flex-col items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-8">
            <SkeletonCircle className="h-28 w-28 sm:h-36 sm:w-36" />
            <SkeletonBar className="h-8 w-56" />
            <SkeletonBar className="h-4 w-40" />
            <div className="mt-4 flex gap-10">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <SkeletonBar className="h-10 w-16" />
                  <SkeletonBar className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
          {/* averages */}
          <div className="mb-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
            <SkeletonBar className="mb-4 h-4 w-40" />
            <SkeletonBar className="mb-2 h-3 w-full" />
            <SkeletonBar className="mb-6 h-6 w-full" />
            <SkeletonBar className="mb-2 h-3 w-full" />
            <SkeletonBar className="h-6 w-full" />
          </div>
          {/* game log */}
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
            <SkeletonBar className="mb-4 h-4 w-28" />
            {Array.from({ length: 5 }).map((_, idx) => (
              <SkeletonBar key={idx} className="mb-2 h-9 w-full" />
            ))}
          </div>
        </SkeletonBlock>
      </div>
    );
  }

  if (errorMsg) {
    return <p className="py-8 text-center font-bold text-[#f87171]">{errorMsg}</p>;
  }

  if (!profile) {
    return (
      <p className="py-8 text-center font-bold text-[color:var(--muted)]">
        No player found.
      </p>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--bg)] px-3 py-6 text-white sm:px-6">
      {zoomUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomUrl(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col items-center"
          >
            <button
              className="absolute -right-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border)] bg-[#101820] text-lg font-black text-white"
              onClick={() => setZoomUrl(null)}
              aria-label="Close photo"
            >
              &times;
            </button>
            <img
              src={zoomUrl}
              alt={playerName}
              className="h-72 w-72 rounded-2xl object-cover shadow-2xl ring-1 ring-[color:var(--border)] sm:h-96 sm:w-96"
            />
            <p className="mt-3 text-lg font-black italic text-white">
              {playerName}
            </p>
          </div>
        </div>
      )}

      <div className="ifn-fade-in mx-auto w-full max-w-5xl">
        {/* Top links */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(backTo)}
            className="rounded-full border border-transparent px-3 py-1.5 text-xs font-black uppercase italic tracking-wide text-[color:var(--muted)] transition hover:border-[color:var(--border)] hover:bg-[color:var(--panel)] hover:text-white"
          >
            ← {backLabel}
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
              className="rounded-full border border-transparent px-3 py-1.5 text-xs font-black uppercase italic tracking-wide text-[color:var(--muted)] transition hover:border-[color:var(--border)] hover:bg-[color:var(--panel)] hover:text-white"
            >
              {playerTeam} →
            </button>
          )}
        </div>

        {/* HERO — identity card */}
        <div className="relative mb-5 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] px-4 py-8 sm:px-8">
          {/* Ghosted jersey number */}
          {playerNumber != null && (
            <span
              aria-hidden="true"
              className="ifn-display pointer-events-none absolute -top-6 right-2 select-none text-[150px] leading-none text-white/[0.05] sm:-top-10 sm:right-6 sm:text-[240px]"
            >
              {playerNumber}
            </span>
          )}

          <div className="relative flex flex-col items-center">
            {/* Photo */}
            <div
              className={`relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-[#101820] text-3xl font-black text-[color:var(--muted)] ring-2 ring-[color:var(--border)] sm:h-36 sm:w-36 sm:text-4xl ${
                imageUrl && !imageFailed ? "cursor-zoom-in" : ""
              }`}
              onClick={() => imageUrl && !imageFailed && setZoomUrl(imageUrl)}
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

            {/* Name + meta */}
            <h1 className="mt-4 text-center text-3xl font-black italic leading-tight tracking-tight sm:text-4xl">
              {playerName}
            </h1>
            <p className="mt-1.5 text-center text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--muted)] sm:text-sm">
              {playerNumber != null && <span>#{playerNumber} · </span>}
              {playerTeam && <span>{playerTeam} · </span>}
              {seasonLabel(activeSeason)}
              {games.length > 0 && <span> · {games.length} games</span>}
            </p>

            {/* Marquee trio */}
            {games.length > 0 && (
              <div className="mt-6 flex items-start justify-center gap-10 sm:gap-16">
                {heroStats.map((s) => (
                  <div key={s.key} className="flex flex-col items-center">
                    <span className="ifn-display text-4xl leading-none text-white tabular-nums sm:text-5xl">
                      {avg[s.key]}
                    </span>
                    <span className="mt-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--muted)]">
                      {s.label}
                    </span>
                    {ranks[s.key] && (
                      <span
                        className={`mt-0.5 text-[10px] font-black uppercase tracking-wide ${
                          isTopThree(ranks[s.key])
                            ? "text-[#38bdf8]"
                            : "text-[#8f9aa8]"
                        }`}
                      >
                        {ranks[s.key]} in league
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SEASON AVERAGES — full grid (labels / values / league rank) */}
        {games.length > 0 && (
          <div className="mb-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 sm:p-5">
            <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-[color:var(--border)] pb-3">
              <h2 className="text-sm font-black uppercase italic tracking-[0.18em] text-white">
                Season Averages
              </h2>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--muted)]">
                per game · league rank
              </span>
            </div>

            {renderAvgChunk(chunkA, 9)}
            <div className="mt-5">{renderAvgChunk(chunkB, 8)}</div>
          </div>
        )}

        {/* GAME LOG */}
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 sm:p-5">
          <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-[color:var(--border)] pb-3">
            <h2 className="text-sm font-black uppercase italic tracking-[0.18em] text-white">
              Game Log
            </h2>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--muted)]">
              tap a game for the box score
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr>
                  {[
                    "Week",
                    "Opp",
                    "Result",
                    "PTS",
                    "REB",
                    "AST",
                    "STK",
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
                    "TO",
                    "FLS",
                  ].map((col, idx) => (
                    <th
                      key={col}
                      className={`whitespace-nowrap border-b border-[color:var(--border)] px-2 py-2.5 text-[9px] font-black uppercase tracking-wider text-[color:var(--muted)] sm:px-3 sm:text-[11px] ${
                        idx <= 1 ? "text-left" : "text-center"
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {games.length === 0 ? (
                  <tr>
                    <td
                      colSpan={21}
                      className="px-3 py-8 text-center font-bold text-[color:var(--muted)]"
                    >
                      No games this season.
                    </td>
                  </tr>
                ) : (
                  games.map((g, i) => {
                    const weekKey = g.week.toLowerCase().replace(/ /g, "");
                    const entry = findScheduleEntry(weekKey, g.opponent);
                    const isPlayed = entry
                      ? isPlayedGame(entry.status)
                      : g.points != null;

                    // compute W/L + score
                    let won = null;
                    let scoreText = "";
                    if (entry && isPlayed) {
                      const a = Number(entry.scoreA);
                      const b = Number(entry.scoreB);

                      if (Number.isFinite(a) && Number.isFinite(b)) {
                        const teamNorm = normalizeTeam(playerTeam);
                        const aIsTeam =
                          normalizeTeam(entry.teamA) === teamNorm;

                        const myScore = aIsTeam ? a : b;
                        const oppScore = aIsTeam ? b : a;

                        won = myScore > oppScore;
                        scoreText = `${myScore}-${oppScore}`;
                      }
                    }

                    const statVals = [
                      g.points,
                      g.rebounds,
                      g.assists,
                      g.steals,
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
                      g.tos,
                      g.fouls,
                    ];
                    const isDNP =
                      isPlayed && statVals.every((v) => v == null);

                    const clickable = isPlayed && entry?.gameId;

                    return (
                      <tr
                        key={i}
                        className={`border-b border-[#12202e] last:border-b-0 ${
                          clickable
                            ? "cursor-pointer transition hover:bg-[#101820]"
                            : ""
                        }`}
                        onClick={() => {
                          if (!clickable) return;
                          const [, gameKey] = entry.gameId.split("-");
                          if (!gameKey) return;
                          navigate(
                            `/season/${activeSeason}/boxscore/${weekKey}/${gameKey}`
                          );
                        }}
                      >
                        <td className="whitespace-nowrap px-2 py-3 text-left font-bold text-[color:var(--muted)] sm:px-3">
                          {g.week}
                        </td>

                        <td className="whitespace-nowrap px-2 py-3 text-left font-bold text-white sm:px-3">
                          {g.opponent}
                        </td>

                        <td className="whitespace-nowrap px-2 py-3 text-center sm:px-3">
                          {won == null ? (
                            <span className="text-[color:var(--muted)]">—</span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black sm:text-xs ${
                                won
                                  ? "bg-[rgba(52,211,153,0.12)] text-[#34d399]"
                                  : "bg-[rgba(248,113,113,0.12)] text-[#f87171]"
                              }`}
                            >
                              {won ? "W" : "L"}
                              <span className="tabular-nums">{scoreText}</span>
                            </span>
                          )}
                        </td>

                        {isDNP ? (
                          <td
                            colSpan={18}
                            className="px-2 py-3 text-center text-xs font-bold italic text-[#8f9aa8] sm:px-3"
                          >
                            Did not play
                          </td>
                        ) : (
                          statVals.map((val, idx) => (
                            <td
                              key={idx}
                              className={`px-2 py-3 text-center tabular-nums sm:px-3 ${
                                idx === 0
                                  ? "font-black text-white"
                                  : "font-semibold text-[#c3ccd8]"
                              }`}
                            >
                              {val == null ? (
                                <span className="text-[#5c6b7d]">
                                  {isPlayed ? "DNP" : "-"}
                                </span>
                              ) : (
                                val
                              )}
                            </td>
                          ))
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
