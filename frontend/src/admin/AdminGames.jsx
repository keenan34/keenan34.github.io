import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { getAdminGames } from "../api/client";
import { clearAdminToken, getAdminToken, isAdminAuthError } from "./auth";

function seasonNumber(slug) {
  const match = String(slug || "").match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function seasonLabel(slug) {
  const number = seasonNumber(slug);
  return number ? `Season ${number}` : slug || "Unknown season";
}

function scoreLabel(game) {
  if (game.status === "scheduled") {
    return "Not started";
  }

  const homeScore = game.homeTeam.score ?? 0;
  const awayScore = game.awayTeam.score ?? 0;
  return `${awayScore} - ${homeScore}`;
}

function sortGames(a, b) {
  if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber;
  return a.gameNumber - b.gameNumber;
}

function groupGamesBySeason(games) {
  const groups = new Map();

  (games || []).forEach((game) => {
    const slug = game.season?.slug || "unknown";
    if (!groups.has(slug)) groups.set(slug, []);
    groups.get(slug).push(game);
  });

  return [...groups.entries()]
    .map(([slug, seasonGames]) => [slug, seasonGames.sort(sortGames)])
    .sort(([leftSlug], [rightSlug]) => seasonNumber(rightSlug) - seasonNumber(leftSlug));
}

function groupGamesByWeek(seasonGames) {
  const groups = new Map();

  (seasonGames || []).forEach((game) => {
    const week = game.weekNumber || 0;
    if (!groups.has(week)) groups.set(week, []);
    groups.get(week).push(game);
  });

  return [...groups.entries()]
    .map(([week, weekGames]) => [
      week,
      weekGames.sort((a, b) => a.gameNumber - b.gameNumber),
    ])
    .sort(([leftWeek], [rightWeek]) => leftWeek - rightWeek);
}

function AdminGames() {
  const navigate = useNavigate();
  const token = getAdminToken();
  const [games, setGames] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    let isCurrent = true;
    setIsLoading(true);

    getAdminGames(token)
      .then((data) => {
        if (isCurrent) setGames(data.games || []);
      })
      .catch((err) => {
        if (isAdminAuthError(err)) {
          clearAdminToken();
          navigate("/admin/login", { replace: true });
          return;
        }
        if (isCurrent) setError(err.message);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [navigate, token]);

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  function handleLogout() {
    clearAdminToken();
    navigate("/admin/login", { replace: true });
  }

  return (
    <section className="admin-page admin-games-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Admin</p>
          <h2>Games</h2>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/admin/roster" className="admin-secondary-button" style={{ textDecoration: "none" }}>
            Rosters
          </Link>
          <button className="admin-secondary-button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      {error && <div className="admin-alert">{error}</div>}
      {isLoading && <div className="admin-muted-panel">Loading games...</div>}

      {!isLoading && (
        <div className="admin-game-folders">
          {groupGamesBySeason(games).map(([seasonSlug, seasonGames]) => (
            <details
              className="admin-game-folder"
              key={seasonSlug}
              open={seasonSlug === "szn5"}
            >
              <summary className="admin-game-folder-summary">
                <div>
                  <strong>{seasonLabel(seasonSlug)}</strong>
                  <span>{seasonGames.length} games</span>
                </div>
                <span className="admin-game-folder-hint">
                  {seasonSlug === "szn5" ? "Current" : "Archive"}
                </span>
              </summary>
              <div className="admin-week-groups">
                {groupGamesByWeek(seasonGames).map(([week, weekGames]) => (
                  <div className="admin-week-group" key={week}>
                    <div className="admin-week-header">
                      <strong>Week {week || "TBD"}</strong>
                      <span>
                        {weekGames.length} {weekGames.length === 1 ? "game" : "games"}
                      </span>
                    </div>
                    <div className="admin-games-list">
                      {weekGames.map((game) => (
                        <Link
                          className="admin-game-row"
                          key={game.id}
                          to={`/admin/games/${game.id}/live`}
                        >
                          <div className="admin-game-row-main">
                            <div className="admin-game-title">
                              {game.awayTeam.name} at {game.homeTeam.name}
                            </div>
                            <div className="admin-game-meta">
                              {game.season.slug} · Week {game.weekNumber} · Game{" "}
                              {game.gameNumber}
                            </div>
                          </div>
                          <div className="admin-game-score">
                            <span className={`admin-status admin-status-${game.status}`}>
                              {game.status}
                            </span>
                            <strong>{scoreLabel(game)}</strong>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                {!seasonGames.length && (
                  <div className="admin-muted-panel">No games available.</div>
                )}
              </div>
            </details>
          ))}
          {!games.length && <div className="admin-muted-panel">No games available.</div>}
        </div>
      )}
    </section>
  );
}

export default AdminGames;
