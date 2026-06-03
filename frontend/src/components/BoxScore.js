import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { resolveApiBaseUrl } from "../api/baseUrl";


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

function ProfileImage({ src, fallbackSrc, name, onClick }) {
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
  const baseClasses =
    "w-16 h-16 rounded-full flex items-center justify-center mt-8 cursor-pointer";

  if ((!src && !fallbackSrc) || error) {
    return (
      <div
        onClick={onClick}
        className={`${baseClasses} bg-[#ffffff] text-xs font-black text-[#64748b]`}
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
  const [youtubeUrl, setYoutubeUrl] = useState(null);
  const scrollRef = useRef(null);

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
            className="relative flex h-32 items-start justify-center border-b border-[#e2e8f0]"
          >
            <ProfileImage
              src={season ? seasonPlayerImageUrl(activeSeason, p) : p.imgUrl}
              fallbackSrc={season ? null : p.imgUrl}
              name={p.Player}
              onClick={() =>
                setZoomUrl(season ? seasonPlayerImageUrl(activeSeason, p) : p.imgUrl)
              }
            />
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
              className="absolute bottom-1 w-full whitespace-normal break-words px-.5 text-center text-xs font-black text-[#475569] hover:text-[#0284c7]"
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
    <div className="-mt-8 flex-1 overflow-x-auto" ref={scrollRef}>
      <table className="min-w-full table-auto border-separate border-spacing-0 text-[#0f172a]">
        <thead>
          <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
            {statFields.map(({ label }) => (
              <th
                key={label}
                className="whitespace-nowrap px-4 py-2 text-center text-xs font-black text-[#64748b]"
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
                className={`border-b border-[#e2e8f0] even:bg-[#f8fafc] ${
                  isDNP ? "opacity-55" : ""
                }`}
              >
                {statFields.map(({ get, label }, i) => (
                  <td
                    key={i}
                    className="h-32 whitespace-nowrap px-4 py-1 text-center"
                  >
                    {isDNP ? (
                      <span className="text-lg font-black leading-none text-[#64748b]">
                        DNP
                      </span>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center">
                        <span className="text-lg font-black leading-none text-[#0f172a]">
                          {get(p)}
                        </span>
                        <span className="mt-1 text-[12px] font-bold text-[#64748b]">
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
    <div className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#ffffff] shadow-sm">
      <div className="flex">
        <LeftColumn team={team} />
        <StatsTable team={team} />
      </div>
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
      className="mx-auto min-h-screen max-w-full bg-[#f8fafc] p-4 text-[#0f172a]"
    >
      <Header />

      {/* tabs */}
      <div className="mb-12 flex border-b border-[#e2e8f0]">
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
    </div>
  );
}
