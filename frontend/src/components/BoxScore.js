import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { resolveApiBaseUrl } from "../api/baseUrl";
import PlayerShareCard from "./PlayerShareCard";
import TeamShareCard from "./TeamShareCard";
import { useStableImage } from "./useStableImage";


const API_BASE_URL = resolveApiBaseUrl();
const PUBLIC_URL = process.env.PUBLIC_URL || "";

function forceDocumentTop(target) {
  const scrollRoots = [
    document.scrollingElement,
    document.documentElement,
    document.body,
  ].filter(Boolean);

  if (target?.scrollIntoView) {
    target.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  scrollRoots.forEach((root) => {
    root.scrollTop = 0;
    root.scrollLeft = 0;
  });
}

function scheduleDocumentTopReset(target) {
  const timers = [];
  const frames = [];
  const run = () => forceDocumentTop(target);

  run();
  frames.push(requestAnimationFrame(run));
  frames.push(requestAnimationFrame(() => requestAnimationFrame(run)));
  [50, 120, 250, 500, 850].forEach((delay) => {
    timers.push(window.setTimeout(run, delay));
  });

  const viewport = window.visualViewport;
  if (viewport?.addEventListener) {
    viewport.addEventListener("resize", run);
    timers.push(
      window.setTimeout(() => viewport.removeEventListener("resize", run), 900)
    );
  }

  return () => {
    frames.forEach((frame) => cancelAnimationFrame(frame));
    timers.forEach((timer) => clearTimeout(timer));
    if (viewport?.removeEventListener) viewport.removeEventListener("resize", run);
  };
}

// simple slugify utility
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

async function apiGet(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `API request failed with ${response.status}`);
  }

  return data;
}

const percent = (made, attempted) => {
  const attempts = Number(attempted);
  if (!attempts) return 0;
  return Number(((Number(made || 0) / attempts) * 100).toFixed(1));
};

const PLAYER_NAME_ALIASES = {
  "musab bawaney": "Musab Bawany",
};

function normalizePlayerName(name) {
  const raw = String(name || "").trim();
  const alias = PLAYER_NAME_ALIASES[raw.toLowerCase()];
  return alias || raw;
}

// "Jalen Brunson" -> "J. Brunson" (matches the box-score reference style)
function abbreviateName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

const playerImageUrl = (player) =>
  player.imgUrl || player.image_url || player.imageUrl || null;

function seasonPlayerImageUrl(season, player) {
  const slug =
    player.slug ||
    (player.Player === "Jerremiah Dujuan Wright"
      ? "dujuan_wright"
      : slugify(player.Player));
  return `${PUBLIC_URL}/seasons/${season}/images/players/${slug}.png`;
}

// match the logo filenames: lowercase, spaces -> underscores, leading "The" dropped
const teamSlug = (name) =>
  slugify(String(name || "").replace(/^the\s+/i, ""));

function teamLogoUrl(season, teamName) {
  return `${PUBLIC_URL}/seasons/${season}/images/teams/${teamSlug(teamName)}.png`;
}

// normalize a team name for record lookups (mirror of standings keys)
const normTeam = (name) =>
  String(name || "").toLowerCase().replace(/^the\s+/i, "").trim();

