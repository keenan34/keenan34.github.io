import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { resolveApiBaseUrl } from "../api/baseUrl";
import PlayerShareCard from "./PlayerShareCard";


const API_BASE_URL = resolveApiBaseUrl();
const PUBLIC_URL = process.env.PUBLIC_URL || "";

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

function toLegacyPlayer(player) {
  const didPlay = player.didPlay !== false;
  const playerName = normalizePlayerName(player.playerName || player.name || "");
  const playerSlug = player.playerSlug || player.slug || slugify(playerName);
  const image = playerImageUrl(player);

  if (!didPlay) {
    return {
      Player: playerName,
      Points: null,
      slug: playerSlug,
      imgUrl: image,
    };
  }

  return {
    Player: playerName,
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
  const baseClasses = `${className} rounded-full flex items-center justify-center cursor-pointer`;

  if ((!src && !fallbackSrc) || error) {
    return (
      <div
        onClick={onClick}
        className={`${baseClasses} bg-[#e2e8f0] text-sm font-black text-[#64748b]`}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      alt={name}
      onError={() => {
        if (!triedFallback && fallbackSrc) {
          setTriedFallback(true);
          return;
        }
        setError(true);
      }}
      onClick={onClick}
      src={triedFallback ? fallbackSrc : src}
      className={`${baseClasses} object-cover`}
    />
  );
}

export default function BoxScore() {
  const { season, week, gameId } = useParams();
  const activeSeason = season || "szn5";

  const [data, setData] = useState(null);
  const [scores, setScores] = useState({ a: null, b: null });
  const [matchInfo, setMatchInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [tab, setTab] = useState("home");
  const [zoomUrl, setZoomUrl] = useState(null);
  const [detailPlayer, setDetailPlayer] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const publicGameId = `${week}-${gameId}`;

    setLoading(true);
    setErrorMsg("");
    setData(null);
    setMatchInfo(null);
    setScores({ a: null, b: null });
    setYoutubeUrl(null);

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


  if (loading) return <p className="text-center py-8">Loading…</p>;
  if (errorMsg) return <p className="text-center py-8">{errorMsg}</p>;
  if (!data) return <p className="text-center py-8">No box score found.</p>;

  const { teamA, teamB } = data;
  const isScheduled = matchInfo?.status === "scheduled";
  const totalA =
    !isScheduled && (scores.a ?? teamA.players.reduce((s, p) => s + (p.Points || 0), 0));
  const totalB =
    !isScheduled && (scores.b ?? teamB.players.reduce((s, p) => s + (p.Points || 0), 0));

  // --- always show teamA on left, teamB on right ---
  const Header = () => (
    <div className="mb-4 grid grid-cols-3 justify-items-center rounded-lg border border-[#e2e8f0] bg-[#ffffff] p-4 shadow-sm">
      <div className="flex flex-col items-center">
        <span className="text-3xl font-black">{isScheduled ? "-" : totalA}</span>
        <span className="mt-1 text-xs font-bold text-[#64748b]">{teamA.name}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="rounded-full bg-[rgba(56,189,248,0.12)] px-3 py-1 text-xs font-black uppercase text-[#0284c7]">
          {isScheduled ? "Scheduled" : matchInfo?.status === "live" ? "Live" : "Final"}
        </span>
        {matchInfo?.date && (
          <span className="mt-1 text-xs font-bold text-[#64748b]">
            {matchInfo.date}
            {matchInfo.time ? ` · ${matchInfo.time}` : ""}
          </span>
        )}
      </div>
      <div className="flex flex-col items-center">
        <span className="text-3xl font-black">{isScheduled ? "-" : totalB}</span>
        <span className="mt-1 text-xs font-bold text-[#64748b]">{teamB.name}</span>
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

  const overrideSlugMap = { "Jerremiah Dujuan Wright": "dujuan_wright" };

  const ROW_H = "h-[68px]";
  const TOTALS_H = "h-[82px]";

  // Fixed photo column on the left; to its right each row stacks the player
  // name on top of a horizontal number-over-label stat strip, exactly like
  // the reference box score. No grid lines.
  const renderBoard = (team) => {
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
      <div className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#ffffff] shadow-sm">
        <div className="flex">
          {/* photo column (fixed) */}
          <div className="flex-none">
            {rows.map((p, idx) => (
              <div
                key={idx}
                className={`flex ${p.isTotals ? TOTALS_H : ROW_H} w-16 items-center justify-center ${
                  p.isTotals ? "bg-[#f1f5f9]" : ""
                }`}
              >
                {p.isTotals ? (
                  <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-[#e2e8f0] text-lg font-black text-[#64748b]">
                    {(team.name || "?").trim().charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <ProfileImage
                    className="h-[52px] w-[52px] flex-none"
                    src={season ? seasonPlayerImageUrl(activeSeason, p) : p.imgUrl}
                    fallbackSrc={season ? null : p.imgUrl}
                    name={p.Player}
                    onClick={() =>
                      setDetailPlayer({
                        player: p,
                        team,
                        imgUrl: season
                          ? seasonPlayerImageUrl(activeSeason, p)
                          : p.imgUrl,
                      })
                    }
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
                const slug = overrideSlugMap[p.Player] || slugify(p.Player);

                // Team totals row — bespoke layout matching the reference.
                if (p.isTotals) {
                  return (
                    <div
                      key={idx}
                      className={`flex ${TOTALS_H} flex-col justify-center bg-[#f1f5f9]`}
                    >
                      <div className="sticky left-0 z-10 w-fit max-w-[220px] bg-[#f1f5f9] px-2 pb-1 pr-4">
                        <span className="block truncate text-[15px] font-black leading-tight text-[#0f172a]">
                          {team.name}
                        </span>
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
                            <span className="text-[18px] font-black leading-none text-[#0f172a]">
                              {cell.value}
                            </span>
                            <span className="mt-0.5 text-[10px] font-bold uppercase leading-none text-[#94a3b8]">
                              {cell.label}
                            </span>
                            {cell.pct != null && (
                              <span className="mt-0.5 text-[10px] font-bold leading-none text-[#94a3b8]">
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
                    <div className="sticky left-0 z-10 w-fit max-w-[180px] bg-[#ffffff] px-2 pb-1 pr-4 pt-0.5">
                      <Link
                        to={
                          season
                            ? `/season/${activeSeason}/player/${slug}`
                            : `/player/${slug}`
                        }
                        state={{
                          from: season
                            ? `/season/${activeSeason}/boxscore/${week}/${gameId}`
                            : `/boxscore/${week}/${gameId}`,
                          label: "Box Score",
                        }}
                        className="block truncate text-[15px] font-medium leading-tight text-[#0f172a] hover:text-[#0284c7]"
                      >
                        {abbreviateName(p.Player)}
                      </Link>
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
                            <span className="text-[18px] font-black leading-none text-[#0f172a]">
                              {get(p)}
                            </span>
                            <span className="mt-0.5 text-[10px] font-bold uppercase leading-none text-[#94a3b8]">
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
      style={{ zoom: 0.97 }}
      className="mx-auto min-h-screen max-w-full bg-[#f8fafc] p-4 text-[#0f172a]"
    >
      <Header />

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

      {detailPlayer && (() => {
        const isTeamA = detailPlayer.team.name === teamA.name;
        const teamScore = isTeamA ? totalA : totalB;
        const opponentScore = isTeamA ? totalB : totalA;
        const opponentName = isTeamA ? teamB.name : teamA.name;

        return (
          <PlayerShareCard
            player={detailPlayer.player}
            imgUrl={detailPlayer.imgUrl}
            teamName={detailPlayer.team.name}
            opponentName={opponentName}
            teamScore={typeof teamScore === "number" ? teamScore : undefined}
            opponentScore={typeof opponentScore === "number" ? opponentScore : undefined}
            date={matchInfo?.date}
            onClose={() => setDetailPlayer(null)}
          />
        );
      })()}
    </div>
  );
}
