import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { resolveApiBaseUrl } from "../api/baseUrl";

const isPlaceholderTeam = (name = "") =>
  name.startsWith("Seed ") || name.startsWith("Winner of ");

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
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 text-center">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            {activeSeason.toUpperCase()}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Teams &amp; Standings
          </h1>
        </header>

      {/* STANDINGS TABLE */}
      <div className="mx-auto mb-10 max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-black text-slate-950">Standings</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center font-bold text-slate-500">
            Loading standings…
          </div>
        ) : errorMsg ? (
          <div className="p-6 text-center font-bold text-red-600">{errorMsg}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto divide-y divide-slate-200 text-center">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {["#", "Team", "W", "L", "Win%"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-xs font-black uppercase tracking-wide"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {standingsArray.map((row, idx) => (
                  <tr key={row.team} className={idx % 2 ? "bg-slate-50/70" : ""}>
                    <td className="px-4 py-3 font-bold text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-black text-slate-950">
                      {row.team}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">{row.wins}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{row.losses}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {(row.winPct * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TEAM CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Link
            key={team}
            to={
              season
                ? `/season/${activeSeason}/teams/${encodeURIComponent(
                    team
                  )}/roster`
                : `/teams/${encodeURIComponent(team)}/roster`
            }
            className="flex min-h-[88px] items-center justify-center rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <span className="text-lg font-black text-slate-950">{team}</span>
          </Link>
        ))}
      </div>
      </div>
    </div>
  );
}