// team logo with a neutral fallback for seasons/teams without an image
function TeamLogo({ season, name, size = 46 }) {
  const [error, setError] = useState(false);
  const initials = String(name || "")
    .replace(/^the\s+/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (error) {
    return (
      <span
        className="flex flex-none items-center justify-center rounded-full bg-[#e2e8f0] text-sm font-black text-[#64748b]"
        style={{ width: size, height: size }}
      >
        {initials}
      </span>
    );
  }

  return (
    <img
      src={teamLogoUrl(season, name)}
      alt={name}
      onError={() => setError(true)}
      style={{ width: size, height: size }}
      className="flex-none object-contain"
    />
  );
}

function toLegacyPlayer(player) {
  const didPlay = player.didPlay !== false;
  const playerName = normalizePlayerName(player.playerName || player.name || "");
  const playerSlug = player.playerSlug || player.slug || slugify(playerName);
  const image = playerImageUrl(player);

  const playerId = player.playerId ?? player.id ?? null;

  if (!didPlay) {
    return {
      Player: playerName,
      Points: null,
      id: playerId,
      slug: playerSlug,
      imgUrl: image,
    };
  }

  return {
    Player: playerName,
    id: playerId,
    slug: playerSlug,
    Points: player.points ?? 0,
    FGM: player.fgm ?? 0,
    FGA: player.fga ?? 0,
    "FG %": percent(player.fgm, player.fga),
    "2 PTM": player.twoPm ?? 0,
    "2 PTA": player.twoPa ?? 0,
    "2 Pt %": percent(player.twoPm, player.twoPa),
    "3 PTM": player.threePm ?? 0,
    "3 PTA": player.threePa ?? 0,
    "3 Pt %": percent(player.threePm, player.threePa),
    FTM: player.ftm ?? 0,
    FTA: player.fta ?? 0,
    "FT %": percent(player.ftm, player.fta),
    REB: player.rebounds ?? 0,
    AST: player.assists ?? 0,
    TOs: player.turnovers ?? 0,
    Fouls: player.fouls ?? 0,
    "STLS/BLKS": player.stealsBlocks ?? 0,
    careerHigh: player.careerHigh === true,
    imgUrl: playerImageUrl(player),
  };
}

function toLegacyBoxScore(apiData) {
  const { game, playerStats = [], rosters = [] } = apiData || {};
  if (!game) return null;

  const rosterByTeamId = new Map(
    rosters
      .filter((roster) => roster?.team?.id != null)
      .map((roster) => [roster.team.id, roster])
  );

  const dedupePlayers = (players) => {
    const seen = new Map();

    for (const player of players) {
      const key = slugify(normalizePlayerName(player.Player || player.playerName || player.name || ""));
      if (!key) continue;

      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, player);
        continue;
      }

      const existingHasStats = existing.Points != null;
      const incomingHasStats = player.Points != null;
      if (!existingHasStats && incomingHasStats) {
        seen.set(key, player);
      }
    }

    return Array.from(seen.values());
  };

  const playersForTeam = (teamId) => {
    const roster = rosterByTeamId.get(teamId);
    if (roster?.players?.length) {
      return dedupePlayers(roster.players.map(toLegacyPlayer));
    }

    return dedupePlayers(
      playerStats
      .filter((player) => player.teamId === teamId)
        .map(toLegacyPlayer)
    );
  };

  return {
    teamA: {
      name: game.teamA,
      players: playersForTeam(game.teamAId),
    },
    teamB: {
      name: game.teamB,
      players: playersForTeam(game.teamBId),
    },
  };
}

