import React, { useEffect, useState, useCallback } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  getAdminRoster,
  addAdminRosterPlayer,
  updateAdminRosterPlayerNumber,
  deleteAdminRosterPlayer,
} from "../api/client";
import {
  clearAdminToken,
  getAdminToken,
  isAdminAuthError,
  useAdminTokenRefresh,
} from "./auth";

const CURRENT_SEASON = "szn5";

export default function AdminRoster() {
  const navigate = useNavigate();
  const token = getAdminToken();

  useAdminTokenRefresh();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // per-team add-player drafts: { [teamId]: { name, number } }
  const [drafts, setDrafts] = useState({});
  // which player is being saved/deleted
  const [savingId, setSavingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [addingTeamId, setAddingTeamId] = useState("");
  // inline number editing: { [playerId]: string }
  const [numberEdits, setNumberEdits] = useState({});

  const handleAuthError = useCallback((err) => {
    if (!isAdminAuthError(err)) return false;
    clearAdminToken();
    navigate("/admin/login", { replace: true });
    return true;
  }, [navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminRoster(CURRENT_SEASON, token);
      setTeams(data.teams || []);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, handleAuthError]);

  useEffect(() => { load(); }, [load]);

  if (!token) return <Navigate to="/admin/login" replace />;

  function setDraft(teamId, field, value) {
    setDrafts((d) => ({ ...d, [teamId]: { name: "", number: "", ...(d[teamId] || {}), [field]: value } }));
  }

  async function addPlayer(teamId) {
    const draft = drafts[teamId] || {};
    const name = String(draft.name || "").trim();
    if (!name) { setError("Player name is required"); return; }

    setAddingTeamId(teamId);
    setError("");
    setNotice("");
    try {
      await addAdminRosterPlayer(CURRENT_SEASON, teamId, { name, number: draft.number || "" }, token);
      setDrafts((d) => ({ ...d, [teamId]: { name: "", number: "" } }));
      setNotice(`Added ${name}`);
      await load();
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err.message);
    } finally {
      setAddingTeamId("");
    }
  }

  async function saveNumber(teamId, playerId) {
    const number = numberEdits[playerId] ?? "";
    setSavingId(playerId);
    setError("");
    setNotice("");
    try {
      await updateAdminRosterPlayerNumber(CURRENT_SEASON, teamId, playerId, number, token);
      setNumberEdits((e) => { const next = { ...e }; delete next[playerId]; return next; });
      setNotice("Jersey number updated");
      await load();
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err.message);
    } finally {
      setSavingId("");
    }
  }

  async function removePlayer(teamId, playerId, playerName) {
    if (!window.confirm(`Remove ${playerName} from this team?`)) return;
    setDeletingId(playerId);
    setError("");
    setNotice("");
    try {
      await deleteAdminRosterPlayer(CURRENT_SEASON, teamId, playerId, token);
      setNotice(`Removed ${playerName}`);
      await load();
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err.message);
    } finally {
      setDeletingId("");
    }
  }

  return (
    <section className="admin-page admin-games-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Admin</p>
          <h2>Rosters — {CURRENT_SEASON.toUpperCase()}</h2>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/admin/games" className="admin-secondary-button">
            ← Games
          </Link>
          <button
            className="admin-secondary-button"
            onClick={() => { clearAdminToken(); navigate("/admin/login", { replace: true }); }}
          >
            Log out
          </button>
        </div>
      </div>

      {error && <div className="admin-alert">{error}</div>}
      {notice && <div className="admin-success">{notice}</div>}
      {loading && <div className="admin-muted-panel">Loading rosters...</div>}

      {!loading && (
        <div style={{ display: "grid", gap: 20 }}>
          {teams.map((team) => {
            const draft = drafts[team.id] || { name: "", number: "" };
            return (
              <div key={team.id} className="admin-game-folder" style={{ padding: 0 }}>
                {/* Team header */}
                <div style={{ padding: "16px 18px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <strong style={{ fontSize: 18, color: "#0f172a" }}>{team.name}</strong>
                  <span style={{ marginLeft: 10, color: "#64748b", fontSize: 13 }}>{team.players.length} players</span>
                </div>

                {/* Player rows */}
                <div style={{ padding: "10px 14px", display: "grid", gap: 8 }}>
                  {team.players.map((player) => {
                    const isEditing = player.id in numberEdits;
                    return (
                      <div key={player.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                        {/* Jersey number */}
                        {isEditing ? (
                          <input
                            style={{ width: 56, minHeight: 34, border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 8px", fontSize: 14, fontWeight: 800, textAlign: "center", color: "#0f172a", background: "#fff" }}
                            value={numberEdits[player.id]}
                            onChange={(e) => setNumberEdits((ed) => ({ ...ed, [player.id]: e.target.value }))}
                            placeholder="#"
                          />
                        ) : (
                          <span
                            style={{ width: 56, textAlign: "center", fontSize: 14, fontWeight: 900, color: "#64748b", cursor: "pointer" }}
                            title="Click to edit"
                            onClick={() => setNumberEdits((ed) => ({ ...ed, [player.id]: player.number || "" }))}
                          >
                            #{player.number || "—"}
                          </span>
                        )}

                        {/* Name */}
                        <span style={{ flex: 1, fontWeight: 800, color: "#0f172a", fontSize: 15 }}>{player.name}</span>

                        {/* Actions */}
                        {isEditing ? (
                          <>
                            <button
                              className="admin-primary-button"
                              style={{ minHeight: 34, padding: "6px 12px", fontSize: 13 }}
                              disabled={savingId === player.id}
                              onClick={() => saveNumber(team.id, player.id)}
                            >
                              {savingId === player.id ? "Saving..." : "Save"}
                            </button>
                            <button
                              className="admin-secondary-button"
                              style={{ minHeight: 34, padding: "6px 12px", fontSize: 13 }}
                              onClick={() => setNumberEdits((ed) => { const next = { ...ed }; delete next[player.id]; return next; })}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="admin-secondary-button"
                            style={{ minHeight: 34, padding: "6px 12px", fontSize: 13, borderColor: "#fecaca", color: "#b91c1c" }}
                            disabled={deletingId === player.id}
                            onClick={() => removePlayer(team.id, player.id, player.name)}
                          >
                            {deletingId === player.id ? "Removing..." : "Remove"}
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {!team.players.length && (
                    <p style={{ color: "#94a3b8", fontWeight: 700, fontSize: 13, margin: 0 }}>No players yet.</p>
                  )}

                  {/* Add player form */}
                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 8, marginTop: 8, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
                    <input
                      placeholder="#"
                      value={draft.number}
                      onChange={(e) => setDraft(team.id, "number", e.target.value)}
                      style={{ minHeight: 40, border: "1px solid #dbe2ea", borderRadius: 8, padding: "8px 10px", fontSize: 15, fontWeight: 800, color: "#0f172a", background: "#fff" }}
                    />
                    <input
                      placeholder="Player name"
                      value={draft.name}
                      onChange={(e) => setDraft(team.id, "name", e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addPlayer(team.id); }}
                      style={{ minHeight: 40, border: "1px solid #dbe2ea", borderRadius: 8, padding: "8px 10px", fontSize: 15, fontWeight: 800, color: "#0f172a", background: "#fff" }}
                    />
                    <button
                      className="admin-primary-button"
                      disabled={addingTeamId === team.id}
                      onClick={() => addPlayer(team.id)}
                    >
                      {addingTeamId === team.id ? "Adding..." : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
