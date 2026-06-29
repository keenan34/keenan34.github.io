import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { resolveApiBaseUrl } from "../api/baseUrl";
import { SkeletonBlock, SkeletonBar, SkeletonCircle } from "./Skeleton";

const isPlaceholderTeam = (name = "") =>
  /^Seed\s+\d+/i.test(name) || /\bWinner\b/i.test(name);

const PUBLIC_URL = process.env.PUBLIC_URL || "";

// same slug rule used elsewhere: lowercase, spaces -> underscores, leading "the" dropped
const teamSlug = (name) =>
  String(name || "")
    .replace(/^the\s+/i, "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const teamLogoUrl = (season, name) =>
  `${PUBLIC_URL}/seasons/${season}/images/teams/${teamSlug(name)}.png`;

// small standings logo with an initials fallback for teams without an image
function TeamLogo({ season, name }) {
  const [error, setError] = useState(false);
  const initials = String(name || "")
    .replace(/^the\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (error) {
    return (
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-[#e2e8f0] bg-[#f8fafc] text-xs font-black text-[#64748b]">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={teamLogoUrl(season, name)}
      alt={`${name} logo`}
      width="36"
      height="36"
      className="h-9 w-9 flex-none object-contain"
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

const API_BASE_URL = resolveApiBaseUrl();

async function apiGet(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `API request failed with ${response.status}`);
  }

  return data;
}

export default function TeamList() {
  const { season } = useParams();
  const activeSeason = season || "szn5";

  const [teams, setTeams] = useState([]);
  const [standings, setStandings] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollToTop();
    const frame = requestAnimationFrame(scrollToTop);
    const timer = window.setTimeout(scrollToTop, 80);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [activeSeason]);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setErrorMsg("");

    Promise.all([
      apiGet(`/api/seasons/${encodeURIComponent(activeSeason)}/teams`, {
        signal: controller.signal,
      }),
      apiGet(`/api/standings/${encodeURIComponent(activeSeason)}`, {
        signal: controller.signal,
      }),
    ])
      .then(([teamsData, standingsData]) => {
        const realTeams = (teamsData?.teams || [])
          .map((team) => team.name)
          .filter((team) => team && !isPlaceholderTeam(team));

        const recordMap = (standingsData?.standings || []).reduce(
          (acc, row) => {
            const teamName = row.team || row.name;
            if (teamName && !isPlaceholderTeam(teamName)) {
              acc[teamName] = {
                wins: row.wins || 0,
                losses: row.losses || 0,
              };
            }
            return acc;
          },
          {}
        );

        if (!realTeams.length) {
          throw new Error("No teams found for this season");
        }

        realTeams.forEach((team) => {
          if (!recordMap[team]) recordMap[team] = { wins: 0, losses: 0 };
        });

        setTeams(realTeams);
        setStandings(recordMap);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error(err);
        setTeams([]);
        setStandings({});
        setErrorMsg(err.message || "Failed to load standings");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [activeSeason]);

  const standingsArray = useMemo(() => {
    return teams
      .map((team) => {
        const { wins = 0, losses = 0 } = standings[team] || {};
        const played = wins + losses;
        const winPct = played ? wins / played : 0;
        return { team, wins, losses, winPct };
      })
      .sort((a, b) => {
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
        return b.wins - a.wins;
      });
  }, [teams, standings]);

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 text-[#0f172a] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 text-center">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#0284c7]">
            {activeSeason.toUpperCase()}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-[#0f172a] sm:text-4xl">
            Teams &amp; Standings
          </h1>
        </header>

      {/* STANDINGS TABLE */}
      <div className="mx-auto max-w-4xl overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#ffffff] shadow-sm">
        <div className="border-b border-[#e2e8f0] px-6 py-5">
          <h2 className="text-2xl font-black text-[#0f172a]">Standings</h2>
        </div>

        {loading ? (
          <SkeletonBlock className="divide-y divide-[#e2e8f0]">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-4 px-6 py-5">
                <SkeletonBar className="h-4 w-4 flex-none" />
                <SkeletonCircle className="h-9 w-9 flex-none" />
                <SkeletonBar className="h-5 flex-1" />
                <SkeletonBar className="h-4 w-8 flex-none" />
                <SkeletonBar className="h-4 w-8 flex-none" />
                <SkeletonBar className="h-4 w-12 flex-none" />
              </div>
            ))}
          </SkeletonBlock>
        ) : errorMsg ? (
          <div className="p-6 text-center font-bold text-[#f87171]">{errorMsg}</div>
        ) : (
          <div className="ifn-fade-in overflow-x-auto">
            <table className="w-full table-auto divide-y divide-[#e2e8f0] text-center text-base sm:text-lg">
              <thead className="bg-[#f8fafc] text-[#64748b]">
                <tr>
                  {["#", "Team", "W", "L", "Win%"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-4 text-sm font-black uppercase tracking-wide"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] bg-[#ffffff]">
                {standingsArray.map((row, idx) => (
                  <tr key={row.team} className={idx % 2 ? "bg-[#f8fafc]" : ""}>
                    <td className="px-4 py-5 font-bold text-[#64748b]">{idx + 1}</td>
                    <td className="px-4 py-5 text-left">
                      <Link
                        to={
                          season
                            ? `/season/${activeSeason}/teams/${encodeURIComponent(
                                row.team
                              )}/roster`
                            : `/teams/${encodeURIComponent(row.team)}/roster`
                        }
                        className="inline-flex min-h-11 items-center gap-3 rounded-md px-3 text-xl font-black text-[#0284c7] transition hover:bg-[#e0f2fe] hover:text-[#075985] hover:underline focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:ring-offset-2"
                      >
                        <TeamLogo season={activeSeason} name={row.team} />
                        {row.team}
                      </Link>
                    </td>
                    <td className="px-4 py-5 font-bold text-[#475569]">{row.wins}</td>
                    <td className="px-4 py-5 font-bold text-[#475569]">{row.losses}</td>
                    <td className="px-4 py-5 font-bold text-[#475569]">
                      {(row.winPct * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
