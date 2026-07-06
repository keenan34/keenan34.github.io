import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { resolveApiBaseUrl } from "../api/baseUrl";
import { SkeletonBlock, SkeletonBar, SkeletonCircle } from "./Skeleton";

const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const API_BASE_URL = resolveApiBaseUrl();
const PUBLIC_URL = process.env.PUBLIC_URL || "";

const EXCLUDED_PLAYERS = new Set([
  "Josiah",
  "Danial Asim",
  "Salman",
  "Ibrahim",
  "Imran",
  "Anthony",
  "Raedh Talha",
  "Devon",
  "Suhail",
  "Sufyan",
  "Saif Rehman",
  "Amaar Zafar",
  "Luqman Ali",
  "Ryan",
  "Imam Azfar Uddin",
]);

// Display order. `negative` = fewer is better (rendered in foul-red).
const CATEGORIES = [
  {
    id: "points",
    label: "Points",
    chip: "PTS",
    avgKey: "avgPts",
    totalKey: "totalPts",
    avgUnit: "PPG",
    totalUnit: "PTS",
    marquee: true,
  },
  {
    id: "assists",
    label: "Assists",
    chip: "AST",
    avgKey: "avgAst",
    totalKey: "totalAst",
    avgUnit: "APG",
    totalUnit: "AST",
  },
  {
    id: "threes",
    label: "3PT Made",
    chip: "3PT",
    avgKey: "avg3",
    totalKey: "total3",
    avgUnit: "3PM/G",
    totalUnit: "3PM",
  },
  {
    id: "rebounds",
    label: "Rebounds",
    chip: "REB",
    avgKey: "avgReb",
    totalKey: "totalReb",
    avgUnit: "RPG",
    totalUnit: "REB",
  },
  {
    id: "stocks",
    label: "Steals + Blocks",
    chip: "STL+BLK",
    avgKey: "avgStlBlk",
    totalKey: "totalStlBlk",
    avgUnit: "S+B/G",
    totalUnit: "S+B",
  },
  {
    id: "turnovers",
    label: "Turnovers",
    chip: "TO",
    avgKey: "avgTO",
    totalKey: "totalTO",
    avgUnit: "TO/G",
    totalUnit: "TO",
    negative: true,
  },
  {
    id: "fouls",
    label: "Fouls",
    chip: "PF",
    avgKey: "avgFouls",
    totalKey: "totalFouls",
    avgUnit: "PF/G",
    totalUnit: "PF",
    negative: true,
  },
];

const SKY = "#38bdf8";
const RED = "#f87171";
const barTint = (negative) =>
  negative
    ? "linear-gradient(90deg, rgba(248,113,113,0.16), rgba(248,113,113,0.03))"
    : "linear-gradient(90deg, rgba(56,189,248,0.16), rgba(56,189,248,0.03))";

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
    name === "Jerremiah Dujuan Wright" ? "dujuan_wright" : slugify(name);
  return `${PUBLIC_URL}/seasons/${season}/images/players/${fileName}.png`;
}

const playerSlug = (name) =>
  name === "Jerremiah Dujuan Wright" ? "dujuan_wright" : slugify(name);

const fmtAvg = (v) => Number(v ?? 0).toFixed(1);

const seasonLabel = (slug) => {
  const m = /^szn(\d+)$/i.exec(slug || "");
  return m ? `Season ${m[1]}` : (slug || "").toUpperCase();
};