function ProfileImage({ src, fallbackSrc, name, onClick, className = "w-16 h-16" }) {
  const shown = useStableImage([src, fallbackSrc]);
  const initials = name.split(" ").map((n) => n[0]).join("");

  return (
    <div
      onClick={onClick}
      className={`${className} relative rounded-full bg-[#e2e8f0] flex items-center justify-center cursor-pointer overflow-hidden flex-none`}
    >
      {shown ? (
        <img alt={name} src={shown} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-black text-[#64748b]">{initials}</span>
      )}
    </div>
  );
}

export default function BoxScore() {
  const { season, week, gameId } = useParams();
  const activeSeason = season || "szn5";
  const pageRef = useRef(null);

  const [data, setData] = useState(null);
  const [scores, setScores] = useState({ a: null, b: null });
  const [matchInfo, setMatchInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [tab, setTab] = useState("home");
  const [zoomUrl, setZoomUrl] = useState(null);
  const [detailPlayer, setDetailPlayer] = useState(null);
  const [detailTeam, setDetailTeam] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState(null);
  const [events, setEvents] = useState([]);
  const [records, setRecords] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    const publicGameId = `${week}-${gameId}`;

    setLoading(true);
    setErrorMsg("");
    setData(null);
    setMatchInfo(null);
    setScores({ a: null, b: null });
    setYoutubeUrl(null);
    setEvents([]);
    setDetailPlayer(null);
    setDetailTeam(null);

    apiGet(
      `/api/games/${encodeURIComponent(publicGameId)}?season=${encodeURIComponent(
        activeSeason
      )}`,
      {
        signal: controller.signal,
      }
    )
      .then((apiData) => {
        const game = apiData?.game;
        const boxScore = toLegacyBoxScore(apiData);

        if (!game || !boxScore) {
          throw new Error("No box score found.");
        }

        setData(boxScore);
        setMatchInfo(game);
        setEvents(Array.isArray(apiData?.events) ? apiData.events : []);
        setYoutubeUrl(game.youtubeUrl ?? null);
        setScores({ a: game.scoreA ?? null, b: game.scoreB ?? null });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error(err);
        setErrorMsg(err.message || "Failed to load box score");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [activeSeason, week, gameId]);

  useLayoutEffect(() => {
    return scheduleDocumentTopReset(pageRef.current);
  }, [activeSeason, week, gameId]);

  useLayoutEffect(() => {
    if (!data || loading) return undefined;
    return scheduleDocumentTopReset(pageRef.current);
  }, [data, loading]);

  // team records (W-L) for the header, keyed by normalized team name
  useEffect(() => {
    let cancelled = false;
    apiGet(`/api/standings/${encodeURIComponent(activeSeason)}`)
      .then((standingsData) => {
        if (cancelled) return;
        const map = {};
        (standingsData?.standings || []).forEach((row) => {
          const teamName = row?.team || row?.name;
          if (teamName) {
            map[normTeam(teamName)] = {
              wins: row.wins || 0,
              losses: row.losses || 0,
            };
          }
        });
        setRecords(map);
      })
      .catch(() => {
        if (!cancelled) setRecords({});
      });
    return () => {
      cancelled = true;
    };
  }, [activeSeason]);

  // Preload both team logos as soon as the matchup is known so the <img> tags
  // paint instantly from cache — no flicker when switching the home/away tab.
  useEffect(() => {
    [matchInfo?.teamA, matchInfo?.teamB].forEach((name) => {
      if (!name) return;
      const img = new Image();
      img.src = teamLogoUrl(activeSeason, name);
    });
  }, [activeSeason, matchInfo?.teamA, matchInfo?.teamB]);


  if (loading) return <p className="text-center py-8">Loading…</p>;
  if (errorMsg) return <p className="text-center py-8">{errorMsg}</p>;
  if (!data) return <p className="text-center py-8">No box score found.</p>;

  const { teamA, teamB } = data;
  const gameStatus = matchInfo?.status;
  const hasPublicScore =
    typeof scores.a === "number" && typeof scores.b === "number";
  const isLive = gameStatus === "live";
  const isFinal = gameStatus === "final" || gameStatus === "finished";
  const hasBoxScore = hasPublicScore && (isLive || isFinal);
  const statusText = isLive ? "Live" : isFinal && hasPublicScore ? "Final" : "Scheduled";
  const totalA =
    hasBoxScore && (scores.a ?? teamA.players.reduce((s, p) => s + (p.Points || 0), 0));
  const totalB =
    hasBoxScore && (scores.b ?? teamB.players.reduce((s, p) => s + (p.Points || 0), 0));

  // --- always show teamA on left, teamB on right ---
  const recordText = (teamName) => {
    const r = records[normTeam(teamName)];
    return r ? `${r.wins}-${r.losses}` : "";
  };

  const Header = () => (
    <div className="mb-4 grid grid-cols-3 items-center rounded-lg border border-[#e2e8f0] bg-[#ffffff] p-4 shadow-sm">
      {/* left team: logo + record on the outer edge, score + name inner */}
      <div className="flex items-center justify-start gap-3">
        <div className="flex flex-col items-center">
          <TeamLogo season={activeSeason} name={teamA.name} />
          {recordText(teamA.name) && (
            <span className="mt-1 text-[11px] font-bold text-[#94a3b8]">
              ({recordText(teamA.name)})
            </span>
          )}
        </div>
        <div className="flex flex-col items-start">
          <span className="text-3xl font-black leading-none">
            {hasBoxScore ? totalA : "-"}
          </span>
          <span className="mt-1 text-xs font-bold text-[#64748b]">{teamA.name}</span>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <span className="rounded-full bg-[rgba(56,189,248,0.12)] px-3 py-1 text-xs font-black uppercase text-[#0284c7]">
          {statusText}
        </span>
        {matchInfo?.date && (
          <div className="mt-1 flex flex-col items-center">
            <span className="text-center text-xs font-bold text-[#64748b]">{matchInfo.date}</span>
            {matchInfo.time && (
              <span className="text-center text-xs text-[#94a3b8]">{matchInfo.time}</span>
            )}
          </div>
        )}
      </div>

      {/* right team: score + name inner, logo + record on the outer edge */}
      <div className="flex items-center justify-end gap-3">
        <div className="flex flex-col items-end">
          <span className="text-3xl font-black leading-none">
            {hasBoxScore ? totalB : "-"}
          </span>
          <span className="mt-1 text-xs font-bold text-[#64748b]">{teamB.name}</span>
        </div>
        <div className="flex flex-col items-center">
          <TeamLogo season={activeSeason} name={teamB.name} />
          {recordText(teamB.name) && (
            <span className="mt-1 text-[11px] font-bold text-[#94a3b8]">
              ({recordText(teamB.name)})
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // which stats to render
  const statFields = [
    { label: "PTS", get: (p) => p.Points ?? 0 },
    { label: "REB", get: (p) => p.REB ?? 0 },
    { label: "AST", get: (p) => p.AST ?? 0 },
    { label: "STK", get: (p) => p["STLS/BLKS"] ?? 0 },
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
    { label: "TO", get: (p) => p.TOs ?? 0 },
    { label: "PF", get: (p) => p.Fouls ?? 0 },
  ];

  // aggregate a team's per-stat totals (DNP players contribute 0)
  const teamTotals = (team) => {
    const sum = (key) =>
      team.players.reduce((acc, p) => acc + (Number(p[key]) || 0), 0);
    const FGM = sum("FGM");
    const FGA = sum("FGA");
    const TWOM = sum("2 PTM");
    const TWOA = sum("2 PTA");
    const THREEM = sum("3 PTM");
    const THREEA = sum("3 PTA");
    const FTM = sum("FTM");
    const FTA = sum("FTA");

    return {
      isTotals: true,
      Player: team.name,
      Points: sum("Points"),
      REB: sum("REB"),
      AST: sum("AST"),
      FGM,
      FGA,
      "FG %": percent(FGM, FGA),
      "2 PTM": TWOM,
      "2 PTA": TWOA,
      "2 Pt %": percent(TWOM, TWOA),
      "3 PTM": THREEM,
      "3 PTA": THREEA,
      "3 Pt %": percent(THREEM, THREEA),
      FTM,
      FTA,
      "FT %": percent(FTM, FTA),
      TOs: sum("TOs"),
      Fouls: sum("Fouls"),
      "STLS/BLKS": sum("STLS/BLKS"),
    };
  };

  const ROW_H = "h-[70px]";
  const TOTALS_H = "h-[84px]";

  // Fixed photo column on the left; to its right each row stacks the player
  // name on top of a horizontal number-over-label stat strip, exactly like
  // the reference box score. No grid lines.
  const renderBoard = (team) => {
    const openPlayerDetail = (player) =>
      {
        setDetailTeam(null);
        setDetailPlayer({
          player,
          team,
          imgUrl: season ? seasonPlayerImageUrl(activeSeason, player) : player.imgUrl,
        });
      };

    const openTeamDetail = () => {
      const opponent = team === teamA ? teamB : teamA;
      setDetailPlayer(null);
      setDetailTeam({
        team,
        opponent,
        totals: teamTotals(team),
        opponentTotals: teamTotals(opponent),
        teamScore: team === teamA ? totalA : totalB,
        opponentScore: team === teamA ? totalB : totalA,
        opponentName: opponent.name,
      });
    };

    // Players who logged stats first; DNPs pushed to the bottom (stable order).
    const playedPlayers = team.players.filter((p) => p.Points != null);
    const dnpPlayers = team.players.filter((p) => p.Points == null);
    const totals = teamTotals(team);
    const rows = [totals, ...playedPlayers, ...dnpPlayers];

    const totalsCells = [
      { value: `${totals.FGM}/${totals.FGA}`, label: "FG", pct: `${totals["FG %"]}%` },
      { value: `${totals["3 PTM"]}/${totals["3 PTA"]}`, label: "3FG", pct: `${totals["3 Pt %"]}%` },
      { value: `${totals.FTM}/${totals.FTA}`, label: "FT", pct: `${totals["FT %"]}%` },
      { value: totals.TOs, label: "TO" },
      { value: totals.REB, label: "REB" },
      { value: totals.AST, label: "AST" },
      { value: totals["STLS/BLKS"], label: "STK" },
      { value: `${totals["2 PTM"]}/${totals["2 PTA"]}`, label: "2FG", pct: `${totals["2 Pt %"]}%` },
      { value: totals.Fouls, label: "PF" },
      { value: totals.Points, label: "PTS" },
    ];

    return (
      <div className="box-score-board overflow-hidden bg-[#ffffff]">
        <div className="flex">
          {/* photo column (fixed) */}
          <div className="flex-none">
            {rows.map((p, idx) => (
              <div
                key={idx}
                className={`flex ${p.isTotals ? TOTALS_H : ROW_H} w-[66px] items-center justify-center ${
                  p.isTotals ? "bg-[#f1f5f9]" : ""
                }`}
              >
                {p.isTotals ? (
                  <button
                    type="button"
                    onClick={openTeamDetail}
                    className="flex h-[54px] w-[54px] flex-none cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-80"
                    aria-label={`Open ${team.name} export`}
                  >
                    <TeamLogo season={activeSeason} name={team.name} size={50} />
                  </button>
                ) : (
                  <ProfileImage
                    className="h-[54px] w-[54px] flex-none"
                    src={season ? seasonPlayerImageUrl(activeSeason, p) : p.imgUrl}
                    fallbackSrc={season ? null : p.imgUrl}
                    name={p.Player}
                    onClick={() => openPlayerDetail(p)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* name + stat strip (horizontal scroll) */}
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="w-full min-w-[864px]">
              {rows.map((p, idx) => {
                const isDNP = !p.isTotals && p.Points == null;

                // Team totals row — bespoke layout matching the reference.
                if (p.isTotals) {
                  return (
                    <div
                      key={idx}
                      className={`flex ${TOTALS_H} flex-col justify-center bg-[#f1f5f9]`}
                    >
                    <div className="sticky left-0 z-10 w-fit max-w-[220px] bg-inherit px-2 pb-1 pr-4">
                        <button
                          type="button"
                          onClick={openTeamDetail}
                          className="block truncate text-[15px] font-black leading-tight text-[#0f172a] hover:text-[#0284c7]"
                        >
                          {team.name}
                        </button>
                      </div>
                      <div
                        className="grid w-full px-2"
                        style={{
                          gridTemplateColumns: `repeat(${totalsCells.length}, minmax(64px, 1fr))`,
                        }}
                      >
                        {totalsCells.map((cell, i) => (
                          <div
                            key={i}
                            className="flex min-w-0 flex-col items-start"
                          >
                            <span className="text-[18px] font-black leading-none text-white">
                              {cell.value}
                            </span>
                            <span className="mt-0.5 text-[10px] font-normal uppercase leading-none text-[#8f939d]">
                              {cell.label}
                            </span>
                            {cell.pct != null && (
                              <span className="mt-0.5 text-[10px] font-normal leading-none text-[#8f939d]">
                                {cell.pct}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className={`flex ${ROW_H} flex-col justify-center ${
                      isDNP ? "opacity-55" : ""
                    }`}
                  >
                    {/* name line */}
                    <div className="sticky left-0 z-10 w-fit max-w-[180px] bg-inherit px-2 pb-1 pr-4 pt-0.5">
                      <button
                        type="button"
                        onClick={() => openPlayerDetail(p)}
                        className="block truncate text-[15px] font-medium leading-tight text-[#0f172a] hover:text-[#0284c7]"
                      >
                        {abbreviateName(p.Player)}
                      </button>
                    </div>

                    {/* stat line */}
                    {isDNP ? (
                      <div className="px-2 text-[13px] font-black text-[#64748b]">
                        DNP
                      </div>
                    ) : (
                      <div
                        className="grid w-full px-2"
                        style={{
                          gridTemplateColumns: `repeat(${statFields.length}, minmax(48px, 1fr))`,
                        }}
                      >
                        {statFields.map(({ get, label }, i) => (
                          <div
                            key={i}
                            className="flex min-w-0 flex-col items-start"
                          >
                            <span className="text-[18px] font-black leading-none text-white">
                              {get(p)}
                            </span>
                            <span className="mt-0.5 text-[10px] font-normal uppercase leading-none text-[#8f939d]">
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ScheduledMessage = () => (
    <div className="rounded-lg border border-[#e2e8f0] bg-[#ffffff] px-4 py-8 text-center shadow-sm">
      <div className="text-base font-black text-[#0f172a]">
        Box score available after game
      </div>
      {matchInfo?.date && (
        <div className="mt-1 flex flex-col items-center">
          <span className="text-sm font-bold text-[#64748b]">{matchInfo.date}</span>
          {matchInfo.time && (
            <span className="text-sm text-[#94a3b8]">{matchInfo.time}</span>
          )}
        </div>
      )}
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
      ref={pageRef}
      style={{ zoom: 0.97 }}
      className="box-score-page mx-auto min-h-screen max-w-full bg-[#f8fafc] px-2 py-3 text-[#0f172a]"
    >
      {Header()}

      {/* tabs */}
      <div className="mb-4 flex border-b border-[#e2e8f0]">
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
                ? "border-b-2 border-[#0284c7] text-[#0284c7]"
                : "text-[#64748b]")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* content */}
      {tab === "home" && (hasBoxScore ? renderBoard(teamA) : <ScheduledMessage />)}
      {tab === "away" && (hasBoxScore ? renderBoard(teamB) : <ScheduledMessage />)}
      {tab === "game" && (
        youtubeUrl ? (
          <div className="w-full h-[70vh]">
            <iframe
              src={youtubeUrl}
              title="Game Replay"
              allowFullScreen
              className="w-full h-full rounded-lg"
            />
          </div>
        ) : (
          <ScheduledMessage />
        )
      )}

      {zoomUrl && <ZoomModal />}

      {detailPlayer && (() => {
        const isTeamA = detailPlayer.team.name === teamA.name;
        const teamScore = isTeamA ? totalA : totalB;
        const opponentScore = isTeamA ? totalB : totalA;
        const opponentName = isTeamA ? teamB.name : teamA.name;
        const teamPlayers = detailPlayer.team.players
          .filter((player) => player.Points != null)
          .map((player) => ({
            ...player,
            imgUrl: season ? seasonPlayerImageUrl(activeSeason, player) : player.imgUrl,
          }));

        return (
          <PlayerShareCard
            player={detailPlayer.player}
            imgUrl={detailPlayer.imgUrl}
            teamName={detailPlayer.team.name}
            opponentName={opponentName}
            teamScore={typeof teamScore === "number" ? teamScore : undefined}
            opponentScore={typeof opponentScore === "number" ? opponentScore : undefined}
            date={matchInfo?.date}
            season={activeSeason}
            teamPlayers={teamPlayers}
            events={events}
            onSelectPlayer={(player) =>
              setDetailPlayer({
                player,
                team: detailPlayer.team,
                imgUrl: player.imgUrl,
              })
            }
            onClose={() => setDetailPlayer(null)}
          />
        );
      })()}

      {detailTeam && (
        <TeamShareCard
          team={detailTeam.team}
          opponent={detailTeam.opponent}
          teamScore={typeof detailTeam.teamScore === "number" ? detailTeam.teamScore : undefined}
          opponentScore={typeof detailTeam.opponentScore === "number" ? detailTeam.opponentScore : undefined}
          date={matchInfo?.date}
          season={activeSeason}
          teamTotals={detailTeam.totals}
          opponentTotals={detailTeam.opponentTotals}
          onClose={() => setDetailTeam(null)}
        />
      )}
    </div>
  );
}
