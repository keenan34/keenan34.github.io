import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  getAdminGames,
  getSeasonTeams,
  updateAdminGameMatchup,
} from "../api/client";
import {
  clearAdminToken,
  getAdminToken,
  isAdminAuthError,
  useAdminTokenRefresh,
} from "./auth";

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

const pickerPanel = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 10,
  margin: "2px 0 8px",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px dashed #f59e0b",
  background: "rgba(245,158,11,0.08)",
};

const pickerField = { display: "flex", alignItems: "center", gap: 6 };

const pickerLinkButton = {
  border: "none",
  background: "none",
  padding: 0,
  fontSize: 12,
  fontWeight: 800,
  color: "#0284c7",
  cursor: "pointer",
};

function MatchupPicker({ game, teams, disabled, onAssign }) {
  const [editing, setEditing] = useState({ home: false, away: false });

  const sides = [
    ["home", game.homeTeam],
    ["away", game.awayTeam],
  ];

  function stopEditing(side) {
    setEditing((current) => ({ ...current, [side]: false }));
  }

  return (
    <div style={pickerPanel}>
      <span style={{ fontSize: 12, fontWeight: 800, color: "#b45309" }}>
        Set matchup
      </span>
      {sides.map(([side, team]) => {
        const showSelect = team.isPlaceholder || editing[side];

        if (showSelect) {
          return (
            <span style={pickerField} key={side}>
              <span
                style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}
              >
                {team.isPlaceholder ? team.name : "Change to"}
              </span>
              <select
                value={team.isPlaceholder ? "" : team.id}
                disabled={disabled || !teams.length}
                onChange={(event) => {
                  onAssign(game, side, event.target.value);
                  stopEditing(side);
                }}
              >
                <option value="">
                  {teams.length ? "Pick team…" : "Loading…"}
                </option>
                {teams.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              {!team.isPlaceholder && (
                <button
                  type="button"
                  style={pickerLinkButton}
                  onClick={() => stopEditing(side)}
                >
                  Cancel
                </button>
              )}
            </span>
          );
        }

        return (
          <span style={pickerField} key={side}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
              {team.name}
            </span>
            <button
              type="button"
              style={pickerLinkButton}
              disabled={disabled}
              onClick={() => setEditing((current) => ({ ...current, [side]: true }))}
            >
              Change
            </button>
          </span>
        );
      })}
    </div>
  );
}

function AdminGames() {
  const navigate = useNavigate();
  const token = getAdminToken();

  useAdminTokenRefresh();
  const [games, setGames] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [teamsBySeason, setTeamsBySeason] = useState({});
  const [assigningGameId, setAssigningGameId] = useState("");

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

  // Load the real teams for any season with a playoff game, so bracket slots
  // can be assigned (or corrected) inline.
  useEffect(() => {
    const slugs = [
      ...new Set(
        games
          .filter((game) => game.isPlayoff)
          .map((game) => game.season?.slug)
          .filter(Boolean)
      ),
    ].filter((slug) => !teamsBySeason[slug]);

    if (!slugs.length) return;

    let isCurrent = true;
    Promise.all(
      slugs.map((slug) =>
        getSeasonTeams(slug)
          .then((data) => [slug, data.teams || []])
          .catch(() => [slug, []])
      )
    ).then((entries) => {
      if (!isCurrent) return;
      setTeamsBySeason((current) => ({
        ...current,
        ...Object.fromEntries(entries),
      }));
    });

    return () => {
      isCurrent = false;
    };
  }, [games, teamsBySeason]);

  async function assignMatchupTeam(game, side, teamId) {
    if (!teamId) return;

    setAssigningGameId(game.id);
    setError("");

    try {
      const payload =
        side === "home" ? { homeTeamId: teamId } : { awayTeamId: teamId };
      const data = await updateAdminGameMatchup(game.id, payload, token);
      setGames((current) =>
        current.map((item) => (item.id === game.id ? data.game : item))
      );
    } catch (err) {
      if (isAdminAuthError(err)) {
        clearAdminToken();
        navigate("/admin/login", { replace: true });
        return;
      }
      setError(err.message);
    } finally {
      setAssigningGameId("");
    }
  }

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
                      {weekGames.map((game) => {
                        return (
                          <div key={game.id}>
                            <Link
                              className="admin-game-row"
                              to={`/admin/games/${game.id}/live`}
                            >
                              <div className="admin-game-row-main">
                                <div className="admin-game-title">
                                  {game.awayTeam.name} at {game.homeTeam.name}
                                </div>
                                <div className="admin-game-meta">
                                  {game.season.slug} · Week {game.weekNumber} ·
                                  Game {game.gameNumber}
                                  {game.isPlayoff ? " · Playoff" : ""}
                                </div>
                              </div>
                              <div className="admin-game-score">
                                <span
                                  className={`admin-status admin-status-${game.status}`}
                                >
                                  {game.status}
                                </span>
                                <strong>{scoreLabel(game)}</strong>
                              </div>
                            </Link>

                            {game.isPlayoff && (
                              <MatchupPicker
                                game={game}
                                teams={teamsBySeason[game.season?.slug] || []}
                                disabled={assigningGameId === game.id}
                                onAssign={assignMatchupTeam}
                              />
                            )}
                          </div>
                        );
                      })}
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
