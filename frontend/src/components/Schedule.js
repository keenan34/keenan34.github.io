import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSeasonGames, getSeasonStandings } from "../api/client";

function seasonTitle(slug) {
  const match = String(slug || "").match(/(\d+)/);
  return match ? `Season ${match[1]}` : "Season";
}

function statusLabel(status) {
  if (status === "final" || status === "finished") return "Final";
  if (status === "live") return "Live";
  return "Scheduled";
}

function statusClasses(status) {
  if (status === "final" || status === "finished") {
    return "bg-[rgba(52,211,153,0.12)] text-[#34d399] border-[#34d399]";
  }
  if (status === "live") {
    return "bg-[rgba(248,113,113,0.12)] text-[#f87171] border-[#f87171]";
  }
  return "bg-[#1e293b] text-[#94a3b8] border-[#334155]";
}

export default function Schedule() {
  const { season } = useParams();
  const activeSeason = season || "szn5";

  const [games, setGames] = useState([]);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    Promise.all([
      getSeasonGames(activeSeason, { signal: controller.signal }),
      getSeasonStandings(activeSeason, { signal: controller.signal }),
    ])
      .then(([gamesData, standingsData]) => {
        const nextGames = Array.isArray(gamesData)
          ? gamesData
          : gamesData?.games || [];
        const nextRecords = (standingsData?.standings || []).reduce(
          (acc, row) => {
            const teamName = row.team || row.name;
            if (teamName) {
              acc[teamName] = {
                wins: row.wins || 0,
                losses: row.losses || 0,
              };
            }
            return acc;
          },
          {}
        );

        setGames(nextGames);
        setRecords(nextRecords);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Error loading schedule:", err);
        setGames([]);
        setRecords({});
        setError("Unable to load the schedule. Please try again later.");
        setLoading(false);
      });

    return () => controller.abort();
  }, [activeSeason]);

  const gamesByDate = games.reduce((acc, game) => {
    if (!acc[game.date]) acc[game.date] = [];
    acc[game.date].push(game);
    return acc;
  }, {});
  const dateEntries = Object.entries(gamesByDate).sort(
    ([a], [b]) => new Date(a) - new Date(b)
  );


  return (
    <div className="min-h-screen bg-[#0f172a] px-4 py-8 text-[#e2e8f0] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="mb-2 text-center text-xs font-black uppercase tracking-[0.18em] text-[#38bdf8]">
            {seasonTitle(activeSeason)}
          </p>
          <h2 className="text-center text-3xl font-black tracking-tight text-[#e2e8f0] sm:text-4xl">
            Schedule
          </h2>
        </header>

        {loading ? (
          <div className="rounded-lg border border-[#334155] bg-[#1e293b] p-8 text-center font-bold text-[#94a3b8] shadow-sm">
            Loading schedule...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-[#f87171] bg-[rgba(248,113,113,0.1)] p-8 text-center font-bold text-[#f87171]">
            {error}
          </div>
        ) : (
          <div className="grid gap-6">
            {dateEntries.map(([date, dayGames]) => {
              return (
                <section
                  key={date}
                  className="overflow-hidden rounded-lg border border-[#334155] bg-[#1e293b] shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-[#334155] px-4 py-3 sm:px-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748b]">
                        Game Day
                      </p>
                      <h3 className="text-lg font-black text-[#e2e8f0]">
                        {date || "Date TBD"}
                      </h3>
                    </div>
                    <span className="rounded-full bg-[rgba(56,189,248,0.12)] px-3 py-1 text-xs font-black text-[#38bdf8]">
                      {dayGames.length} {dayGames.length === 1 ? "game" : "games"}
                    </span>
                  </div>

                  <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                    {dayGames.map((game, idx) => {
                      const [weekPart, idPart] =
                        typeof game.gameId === "string"
                          ? game.gameId.split("-")
                          : ["", ""];
                      const isFinished =
                        game.status === "final" || game.status === "finished";
                      const teamAWon = isFinished && game.scoreA > game.scoreB;
                      const teamBWon = isFinished && game.scoreB > game.scoreA;
                      const recA = records[game.teamA] || { wins: 0, losses: 0 };
                      const recB = records[game.teamB] || { wins: 0, losses: 0 };
                      const hasScore =
                        isFinished &&
                        typeof game.scoreA === "number" &&
                        typeof game.scoreB === "number";

                      const cardClasses = `h-full rounded-lg border bg-[#0f172a] p-4 shadow-sm transition ${
                        isFinished
                          ? "border-[#334155] hover:border-[#38bdf8] hover:shadow-md"
                          : "border-[#334155] opacity-80"
                      }`;

                      const teamNameClass = (won) =>
                        `min-w-0 truncate text-sm font-black ${
                          won ? "text-[#34d399]" : "text-[#e2e8f0]"
                        }`;

                      const content = (
                        <article className={cardClasses}>
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${statusClasses(
                                game.status
                              )}`}
                            >
                              {statusLabel(game.status)}
                            </span>
                            <span className="text-xs font-bold text-[#94a3b8]">
                              {game.time || "TBD"}
                            </span>
                          </div>

                          <div className="grid gap-3">
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                              <div className="min-w-0">
                                <div className={teamNameClass(teamAWon)}>
                                  {game.teamA}
                                </div>
                                <div className="mt-0.5 text-xs font-bold text-[#94a3b8]">
                                  {recA.wins}-{recA.losses}
                                </div>
                              </div>
                              <div className="min-w-[2.25rem] text-right text-2xl font-black text-[#e2e8f0]">
                                {hasScore ? game.scoreA : "-"}
                              </div>
                            </div>

                            <div className="h-px bg-[#334155]" />

                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                              <div className="min-w-0">
                                <div className={teamNameClass(teamBWon)}>
                                  {game.teamB}
                                </div>
                                <div className="mt-0.5 text-xs font-bold text-[#94a3b8]">
                                  {recB.wins}-{recB.losses}
                                </div>
                              </div>
                              <div className="min-w-[2.25rem] text-right text-2xl font-black text-[#e2e8f0]">
                                {hasScore ? game.scoreB : "-"}
                              </div>
                            </div>
                          </div>

                          {!isFinished && (
                            <div className="mt-4 rounded-md bg-[#1e293b] px-3 py-2 text-center text-xs font-black text-[#94a3b8]">
                              Box score available after game
                            </div>
                          )}
                        </article>
                      );

                      return isFinished && weekPart && idPart ? (
                        <Link
                          key={idx}
                          to={`/season/${activeSeason}/boxscore/${weekPart}/${idPart}`}
                          className="block no-underline"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div key={idx}>{content}</div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