function ProfileImage({ name, src, sizeClass, ringClass = "" }) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 3);

  const shared = `${sizeClass} flex-shrink-0 rounded-full ${ringClass}`;

  if (!src || error) {
    return (
      <span
        className={`${shared} flex items-center justify-center bg-[#101820] text-xs font-black text-[color:var(--muted)]`}
      >
        {initials}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={`${shared} object-cover`}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

// One rank-2+ row. The background fill is the row's stat as a share of the
// category leader's — the visible gap behind #1.
function RankRow({ rank, player, category, mode, team, link, imgSrc }) {
  const key = mode === "avg" ? category.avgKey : category.totalKey;
  const leaderShare = player.__leaderValue
    ? Math.max(0, Math.min(100, (player[key] / player.__leaderValue) * 100))
    : 0;

  const primary = mode === "avg" ? fmtAvg(player[key]) : player[key];
  const secondary =
    mode === "avg"
      ? `${player[category.totalKey]} tot · ${player.games} gp`
      : `${fmtAvg(player[category.avgKey])} /g · ${player.games} gp`;

  return (
    <Link
      to={link.to}
      state={link.state}
      className="relative flex items-center gap-2.5 overflow-hidden rounded-lg px-2 py-1.5 transition hover:bg-[#101820]"
    >
      <span
        aria-hidden="true"
        className="ifn-bar absolute inset-y-0 left-0"
        style={{ width: `${leaderShare}%`, background: barTint(category.negative) }}
      />
      <span className="ifn-display relative w-5 text-right text-sm text-[#5c6b7d]">
        {rank}
      </span>
      <ProfileImage
        name={player.name}
        src={imgSrc}
        sizeClass="relative h-9 w-9"
      />
      <span className="relative min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-white">
          {player.name}
        </span>
        {team && (
          <span className="block truncate text-[10px] font-semibold text-[color:var(--muted)]">
            {team}
          </span>
        )}
      </span>
      <span className="relative text-right">
        <span className="ifn-display block text-base leading-tight text-white tabular-nums">
          {primary}
        </span>
        <span className="block text-[10px] font-semibold text-[#8f9aa8] tabular-nums">
          {secondary}
        </span>
      </span>
    </Link>
  );
}

function CategoryCard({ category, rows, mode, teamOf, resolveImg, linkFor }) {
  if (!rows.length) return null;

  const [leader, ...rest] = rows;
  const key = mode === "avg" ? category.avgKey : category.totalKey;
  const unit = mode === "avg" ? category.avgUnit : category.totalUnit;
  const heroValue = mode === "avg" ? fmtAvg(leader[key]) : leader[key];
  const heroColor = category.negative ? RED : SKY;
  const leaderTeam = teamOf(leader);
  const leaderImg = resolveImg(leader);
  const leaderLink = linkFor(leader);

  const restRows = rest.map((p, i) => ({ ...p, __leaderValue: leader[key] }));

  return (
    <section
      id={`cat-${category.id}`}
      className={`scroll-mt-[130px] rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 sm:p-5 ${
        category.marquee ? "md:col-span-2" : ""
      }`}
    >
      {/* Header: category name + unit tag (or the fewer-is-better warning) */}
      <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-[color:var(--border)] pb-3">
        <h2 className="text-sm font-black uppercase italic tracking-[0.18em] text-white">
          {category.label}
        </h2>
        {category.negative ? (
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f87171]">
            fewer is better
          </span>
        ) : (
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--muted)]">
            {unit}
          </span>
        )}
      </div>

      <div className={category.marquee ? "md:flex md:items-center md:gap-8" : ""}>
        {/* Leader hero */}
        {category.marquee ? (
          <div className="flex flex-col items-center pb-4 text-center md:w-60 md:flex-none md:pb-0">
            <Link
              to={leaderLink.to}
              state={leaderLink.state}
              className="rounded-full transition hover:opacity-90"
            >
              <ProfileImage
                name={leader.name}
                src={leaderImg}
                sizeClass="h-24 w-24 md:h-28 md:w-28"
                ringClass="ring-2 ring-[color:var(--border)]"
              />
            </Link>
            <Link
              to={leaderLink.to}
              state={leaderLink.state}
              className="mt-3 text-lg font-black italic leading-tight text-white hover:text-[#38bdf8]"
            >
              {leader.name}
            </Link>
            <p className="mt-0.5 text-xs font-semibold text-[color:var(--muted)]">
              {leaderTeam ? `${leaderTeam} · ` : ""}
              {leader.games} games
            </p>
            <div
              className="ifn-display mt-2 text-6xl leading-none tabular-nums"
              style={{ color: heroColor }}
            >
              {heroValue}
            </div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--muted)]">
              {unit}
            </div>
          </div>
        ) : (
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-[#101820] p-3">
            <Link
              to={leaderLink.to}
              state={leaderLink.state}
              className="rounded-full transition hover:opacity-90"
            >
              <ProfileImage
                name={leader.name}
                src={leaderImg}
                sizeClass="h-14 w-14"
                ringClass="ring-2 ring-[color:var(--border)]"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                to={leaderLink.to}
                state={leaderLink.state}
                className="block truncate text-base font-black italic text-white hover:text-[#38bdf8]"
              >
                {leader.name}
              </Link>
              <p className="truncate text-[11px] font-semibold text-[color:var(--muted)]">
                {leaderTeam ? `${leaderTeam} · ` : ""}
                {leader.games} games
              </p>
            </div>
            <div className="text-right">
              <div
                className="ifn-display text-4xl leading-none tabular-nums"
                style={{ color: heroColor }}
              >
                {heroValue}
              </div>
            </div>
          </div>
        )}

        {/* Ranks 2–10 */}
        <div
          className={
            category.marquee
              ? "grid gap-y-1 border-t border-[color:var(--border)] pt-3 md:flex-1 md:grid-flow-col md:grid-rows-5 md:gap-x-8 md:border-t-0 md:pt-0"
              : "grid gap-y-1"
          }
        >
          {restRows.map((p, i) => (
            <RankRow
              key={p.playerId || p.name}
              rank={i + 2}
              player={p}
              category={category}
              mode={mode}
              team={teamOf(p)}
              link={linkFor(p)}
              imgSrc={resolveImg(p)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <SkeletonBlock className="mb-8">
          <SkeletonBar className="mb-3 h-3 w-32" />
          <SkeletonBar className="h-9 w-64" />
        </SkeletonBlock>

        <SkeletonBlock className="mb-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
          <SkeletonBar className="mb-5 h-4 w-24" />
          <div className="md:flex md:items-center md:gap-8">
            <div className="flex flex-col items-center pb-4 md:w-60 md:flex-none md:pb-0">
              <SkeletonCircle className="h-28 w-28" />
              <SkeletonBar className="mt-3 h-5 w-36" />
              <SkeletonBar className="mt-2 h-10 w-24" />
            </div>
            <div className="grid gap-2 md:flex-1 md:grid-flow-col md:grid-rows-5 md:gap-x-8">
              {Array.from({ length: 9 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-2.5 px-2 py-1.5">
                  <SkeletonCircle className="h-9 w-9 flex-none" />
                  <SkeletonBar className="h-4 flex-1" />
                  <SkeletonBar className="h-4 w-10 flex-none" />
                </div>
              ))}
            </div>
          </div>
        </SkeletonBlock>

        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, cardIdx) => (
            <SkeletonBlock
              key={cardIdx}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5"
            >
              <SkeletonBar className="mb-5 h-4 w-24" />
              <div className="mb-3 flex items-center gap-3 rounded-lg p-3">
                <SkeletonCircle className="h-14 w-14 flex-none" />
                <SkeletonBar className="h-5 flex-1" />
                <SkeletonBar className="h-9 w-16 flex-none" />
              </div>
              {Array.from({ length: 5 }).map((__, rowIdx) => (
                <div key={rowIdx} className="flex items-center gap-2.5 px-2 py-1.5">
                  <SkeletonCircle className="h-9 w-9 flex-none" />
                  <SkeletonBar className="h-4 flex-1" />
                  <SkeletonBar className="h-4 w-10 flex-none" />
                </div>
              ))}
            </SkeletonBlock>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Leaders() {
  const { season } = useParams();
  const activeSeason = season || "szn5";

  const [players, setPlayers] = useState([]);
  const [teamsByPlayer, setTeamsByPlayer] = useState(() => new Map());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("avg"); // "avg" | "total"

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError("");
      setPlayers([]);

      try {
        const [leadersData, teamsData] = await Promise.all([
          apiGet(`/api/leaders/${encodeURIComponent(activeSeason)}`, {
            signal: controller.signal,
          }),
          apiGet(`/api/seasons/${encodeURIComponent(activeSeason)}/teams`, {
            signal: controller.signal,
          }).catch(() => null),
        ]);

        const filtered = (leadersData?.leaders || []).filter(
          (p) => !EXCLUDED_PLAYERS.has(p.name)
        );

        const teamMap = new Map();
        (teamsData?.teams || []).forEach((team) => {
          (team.roster || []).forEach((p) => {
            if (p.playerId) teamMap.set(p.playerId, team.name);
            if (p.slug) teamMap.set(p.slug, team.name);
          });
        });

        setPlayers(filtered);
        setTeamsByPlayer(teamMap);
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

  const teamOf = useMemo(
    () => (p) =>
      teamsByPlayer.get(p.playerId) || teamsByPlayer.get(p.slug) || null,
    [teamsByPlayer]
  );

  const resolveImg = (p) =>
    season ? seasonPlayerImageUrl(activeSeason, p.name) : playerImageUrl(p);

  const linkFor = (p) => {
    const slug = p.slug || playerSlug(p.name);
    return {
      to: season ? `/season/${activeSeason}/player/${slug}` : `/player/${slug}`,
      state: {
        from: season ? `/season/${activeSeason}/leaders` : "/leaders",
        label: "Leaders",
      },
    };
  };

  const topTen = (category) => {
    const key = mode === "avg" ? category.avgKey : category.totalKey;
    const tieKey = mode === "avg" ? category.totalKey : category.avgKey;
    return [...players]
      .sort((a, b) => b[key] - a[key] || b[tieKey] - a[tieKey])
      .slice(0, 10);
  };

  const jumpTo = (id) => {
    document
      .getElementById(`cat-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (error) {
    return <p className="py-4 text-center font-bold text-[#f87171]">{error}</p>;
  }

  if (loading) return <LoadingSkeleton />;

  if (players.length === 0) {
    return (
      <p className="py-4 text-center font-bold text-[color:var(--muted)]">
        No leaders found.
      </p>
    );
  }

  return (
    <div className="ifn-fade-in min-h-screen bg-[color:var(--bg)] pb-12">
        {/* Page header */}
        <div className="mx-auto max-w-5xl px-4 pt-8">
          <p className="text-[11px] font-black uppercase italic tracking-[0.3em] text-[#38bdf8]">
            IFNBL · {seasonLabel(activeSeason)}
          </p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-4xl font-black italic tracking-tight text-white">
              League Leaders
            </h1>

            {/* Ranking mode: re-sorts every board */}
            <div
              className="flex rounded-full border border-[color:var(--border)] bg-[color:var(--panel)] p-1"
              role="group"
              aria-label="Ranking mode"
            >
              {[
                { id: "avg", label: "Per game" },
                { id: "total", label: "Totals" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setMode(opt.id)}
                  aria-pressed={mode === opt.id}
                  className={`rounded-full px-4 py-1.5 text-xs font-black uppercase italic tracking-wide transition ${
                    mode === opt.id
                      ? "bg-[rgba(2,132,199,0.18)] text-[#38bdf8]"
                      : "text-[color:var(--muted)] hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category rail */}
        <div
          className="sticky z-30 mt-6 border-y border-[color:var(--border)] bg-[rgba(5,5,5,0.85)] backdrop-blur"
          style={{ top: "var(--site-nav-height)" }}
        >
          <div className="mx-auto flex max-w-5xl gap-1.5 overflow-x-auto px-4 py-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => jumpTo(cat.id)}
                className="flex-none rounded-full border border-transparent px-3.5 py-1.5 text-xs font-black uppercase italic tracking-wide text-[color:var(--muted)] transition hover:border-[color:var(--border)] hover:bg-[color:var(--panel)] hover:text-white"
              >
                {cat.chip}
              </button>
            ))}
          </div>
        </div>

        {/* Boards */}
        <div className="mx-auto mt-6 grid max-w-5xl gap-5 px-4 md:grid-cols-2">
          {CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              rows={topTen(cat)}
              mode={mode}
              teamOf={teamOf}
              resolveImg={resolveImg}
              linkFor={linkFor}
            />
          ))}
        </div>
      </div>
  );
}
