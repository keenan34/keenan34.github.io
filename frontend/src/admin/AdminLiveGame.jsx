import React, { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  addAdminTempPlayer,
  getAdminGameEvents,
  getAdminLiveGame,
  removeAdminRosterPlayer,
  reopenAdminTeam,
  resetAdminGameEvents,
  swapAdminGameHomeAway,
  submitAdminTeamToPublish,
  undoAdminGameEvent,
  updateAdminGameStatus,
  updateAdminGameScore,
  updateAdminPlayerStats,
} from "../api/client";
import { resolveApiBaseUrl } from "../api/baseUrl";
import { clearAdminToken, getAdminToken, isAdminAuthError } from "./auth";

const STAT_FIELDS = [
  ["points", "PTS"],
  ["fgm", "FGM"],
  ["fga", "FGA"],
  ["twoPm", "2PM"],
  ["twoPa", "2PA"],
  ["threePm", "3PM"],
  ["threePa", "3PA"],
  ["ftm", "FTM"],
  ["fta", "FTA"],
  ["rebounds", "REB"],
  ["assists", "AST"],
  ["turnovers", "TO"],
  ["fouls", "FLS"],
  ["stealsBlocks", "STL/BLK"],
];

const STAT_LABEL_BY_FIELD = STAT_FIELDS.reduce(
  (labels, [field, label]) => ({
    ...labels,
    [field]: label,
  }),
  { didPlay: "Played" }
);

const SOCKET_URL = resolveApiBaseUrl();
const PLAYER_PICK_FEEDBACK_MS = 170;

function formatEventTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function changedStats(event) {
  const beforeStats = event.beforeStats || {};
  const afterStats = event.afterStats || {};

  return ["didPlay", ...STAT_FIELDS.map(([field]) => field)]
    .filter((field) => beforeStats[field] !== afterStats[field])
    .map((field) => {
      const beforeValue =
        field === "didPlay"
          ? beforeStats[field]
            ? "yes"
            : "no"
          : beforeStats[field] ?? 0;
      const afterValue =
        field === "didPlay"
          ? afterStats[field]
            ? "yes"
            : "no"
          : afterStats[field] ?? 0;

      return `${STAT_LABEL_BY_FIELD[field]} ${beforeValue} -> ${afterValue}`;
    });
}

function statDelta(event, field) {
  const beforeStats = event.beforeStats || {};
  const afterStats = event.afterStats || {};
  return (afterStats[field] ?? 0) - (beforeStats[field] ?? 0);
}

function statTotal(event, field) {
  return event.afterStats?.[field] ?? 0;
}

function totalLabel(event, field, label) {
  return `${statTotal(event, field)} ${label}`;
}

function feedEventDetails(event) {
  const points = statDelta(event, "points");
  const fga = statDelta(event, "fga");
  const twoPa = statDelta(event, "twoPa");
  const threePa = statDelta(event, "threePa");
  const ftm = statDelta(event, "ftm");
  const fta = statDelta(event, "fta");
  const rebounds = statDelta(event, "rebounds");
  const assists = statDelta(event, "assists");
  const turnovers = statDelta(event, "turnovers");
  const fouls = statDelta(event, "fouls");
  const stealsBlocks = statDelta(event, "stealsBlocks");
  const playerName = event.player?.name || "Unknown player";

  if (points > 0) {
    const title =
      ftm > 0 ? "Free throw" : points === 3 ? "3PT bucket" : "2PT bucket";
    return {
      title,
      statLine: `${playerName} · ${totalLabel(event, "points", "pts")}`,
      notes: assists > 0 ? ["Assist recorded"] : [],
    };
  }

  if (fta > 0 && ftm === 0) {
    return {
      title: "Missed free throw",
      statLine: `${playerName} · ${totalLabel(event, "fta", "fta")}`,
      notes: [],
    };
  }

  if (fga > 0 || twoPa > 0 || threePa > 0) {
    return {
      title: threePa > 0 ? "Missed 3PT shot" : "Missed 2PT shot",
      statLine: `${playerName} · ${totalLabel(event, "fga", "fga")}`,
      notes: [],
    };
  }

  if (rebounds > 0) {
    return {
      title: "Rebound",
      statLine: `${playerName} · ${totalLabel(event, "rebounds", "reb")}`,
      notes: [],
    };
  }

  if (assists > 0) {
    return {
      title: "Assist",
      statLine: `${playerName} · ${totalLabel(event, "assists", "ast")}`,
      notes: [],
    };
  }

  if (stealsBlocks > 0) {
    return {
      title: "Steal / block",
      statLine: `${playerName} · ${totalLabel(
        event,
        "stealsBlocks",
        "stock"
      )}`,
      notes: [],
    };
  }

  if (turnovers > 0) {
    return {
      title: "Turnover",
      statLine: `${playerName} · ${totalLabel(event, "turnovers", "to")}`,
      notes: [],
    };
  }

  if (fouls > 0) {
    return {
      title: "Foul",
      statLine: `${playerName} · ${totalLabel(event, "fouls", "fouls")}`,
      notes: [],
    };
  }

  return {
    title: "Stat update",
    statLine: playerName,
    notes: changedStats(event),
  };
}

function isMadeShotEvent(event) {
  return statDelta(event, "points") > 0;
}

function isAssistEvent(event) {
  return (
    statDelta(event, "assists") > 0 &&
    statDelta(event, "points") === 0 &&
    statDelta(event, "fga") === 0
  );
}

function combineFeedEvents(events) {
  const combined = [];

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const nextEvent = events[index + 1];

    if (
      isAssistEvent(event) &&
      nextEvent &&
      isMadeShotEvent(nextEvent) &&
      event.team?.id === nextEvent.team?.id
    ) {
      combined.push({ event: nextEvent, assistEvent: event });
      index += 1;
    } else {
      combined.push({ event, assistEvent: null });
    }
  }

  return combined;
}

function isVisibleFeedEvent(event) {
  if (event.eventType !== "player_stats_updated") return false;
  return feedEventDetails(event).title !== "Stat update";
}

function makeEditablePlayer(player) {
  const stats = {
    didPlay: Boolean(player.didPlay),
  };

  STAT_FIELDS.forEach(([field]) => {
    stats[field] = player[field] ?? 0;
  });

  return {
    ...player,
    stats,
  };
}

function teamInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function teamAccentClass(index) {
  return index === 0 ? "admin-team-badge-home" : "admin-team-badge-away";
}

function buildStatPatch(actionKey, stats) {
  switch (actionKey) {
    case "made2":
      return {
        ...stats,
        didPlay: true,
        points: stats.points + 2,
        fgm: stats.fgm + 1,
        fga: stats.fga + 1,
        twoPm: stats.twoPm + 1,
        twoPa: stats.twoPa + 1,
      };
    case "made3":
      return {
        ...stats,
        didPlay: true,
        points: stats.points + 3,
        fgm: stats.fgm + 1,
        fga: stats.fga + 1,
        threePm: stats.threePm + 1,
        threePa: stats.threePa + 1,
      };
    case "freeThrow":
      return {
        ...stats,
        didPlay: true,
        points: stats.points + 1,
        ftm: stats.ftm + 1,
        fta: stats.fta + 1,
      };
    case "freeThrowMiss":
      return {
        ...stats,
        didPlay: true,
        fta: stats.fta + 1,
      };
    case "miss2":
      return {
        ...stats,
        didPlay: true,
        fga: stats.fga + 1,
        twoPa: stats.twoPa + 1,
      };
    case "miss3":
      return {
        ...stats,
        didPlay: true,
        fga: stats.fga + 1,
        threePa: stats.threePa + 1,
      };
    case "reb":
      return {
        ...stats,
        didPlay: true,
        rebounds: stats.rebounds + 1,
      };
    case "ast":
      return {
        ...stats,
        didPlay: true,
        assists: stats.assists + 1,
      };
    case "stl":
    case "blk":
      return {
        ...stats,
        didPlay: true,
        stealsBlocks: stats.stealsBlocks + 1,
      };
    case "to":
      return {
        ...stats,
        didPlay: true,
        turnovers: stats.turnovers + 1,
      };
    case "foul":
      return {
        ...stats,
        didPlay: true,
        fouls: stats.fouls + 1,
      };
    default:
      return stats;
  }
}

const SIMPLE_ACTION_LABELS = {
  freeThrow: "Free throw",
  freeThrowMiss: "Free throw miss",
  miss2: "2-point miss",
  miss3: "3-point miss",
  reb: "Rebound",
  ast: "Assist",
  stl: "Steal",
  blk: "Block",
  to: "Turnover",
  foul: "Foul",
};

function teamStatusLabel(status) {
  return status === "finalized" ? "Finalized" : "Draft";
}

function gameStatusLabel(status) {
  if (status === "final") return "Finished";
  return status ? status[0].toUpperCase() + status.slice(1) : "Scheduled";
}

function FeedAvatar({ player, team }) {
  const [error, setError] = useState(false);
  const imgUrl = player?.imgUrl;
  const fallback = teamInitials(player?.name || team?.name);
  if (!imgUrl || error) return <>{fallback}</>;
  return <img src={imgUrl} alt="" onError={() => setError(true)} />;
}

function SheetPlayerPhoto({ imgUrl, name }) {
  const [error, setError] = useState(false);
  if (!imgUrl || error) {
    return (
      <span className="admin-sheet-player-photo admin-sheet-player-photo-fallback">
        {teamInitials(name)}
      </span>
    );
  }
  return (
    <img
      src={imgUrl}
      alt=""
      className="admin-sheet-player-photo"
      onError={() => setError(true)}
    />
  );
}

function AdminLiveGame() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const token = getAdminToken();

  const [game, setGame] = useState(null);
  const [rosters, setRosters] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSwappingHomeAway, setIsSwappingHomeAway] = useState(false);
  const [isResettingEvents, setIsResettingEvents] = useState(false);
  const [addingTempPlayerTeamId, setAddingTempPlayerTeamId] = useState("");
  const [tempPlayerDrafts, setTempPlayerDrafts] = useState({});
  const [savingPlayerId, setSavingPlayerId] = useState("");
  const [finalizingTeamId, setFinalizingTeamId] = useState("");
  const [reopeningTeamId, setReopeningTeamId] = useState("");
  const [removingPlayerId, setRemovingPlayerId] = useState("");
  const [undoingEventId, setUndoingEventId] = useState("");
  const [playerFeedback, setPlayerFeedback] = useState({});
  const [activeTab, setActiveTab] = useState("scoring");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [shotFlow, setShotFlow] = useState(null);
  const [sheetSelectedPlayerId, setSheetSelectedPlayerId] = useState("");
  const [scoreDraft, setScoreDraft] = useState({ away: "0", home: "0" });
  const [scoreDraftDirty, setScoreDraftDirty] = useState(false);
  const [scoreEditorOpen, setScoreEditorOpen] = useState(false);
  const [reassigningEvent, setReassigningEvent] = useState(null);

  const handleAdminError = useCallback(
    (error) => {
      if (!isAdminAuthError(error)) return false;

      clearAdminToken();
      navigate("/admin/login", { replace: true });
      return true;
    },
    [navigate]
  );

  const score = useMemo(() => {
    if (!game) return "-";
    if (game.status === "scheduled") return "Not started";
    return `${game.homeTeam.score ?? 0} - ${game.awayTeam.score ?? 0}`;
  }, [game]);

  const loadEvents = useCallback(async () => {
    if (!token) return;

    setIsLoadingEvents(true);

    try {
      const data = await getAdminGameEvents(gameId, token);
      setEvents(data.events || []);
    } catch (err) {
      if (handleAdminError(err)) return;
      setError(err.message);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [gameId, handleAdminError, token]);

  const applyLiveGameState = useCallback((data) => {
    setGame(data.game);
    setRosters(
      (data.rosters || []).map((roster) => ({
        ...roster,
        players: roster.players.map(makeEditablePlayer),
      }))
    );
  }, []);

  useEffect(() => {
    if (!token) return;

    let isCurrent = true;

    async function loadGame() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getAdminLiveGame(gameId, token);
        if (!isCurrent) return;

        applyLiveGameState(data);
      } catch (err) {
        if (handleAdminError(err)) return;
        if (isCurrent) setError(err.message);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadGame();

    return () => {
      isCurrent = false;
    };
  }, [applyLiveGameState, gameId, handleAdminError, token]);

  useEffect(() => {
    if (!token) return;
    loadEvents();
  }, [loadEvents, token]);

  useEffect(() => {
    if (!rosters.length) return;

    setSelectedTeamId((currentTeamId) => {
      if (currentTeamId && rosters.some((roster) => roster.team.id === currentTeamId)) {
        return currentTeamId;
      }
      return rosters[0].team.id;
    });
  }, [rosters]);

  const selectedTeam = useMemo(() => {
    if (!rosters.length) return null;
    return rosters.find((roster) => roster.team.id === selectedTeamId) || rosters[0];
  }, [rosters, selectedTeamId]);

  useEffect(() => {
    if (!selectedTeam?.players.length) {
      setSelectedPlayerId("");
      return;
    }

    setSelectedPlayerId((currentPlayerId) =>
      selectedTeam.players.some((player) => player.id === currentPlayerId)
        ? currentPlayerId
        : ""
    );
  }, [selectedTeam]);

  useEffect(() => {
    if (!game || scoreDraftDirty) return;

    setScoreDraft({
      away: String(game.awayTeam?.score ?? 0),
      home: String(game.homeTeam?.score ?? 0),
    });
  }, [game, scoreDraftDirty]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = io(SOCKET_URL || undefined, {
      auth: { token },
      reconnection: true,
    });

    function handleLiveGameUpdate(data) {
      applyLiveGameState(data);

      if (data.reason === "stats-updated") {
        loadEvents();
      } else if (data.reason === "game-started") {
        setNotice("Game started");
      } else if (data.reason === "team-finalized") {
        setNotice("Team finalized");
      } else if (data.reason === "team-reopened") {
        setNotice("Team reopened");
      } else if (data.reason === "finalized") {
        setNotice("Game finalized");
      } else if (data.reason === "undo") {
        setNotice("Undo applied");
        loadEvents();
      } else if (data.reason === "score-updated") {
        setNotice("Score updated");
      } else if (data.reason === "status-updated") {
        setNotice("Game status updated");
      } else if (data.reason === "home-away-updated") {
        setNotice("Home/away updated");
      } else if (data.reason === "roster-updated") {
        setNotice("Roster updated");
      }
    }

    socket.on("connect", () => {
      socket.emit("admin:game:join", gameId, (response) => {
        if (!response?.ok) {
          setError(response?.error || "Unable to join live game room");
        }
      });
    });

    socket.io.on("reconnect", () => {
      socket.emit("admin:game:join", gameId);
    });

    socket.on("connect_error", (err) => {
      if (err?.message === "Invalid or expired token") {
        handleAdminError(err);
      }
    });

    socket.on("admin:live-game:update", handleLiveGameUpdate);

    return () => {
      socket.off("admin:live-game:update", handleLiveGameUpdate);
      socket.disconnect();
    };
  }, [applyLiveGameState, gameId, handleAdminError, loadEvents, token]);

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  function findPlayer(playerId) {
    for (const roster of rosters) {
      const player = roster.players.find((item) => item.id === playerId);
      if (player) return player;
    }
    return null;
  }

  function findPlayerRoster(playerId) {
    return rosters.find((roster) =>
      roster.players.some((player) => player.id === playerId)
    );
  }

  function isTeamFinalized(teamId) {
    return rosters.some(
      (roster) => roster.team.id === teamId && roster.team.status === "finalized"
    );
  }

  function updatePlayerStat(playerId, field, value) {
    setRosters((currentRosters) =>
      currentRosters.map((roster) => ({
        ...roster,
        players: roster.players.map((player) => {
          if (player.id !== playerId) return player;

          const nextValue =
            field === "didPlay" ? value : Math.max(0, Number(value || 0));

          return {
            ...player,
            stats: {
              ...player.stats,
              [field]: nextValue,
            },
          };
        }),
      }))
    );
  }

  function replacePlayerStats(playerId, stats) {
    setRosters((currentRosters) =>
      currentRosters.map((roster) => ({
        ...roster,
        players: roster.players.map((player) =>
          player.id === playerId
            ? {
                ...player,
                stats: {
                  ...player.stats,
                  ...stats,
                },
              }
            : player
        ),
      }))
    );
  }

  function setPlayerMessage(playerId, type, message) {
    setPlayerFeedback((currentFeedback) => ({
      ...currentFeedback,
      [playerId]: { type, message },
    }));
  }

  async function savePlayer(playerId, statsOverride, options = {}) {
    const {
      globalNotice = true,
      feedbackMessage = "Saved",
      refreshEvents = true,
    } = options;

    const player = findPlayer(playerId);
    const roster = findPlayerRoster(playerId);
    if (!player || !roster || roster.team.status === "finalized") return null;

    const stats = statsOverride || player.stats;

    setSavingPlayerId(playerId);
    setError("");
    if (globalNotice) setNotice("");
    setPlayerMessage(playerId, "pending", "Saving...");

    try {
      const data = await updateAdminPlayerStats(gameId, playerId, stats, token);
      setGame(data.game);
      if (data.playerStats) replacePlayerStats(playerId, data.playerStats);
      if (refreshEvents) loadEvents();

      const message = `${feedbackMessage} ${player.name}`.trim();
      if (globalNotice) setNotice(message);
      setPlayerMessage(playerId, "success", message);
      return data;
    } catch (err) {
      if (handleAdminError(err)) return null;
      setError(err.message);
      setPlayerMessage(playerId, "error", err.message);
      return null;
    } finally {
      setSavingPlayerId("");
    }
  }

  async function applySimpleAction(playerId, actionKey, feedbackLabel) {
    const player = findPlayer(playerId);
    const roster = findPlayerRoster(playerId);
    if (!player || !roster || roster.team.status === "finalized") return;

    const nextStats = buildStatPatch(actionKey, player.stats);
    replacePlayerStats(playerId, nextStats);
    await savePlayer(playerId, nextStats, {
      globalNotice: false,
      feedbackMessage: feedbackLabel || "Saved",
    });
  }

  function closeShotFlowAfterFeedback() {
    window.setTimeout(() => {
      setShotFlow(null);
      setSheetSelectedPlayerId("");
    }, PLAYER_PICK_FEEDBACK_MS);
  }

  function openShotFlow(actionKey) {
    if (!selectedTeam || isTeamFinalized(selectedTeam.team.id)) return;
    setError("");
    setNotice("");
    setActiveTab("scoring");
    setShotFlow({
      actionKey,
      stage: "player",
      teamId: selectedTeam.team.id,
      scorerId: "",
      assistId: "",
      assignLater: false,
    });
  }

  function openSimpleActionFlow(actionKey) {
    if (!selectedTeam || isTeamFinalized(selectedTeam.team.id)) return;
    setError("");
    setNotice("");
    setActiveTab("scoring");
    setShotFlow({
      actionKey,
      stage: "simplePlayer",
      teamId: selectedTeam.team.id,
      scorerId: "",
      assistId: "",
      assignLater: false,
    });
  }

  function shotFlowLabel(actionKey) {
    if (actionKey === "made2") return "2-point FG made";
    if (actionKey === "made3") return "3-point FG made";
    return SIMPLE_ACTION_LABELS[actionKey] || "Stat";
  }

  function playerLastName(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    return parts[parts.length - 1] || "Player";
  }

  function playerFirstName(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    return parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
  }

  async function submitTeamToPublish(teamId) {
    setFinalizingTeamId(teamId);
    setError("");
    setNotice("");

    try {
      const data = await submitAdminTeamToPublish(gameId, teamId, token);
      applyLiveGameState(data);
      setNotice(
        data.published
          ? `Published Week ${data.published.weekNumber}, Game ${data.published.gameNumber}`
          : data.isGameFinal
            ? "Game finalized and published"
            : "Team finalized and published"
      );
    } catch (err) {
      if (handleAdminError(err)) return;
      setError(err.message);
    } finally {
      setFinalizingTeamId("");
    }
  }

  async function reopenTeam(teamId) {
    setReopeningTeamId(teamId);
    setError("");
    setNotice("");

    try {
      const data = await reopenAdminTeam(gameId, teamId, token);
      applyLiveGameState(data);
      setNotice("Team reopened");
    } catch (err) {
      if (handleAdminError(err)) return;
      setError(err.message);
    } finally {
      setReopeningTeamId("");
    }
  }

  function updateTempPlayerDraft(teamId, field, value) {
    setTempPlayerDrafts((currentDrafts) => ({
      ...currentDrafts,
      [teamId]: {
        name: "",
        number: "",
        ...(currentDrafts[teamId] || {}),
        [field]: value,
      },
    }));
  }

  async function addTempPlayer(teamId) {
    const draft = tempPlayerDrafts[teamId] || {};
    const name = String(draft.name || "").trim();
    const number = String(draft.number || "").trim();

    if (!name) {
      setError("Temporary player name is required");
      return;
    }

    setAddingTempPlayerTeamId(teamId);
    setError("");
    setNotice("");

    try {
      const data = await addAdminTempPlayer(gameId, teamId, { name, number }, token);
      applyLiveGameState(data);
      setTempPlayerDrafts((currentDrafts) => ({
        ...currentDrafts,
        [teamId]: { name: "", number: "" },
      }));
      setNotice(`Added temporary player ${name}`);
    } catch (err) {
      if (handleAdminError(err)) return;
      setError(err.message);
    } finally {
      setAddingTempPlayerTeamId("");
    }
  }

  async function removeRosterPlayer(roster, player) {
    if (!roster || !player || roster.team.status === "finalized") return;

    if (!player.isTemp) return;

    const confirmed = window.confirm(
      `Remove temporary player ${player.name} from ${roster.team.name}? This also removes their stats and play-by-play events for this game.`
    );

    if (!confirmed) return;

    setRemovingPlayerId(player.id);
    setError("");
    setNotice("");

    try {
      const data = await removeAdminRosterPlayer(
        gameId,
        roster.team.id,
        player.id,
        token
      );
      applyLiveGameState(data);
      await loadEvents();
      setNotice(`Removed ${player.name} from ${roster.team.name}`);
    } catch (err) {
      if (handleAdminError(err)) return;
      setError(err.message);
    } finally {
      setRemovingPlayerId("");
    }
  }

  function parseScoreValue(value) {
    if (value === "" || value === null || value === undefined) return 0;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  async function saveScore(nextScore) {
    setIsSavingScore(true);
    setError("");
    setNotice("");

    try {
      const data = await updateAdminGameScore(gameId, nextScore, token);
      applyLiveGameState(data);
      setScoreDraftDirty(false);
      setScoreDraft({
        away: String(data.game?.awayTeam?.score ?? nextScore.awayScore ?? 0),
        home: String(data.game?.homeTeam?.score ?? nextScore.homeScore ?? 0),
      });
      setNotice("Score updated");
    } catch (err) {
      if (handleAdminError(err)) return;
      setError(err.message);
    } finally {
      setIsSavingScore(false);
    }
  }

  async function saveGameStatus(nextStatus) {
    if (!nextStatus || nextStatus === game?.status) return;

    setIsSavingStatus(true);
    setError("");
    setNotice("");

    try {
      const data = await updateAdminGameStatus(gameId, nextStatus, token);
      setGame(data.game);
      setNotice(`Game marked ${gameStatusLabel(nextStatus)}`);
    } catch (err) {
      if (handleAdminError(err)) return;
      setError(err.message);
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function swapHomeAway() {
    setIsSwappingHomeAway(true);
    setError("");
    setNotice("");

    try {
      const data = await swapAdminGameHomeAway(gameId, token);
      applyLiveGameState(data);
      setScoreDraftDirty(false);
      setScoreDraft({
        away: String(data.game?.awayTeam?.score ?? 0),
        home: String(data.game?.homeTeam?.score ?? 0),
      });
      setNotice("Home/away updated");
    } catch (err) {
      if (handleAdminError(err)) return;
      setError(err.message);
    } finally {
      setIsSwappingHomeAway(false);
    }
  }

  async function resetScore() {
    const confirmed = window.confirm(
      "Reset the score, all player stats, and play-by-play events for this game?"
    );

    if (!confirmed) return;

    await saveScore({ awayScore: 0, homeScore: 0, resetPlayerStats: true });
    await loadEvents();
  }

  async function undoEvent(event) {
    setUndoingEventId(event.id);
    setError("");
    setNotice("");

    try {
      const data = await undoAdminGameEvent(gameId, event.id, token);
      applyLiveGameState(data);
      await loadEvents();
      setNotice(`Undid edit for ${event.player?.name || "player"}`);
    } catch (err) {
      if (handleAdminError(err)) return;
      setError(err.message);
    } finally {
      setUndoingEventId("");
    }
  }

  async function reassignEvent(event, newPlayerId) {
    const newPlayer = findPlayer(newPlayerId);
    if (!newPlayer) return;

    const newStats = { ...newPlayer.stats, didPlay: true };
    STAT_FIELDS.forEach(([field]) => {
      const delta = (event.afterStats?.[field] ?? 0) - (event.beforeStats?.[field] ?? 0);
      newStats[field] = Math.max(0, (newStats[field] ?? 0) + delta);
    });

    setReassigningEvent(null);
    setError("");
    setNotice("Reassigning...");

    try {
      await undoAdminGameEvent(gameId, event.id, token);
      await updateAdminPlayerStats(gameId, newPlayerId, newStats, token);
      const data = await getAdminLiveGame(gameId, token);
      applyLiveGameState(data);
      await loadEvents();
      setNotice(`Reassigned to ${newPlayer.name}`);
    } catch (err) {
      if (handleAdminError(err)) return;
      setError(err.message);
      setNotice("");
    }
  }

  async function resetEvents() {
    const confirmed = window.confirm(
      "Reset all play-by-play events for this game?"
    );

    if (!confirmed) return;

    setIsResettingEvents(true);
    setError("");
    setNotice("");

    try {
      const data = await resetAdminGameEvents(gameId, token);
      setEvents([]);
      setNotice(`Reset ${data.deletedCount || 0} play-by-play events`);
    } catch (err) {
      if (handleAdminError(err)) return;
      setError(err.message);
    } finally {
      setIsResettingEvents(false);
    }
  }

  async function commitMadeShot(flow, assistPlayerId) {
    const scorer = findPlayer(flow.scorerId);
    if (!scorer) return;

    const scorerPatch = buildStatPatch(flow.actionKey, scorer.stats);
    const scorerLabel = flow.actionKey === "made2" ? "Made 2 for" : "Made 3 for";

    setShotFlow(null);

    try {
      await savePlayer(flow.scorerId, scorerPatch, {
        globalNotice: false,
        feedbackMessage: scorerLabel,
      });

      if (assistPlayerId) {
        const assistPlayer = findPlayer(assistPlayerId);
        if (assistPlayer) {
          const assistPatch = {
            ...assistPlayer.stats,
            didPlay: true,
            assists: assistPlayer.stats.assists + 1,
          };
          await savePlayer(assistPlayerId, assistPatch, {
            globalNotice: false,
            feedbackMessage: "Assist for",
          });
        }
      }

      setNotice("");
    } catch (err) {
      if (handleAdminError(err)) return;
      setError(err.message);
    }
  }

  async function commitMadeShotScorerLater(flow) {
    if (!selectedTeam || !game) return;

    const points = flow.actionKey === "made2" ? 2 : 3;
    const isAwayTeam = selectedTeam.team.id === game.awayTeam?.id;

    setShotFlow(null);
    await saveScore({
      awayScore: (game.awayTeam?.score ?? 0) + (isAwayTeam ? points : 0),
      homeScore: (game.homeTeam?.score ?? 0) + (isAwayTeam ? 0 : points),
    });
    setNotice("");
  }

  function renderTeamBadge(roster, index) {
    const isSelected = selectedTeamId === roster.team.id;
    const isFinalized = roster.team.status === "finalized";

    return (
      <button
        key={roster.team.id}
        className={`admin-team-pill ${isSelected ? "admin-team-pill-active" : ""} ${
          isFinalized ? "admin-team-pill-finalized" : ""
        }`}
        onClick={() => setSelectedTeamId(roster.team.id)}
        type="button"
      >
        <span className={`admin-team-badge ${teamAccentClass(index)}`}>
          {teamInitials(roster.team.name)}
        </span>
        <span className="admin-team-pill-text">
          <strong>{roster.team.name}</strong>
          <em>{teamStatusLabel(roster.team.status)}</em>
        </span>
      </button>
    );
  }

  function renderRosterStatCard(player) {
    const firstName = playerFirstName(player.name);
    return (
      <button
        className={`admin-scoring-player-card ${
          selectedPlayerId === player.id ? "admin-scoring-player-card-active" : ""
        }`}
        key={player.id}
        onClick={() => setSelectedPlayerId(player.id)}
        type="button"
      >
        <div>
          <strong>#{player.number || "-"}</strong>
          <span className="admin-scoring-player-name">
            {firstName && <em>{firstName}</em>}
            <b>{playerLastName(player.name)}</b>
          </span>
        </div>
        <dl>
          <div>
            <dt>PF</dt>
            <dd>{player.stats.fouls || 0}</dd>
          </div>
          <div>
            <dt>PTS</dt>
            <dd>{player.stats.points || 0}</dd>
          </div>
          <div>
            <dt>REB</dt>
            <dd>{player.stats.rebounds || 0}</dd>
          </div>
          <div>
            <dt>AST</dt>
            <dd>{player.stats.assists || 0}</dd>
          </div>
        </dl>
      </button>
    );
  }

  function renderScoringTab() {
    const smallActions = [
      { key: "to", label: "TO", variant: "small" },
      { key: "stl", label: "STL", variant: "small" },
      { key: "blk", label: "BLK", variant: "small" },
      { key: "foul", label: "FOUL", variant: "small" },
    ];

    return (
      <div className="admin-tab-panel admin-scoring-tab-panel">
        <div className="admin-scoring-toolbar">
          <div className="admin-team-pills">
            {rosters.map((roster, index) => renderTeamBadge(roster, index))}
          </div>
        </div>

        <div className="admin-shot-layout">
          <button
            className="admin-shot-button admin-shot-button-made admin-shot-button-large admin-shot-layout-made2"
            disabled={isTeamFinalized(selectedTeam?.team.id)}
            onClick={() => openShotFlow("made2")}
            type="button"
          >
            <strong>+2</strong>
            <span>PT FG</span>
          </button>

          <div className="admin-shot-layout-free admin-free-throw-split">
            <button
              className="admin-shot-button admin-shot-button-free"
              disabled={isTeamFinalized(selectedTeam?.team.id)}
              onClick={() => openSimpleActionFlow("freeThrow")}
              type="button"
            >
              <strong>FT</strong>
              <span>Made</span>
            </button>

            <button
              className="admin-shot-button admin-shot-button-free-miss"
              disabled={isTeamFinalized(selectedTeam?.team.id)}
              onClick={() => openSimpleActionFlow("freeThrowMiss")}
              type="button"
            >
              <strong>FT</strong>
              <span>Miss</span>
            </button>
          </div>

          <button
            className="admin-shot-button admin-shot-button-made admin-shot-button-large admin-shot-layout-made3"
            disabled={isTeamFinalized(selectedTeam?.team.id)}
            onClick={() => openShotFlow("made3")}
            type="button"
          >
            <strong>+3</strong>
            <span>PT FG</span>
          </button>

          <button
            className="admin-shot-button admin-shot-button-miss admin-shot-button-large admin-shot-layout-miss2"
            disabled={isTeamFinalized(selectedTeam?.team.id)}
            onClick={() => openSimpleActionFlow("miss2")}
            type="button"
          >
            <strong>2PT</strong>
            <span>Miss</span>
          </button>

          <div className="admin-small-action-grid admin-shot-layout-actions">
            <button
              className="admin-small-action-button admin-small-action-button-rebound"
              disabled={isTeamFinalized(selectedTeam?.team.id)}
              onClick={() => openSimpleActionFlow("reb")}
              type="button"
            >
              Rebound
            </button>
            <div className="admin-small-action-grid-inner">
              {smallActions.map((action) => (
                <button
                  className="admin-small-action-button"
                  disabled={isTeamFinalized(selectedTeam?.team.id)}
                  key={action.key}
                  onClick={() => openSimpleActionFlow(action.key)}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <button
            className="admin-shot-button admin-shot-button-miss admin-shot-button-large admin-shot-layout-miss3"
            disabled={isTeamFinalized(selectedTeam?.team.id)}
            onClick={() => openSimpleActionFlow("miss3")}
            type="button"
          >
            <strong>3PT</strong>
            <span>Miss</span>
          </button>
        </div>

        <div className="admin-scoring-roster-section">
          <div className="admin-section-header">
            <div>
              <p className="admin-section-label">Roster</p>
              <h3>{selectedTeam?.team.name || "Team"}</h3>
            </div>
            <span className={`admin-team-status admin-team-status-${selectedTeam?.team.status || "draft"}`}>
              {teamStatusLabel(selectedTeam?.team.status)}
            </span>
          </div>
          <div className="admin-scoring-player-grid">
            {selectedTeam?.players.map(renderRosterStatCard)}
            {!selectedTeam?.players.length && (
              <div className="admin-muted-note">No players on this roster.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderStatsTab() {
    return (
      <div className="admin-tab-panel">
        <div className="admin-rosters">
          {rosters.map((roster) => (
            <div className="admin-roster-management" key={roster.team.id}>
              <div className="admin-roster-management-header">
                <div>
                  <p className="admin-section-label">Manual Stats</p>
                  <h3>{roster.team.name}</h3>
                </div>
                <span className={`admin-team-status admin-team-status-${roster.team.status}`}>
                  {teamStatusLabel(roster.team.status)}
                </span>
              </div>

              <div className="admin-player-list">
                {roster.players.map((player) => (
                  <div className="admin-player-card admin-player-card-light" key={player.id}>
                    <div className="admin-player-heading">
                      <div>
                        <strong>{player.name}</strong>
                        <span>#{player.number || "-"}</span>
                      </div>
                      <label className="admin-did-play">
                        <input
                          checked={player.stats.didPlay}
                          disabled={roster.team.status === "finalized"}
                          onChange={(event) =>
                            updatePlayerStat(player.id, "didPlay", event.target.checked)
                          }
                          type="checkbox"
                        />
                        Played
                      </label>
                    </div>

                    <div className="admin-stat-grid">
                      {STAT_FIELDS.map(([field, label]) => (
                        <label className="admin-stat-field" key={field}>
                          <span>{label}</span>
                          <input
                            disabled={roster.team.status === "finalized"}
                            inputMode="numeric"
                            min="0"
                            type="number"
                            value={player.stats[field]}
                            onChange={(event) =>
                              updatePlayerStat(player.id, field, event.target.value)
                            }
                          />
                        </label>
                      ))}
                    </div>

                    <button
                      className="admin-save-button"
                      disabled={roster.team.status === "finalized" || savingPlayerId === player.id}
                      onClick={() => savePlayer(player.id)}
                      type="button"
                    >
                      {savingPlayerId === player.id ? "Saving..." : "Save"}
                    </button>

                    {playerFeedback[player.id] && (
                      <div
                        className={`admin-player-feedback admin-player-feedback-${playerFeedback[player.id].type}`}
                      >
                        {playerFeedback[player.id].message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderRosterTab() {
    return (
      <div className="admin-tab-panel">
        <div className="admin-rosters">
          {rosters.map((roster) => {
            const isFinalized = roster.team.status === "finalized";
            const isBusy =
              finalizingTeamId === roster.team.id || reopeningTeamId === roster.team.id;

            return (
              <div className="admin-roster-management" key={roster.team.id}>
                <div className="admin-roster-management-header">
                  <div>
                    <p className="admin-section-label">Roster</p>
                    <h3>{roster.team.name}</h3>
                    <span className={`admin-team-status admin-team-status-${roster.team.status}`}>
                      {teamStatusLabel(roster.team.status)}
                    </span>
                  </div>
                  {isFinalized ? (
                    <button
                      className="admin-secondary-button"
                      disabled={isBusy}
                      onClick={() => reopenTeam(roster.team.id)}
                      type="button"
                    >
                      {reopeningTeamId === roster.team.id ? "Reopening..." : "Reopen Team"}
                    </button>
                  ) : (
                    <button
                      className="admin-primary-button"
                      disabled={isBusy}
                      onClick={() => submitTeamToPublish(roster.team.id)}
                      type="button"
                    >
                      {finalizingTeamId === roster.team.id
                        ? "Publishing..."
                        : "Submit to Publish"}
                    </button>
                  )}
                </div>

                <div className="admin-roster-player-list">
                  {roster.players.map((player) => (
                    <div className="admin-roster-player-row" key={player.id}>
                      <div>
                        <strong>
                          {player.name}
                          {player.isTemp ? " (Temp)" : ""}
                        </strong>
                        <span>#{player.number || "-"}</span>
                      </div>
                      <div className="admin-roster-player-meta">
                        <span>{player.stats.points} pts</span>
                        {player.isTemp && (
                          <button
                            className="admin-roster-remove-button"
                            disabled={isFinalized || removingPlayerId === player.id}
                            onClick={() => void removeRosterPlayer(roster, player)}
                            type="button"
                          >
                            {removingPlayerId === player.id ? "Removing..." : "Remove"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="admin-temp-player-form">
                  <label>
                    <span>Name</span>
                    <input
                      value={tempPlayerDrafts[roster.team.id]?.name || ""}
                      onChange={(event) =>
                        updateTempPlayerDraft(roster.team.id, "name", event.target.value)
                      }
                      placeholder="Temporary player"
                    />
                  </label>
                  <label>
                    <span>#</span>
                    <input
                      value={tempPlayerDrafts[roster.team.id]?.number || ""}
                      onChange={(event) =>
                        updateTempPlayerDraft(roster.team.id, "number", event.target.value)
                      }
                      placeholder="00"
                    />
                  </label>
                  <button
                    className="admin-secondary-button"
                    disabled={
                      addingTempPlayerTeamId === roster.team.id || roster.team.status === "finalized"
                    }
                    onClick={() => void addTempPlayer(roster.team.id)}
                    type="button"
                  >
                    {addingTempPlayerTeamId === roster.team.id
                      ? "Adding..."
                      : "Add Temp Player"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderEventHistory() {
    const visibleFeedEvents = combineFeedEvents(events.filter(isVisibleFeedEvent));

    return (
      <section className="admin-playbyplay-panel">
        <div className="admin-events-header">
          <div>
            <p className="admin-section-label">Play By Play</p>
            <h3>Event History</h3>
          </div>
          <button
            className="admin-secondary-button"
            disabled={isLoadingEvents}
            onClick={loadEvents}
            type="button"
          >
            {isLoadingEvents ? "Refreshing..." : "Refresh"}
          </button>
          <button
            className="admin-secondary-button admin-danger-button"
            disabled={isResettingEvents || !events.length}
            onClick={() => void resetEvents()}
            type="button"
          >
            {isResettingEvents ? "Resetting..." : "Reset Events"}
          </button>
        </div>

        <div className="admin-events-list">
          {visibleFeedEvents.map(({ event, assistEvent }) => {
            const details = feedEventDetails(event);
            const assistDetails = assistEvent ? feedEventDetails(assistEvent) : null;
            const finalized = isTeamFinalized(event.team?.id);
            const assistFinalized = assistEvent
              ? isTeamFinalized(assistEvent.team?.id)
              : false;

            return (
              <div
                className="admin-event-row admin-event-row-light admin-feed-event"
                key={assistEvent ? `${event.id}-${assistEvent.id}` : event.id}
              >
                <div className="admin-feed-avatar">
                  <FeedAvatar player={event.player} team={event.team} />
                </div>

                <div className="admin-feed-body">
                  <div className="admin-feed-topline">
                    <span>{game?.homeTeam?.score ?? 0}-{game?.awayTeam?.score ?? 0}</span>
                    <span>{event.team?.name || "Unknown team"}</span>
                    <span>{formatEventTime(event.createdAt)}</span>
                  </div>
                  <strong className="admin-feed-title">{details.title}</strong>
                  <div className="admin-feed-statline">{details.statLine}</div>
                  {assistDetails && (
                    <div className="admin-feed-assist">
                      {assistDetails.statLine}
                    </div>
                  )}
                  {details.notes.map((note) => (
                    <div className="admin-feed-note" key={note}>
                      {note}
                    </div>
                  ))}
                </div>

                <div className="admin-event-actions">
                  {event.eventType === "player_stats_updated" && (
                    <>
                      <button
                        className="admin-secondary-button"
                        disabled={undoingEventId === event.id || finalized}
                        onClick={() => undoEvent(event)}
                        type="button"
                      >
                        {undoingEventId === event.id ? "Undoing..." : "Undo"}
                      </button>
                      <button
                        className="admin-secondary-button"
                        disabled={finalized}
                        onClick={() => setReassigningEvent(event)}
                        type="button"
                      >
                        Edit
                      </button>
                    </>
                  )}
                  {assistEvent?.eventType === "player_stats_updated" && (
                    <button
                      className="admin-secondary-button"
                      disabled={undoingEventId === assistEvent.id || assistFinalized}
                      onClick={() => undoEvent(assistEvent)}
                      type="button"
                    >
                      {undoingEventId === assistEvent.id ? "Undoing..." : "Undo Ast"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {!visibleFeedEvents.length && (
            <div className="admin-muted-note">No stat edits yet.</div>
          )}
        </div>
      </section>
    );
  }

  function renderTopBar() {
    return (
      <div className="admin-live-topbar">
        <Link className="admin-topbar-link" to="/admin/games">
          Exit
        </Link>
      </div>
    );
  }

  function renderScoreHeader() {
    const homeTeam = game?.homeTeam;
    const awayTeam = game?.awayTeam;
    const scoreControls = (
      <div className="admin-score-center-actions">
        <label className="admin-game-status-select-wrap">
          <select
            className={`admin-game-status-select admin-status-${game?.status || "scheduled"}`}
            disabled={isSavingStatus}
            value={game?.status || "scheduled"}
            onChange={(event) => void saveGameStatus(event.target.value)}
          >
            <option value="scheduled">Scheduled</option>
            <option value="live">Live</option>
            <option value="final">Finished</option>
          </select>
        </label>
        <button
          className="admin-score-edit-toggle"
          onClick={() => setScoreEditorOpen((current) => !current)}
          type="button"
        >
          {scoreEditorOpen ? "Close" : "Edit score"}
        </button>
        <button
          className="admin-score-edit-toggle"
          disabled={isSwappingHomeAway}
          onClick={() => void swapHomeAway()}
          type="button"
        >
          {isSwappingHomeAway ? "Swapping..." : "Swap home/away"}
        </button>
      </div>
    );

    return (
      <div className="admin-scoreboard-shell">
        <div className="admin-scoreboard">
          <div className="admin-score-team">
            <div className="admin-score-team-heading">
              <div className="admin-team-badge admin-team-badge-home">
                {teamInitials(homeTeam?.name)}
              </div>
              <div className="admin-score-team-text">
                <span>Home</span>
                <strong>{homeTeam?.name || "Home"}</strong>
              </div>
            </div>
          </div>

          <div className="admin-score-center">
            <span className="admin-score-center-label">Game Score</span>
            <strong>{score}</strong>
            {scoreControls}
          </div>

          <div className="admin-score-team admin-score-team-right">
            <div className="admin-score-team-heading">
              <div className="admin-score-team-text">
                <span>Away</span>
                <strong>{awayTeam?.name || "Away"}</strong>
              </div>
              <div className="admin-team-badge admin-team-badge-away">
                {teamInitials(awayTeam?.name)}
              </div>
            </div>
          </div>
        </div>
        <div className="admin-score-mobile-controls">{scoreControls}</div>

        {scoreEditorOpen && (
          <div className="admin-score-edit-panel">
            <label className="admin-score-team-input">
              <span>{homeTeam?.name || "Home"}</span>
              <input
                inputMode="numeric"
                min="0"
                type="number"
                value={scoreDraft.home}
                onChange={(event) => {
                  setScoreDraftDirty(true);
                  setScoreDraft((current) => ({ ...current, home: event.target.value }));
                }}
              />
            </label>
            <label className="admin-score-team-input">
              <span>{awayTeam?.name || "Away"}</span>
              <input
                inputMode="numeric"
                min="0"
                type="number"
                value={scoreDraft.away}
                onChange={(event) => {
                  setScoreDraftDirty(true);
                  setScoreDraft((current) => ({ ...current, away: event.target.value }));
                }}
              />
            </label>
            <div className="admin-score-quick-actions">
              <button
                className="admin-secondary-button admin-reset-score-button"
                disabled={isSavingScore}
                onClick={() => void resetScore()}
                type="button"
              >
                Reset
              </button>
              <button
                className="admin-primary-button admin-score-save-button"
                disabled={isSavingScore || !scoreDraftDirty}
                onClick={() =>
                  void saveScore({
                    awayScore: parseScoreValue(scoreDraft.away),
                    homeScore: parseScoreValue(scoreDraft.home),
                  }).then(() => setScoreEditorOpen(false))
                }
                type="button"
              >
                {isSavingScore ? "Saving..." : "Save score"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderTabs() {
    return (
      <div className="admin-tab-bar" role="tablist" aria-label="Live scoring views">
        {[
          ["scoring", "Scoring"],
          ["stats", "Stats"],
          ["roster", "Roster"],
        ].map(([key, label]) => (
          <button
            className={`admin-tab-button ${activeTab === key ? "admin-tab-button-active" : ""}`}
            key={key}
            onClick={() => setActiveTab(key)}
            role="tab"
            aria-selected={activeTab === key}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  function renderShotSheet() {
    if (!shotFlow || !selectedTeam) return null;

    const teamPlayers = selectedTeam.players;
    const eligibleAssistPlayers = teamPlayers.filter(
      (player) => player.id !== shotFlow.scorerId
    );
    const isAssistStage = shotFlow.stage === "assist";
    const isSimplePlayerStage = shotFlow.stage === "simplePlayer";
    const scorer = findPlayer(shotFlow.scorerId);

    function renderSheetPlayer(player, onClick, metaLabel) {
      return (
        <button
          className={`admin-sheet-player-card ${
            player.stats.didPlay ? "admin-sheet-player-card-active" : ""
          } ${
            sheetSelectedPlayerId === player.id ? "admin-sheet-player-card-selected" : ""
          }`}
          key={player.id}
          onClick={onClick}
          type="button"
        >
          <SheetPlayerPhoto imgUrl={player.imgUrl} name={player.name} />
          <strong>{player.number || "-"}</strong>
          <span>{player.name}</span>
          {metaLabel && <em>{metaLabel}</em>}
        </button>
      );
    }

    return (
      <div className="admin-sheet-backdrop" onClick={() => setShotFlow(null)}>
        <div className="admin-sheet" onClick={(event) => event.stopPropagation()}>
          <div className="admin-sheet-handle" />
          {isSimplePlayerStage ? (
            <div className="admin-sheet-title">
              <span className="admin-sheet-title-icon" aria-hidden="true">STAT</span>
              <h3>{shotFlowLabel(shotFlow.actionKey)} by</h3>
              <p>{selectedTeam.team.name}</p>
            </div>
          ) : !isAssistStage ? (
            <div className="admin-sheet-title">
              <span className="admin-sheet-title-icon" aria-hidden="true">FG</span>
              <h3>{shotFlowLabel(shotFlow.actionKey)} by</h3>
              <p>{selectedTeam.team.name}</p>
            </div>
          ) : (
            <div className="admin-sheet-title admin-sheet-title-with-back">
              <button
                className="admin-sheet-back-button"
                onClick={() =>
                  setShotFlow((current) =>
                    current ? { ...current, stage: "player", assistId: "" } : current
                  )
                }
                type="button"
              >
                &lt;
              </button>
              <div>
                <h3>{scorer?.name || "Selected player"}, #{scorer?.number || "-"}</h3>
                <p>{shotFlowLabel(shotFlow.actionKey)}</p>
              </div>
            </div>
          )}

          {isSimplePlayerStage && (
            <div className="admin-sheet-player-grid">
              {teamPlayers.map((player) =>
                renderSheetPlayer(
                  player,
                  () => {
                    setSelectedPlayerId(player.id);
                    setSheetSelectedPlayerId(player.id);
                    closeShotFlowAfterFeedback();
                    void applySimpleAction(
                      player.id,
                      shotFlow.actionKey,
                      `${shotFlowLabel(shotFlow.actionKey)} for`
                    );
                  },
                  ""
                )
              )}
            </div>
          )}

          {!isAssistStage && !isSimplePlayerStage && (
            <>
              <button
                className="admin-sheet-assign-later-button"
                onClick={() => void commitMadeShotScorerLater(shotFlow)}
                type="button"
              >
                Assign Later
              </button>

              <div className="admin-sheet-player-grid">
                {teamPlayers.map((player) =>
                  renderSheetPlayer(
                    player,
                    () => {
                      setSelectedPlayerId(player.id);
                      setSheetSelectedPlayerId(player.id);
                      window.setTimeout(() => {
                        setSheetSelectedPlayerId("");
                        setShotFlow((current) =>
                          current
                            ? {
                                ...current,
                                scorerId: player.id,
                                stage: "assist",
                              }
                            : current
                        );
                      }, PLAYER_PICK_FEEDBACK_MS);
                    },
                    ""
                  )
                )}
              </div>
            </>
          )}

          {isAssistStage && (
            <>
              <div className="admin-assist-title">
                <span className="admin-sheet-title-icon" aria-hidden="true">AST</span>
                <div>
                  <h3>Assist by</h3>
                  <p>{selectedTeam.team.name}</p>
                </div>
              </div>

              <div className="admin-assist-actions">
                <button
                  className="admin-assist-action-button admin-assist-action-danger"
                  onClick={() => commitMadeShot(shotFlow, null)}
                  type="button"
                >
                  No Assist
                </button>

                <button
                  className="admin-assist-action-button"
                  onClick={() => commitMadeShot(shotFlow, null)}
                  type="button"
                >
                  Assign Later
                </button>
              </div>

              <div className="admin-sheet-player-grid">
                {eligibleAssistPlayers.map((player) =>
                  renderSheetPlayer(
                    player,
                    () => {
                      setSheetSelectedPlayerId(player.id);
                      window.setTimeout(() => {
                        setSheetSelectedPlayerId("");
                        commitMadeShot(shotFlow, player.id);
                      }, PLAYER_PICK_FEEDBACK_MS);
                    },
                    ""
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  function renderReassignSheet() {
    if (!reassigningEvent) return null;
    return (
      <div className="admin-sheet-backdrop" onClick={() => setReassigningEvent(null)}>
        <div className="admin-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="admin-sheet-handle" />
          <div className="admin-sheet-title">
            <span className="admin-sheet-title-icon" aria-hidden="true">EDT</span>
            <h3>Reassign to</h3>
            <p>Pick the correct player</p>
          </div>
          <div className="admin-sheet-player-grid">
            {rosters.flatMap((roster) =>
              roster.players.map((player) => (
                <button
                  key={player.id}
                  className={`admin-sheet-player-card ${player.stats.didPlay ? "admin-sheet-player-card-active" : ""} ${player.id === reassigningEvent.player?.id ? "admin-sheet-player-card-selected" : ""}`}
                  disabled={player.id === reassigningEvent.player?.id}
                  onClick={() => void reassignEvent(reassigningEvent, player.id)}
                  type="button"
                >
                  <SheetPlayerPhoto imgUrl={player.imgUrl} name={player.name} />
                  <strong>{player.number || "-"}</strong>
                  <span>{player.name}</span>
                  <em>{roster.team.name}</em>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="admin-page admin-live-page">
      <div className="admin-live-shell">
        {renderTopBar()}

        <div className="admin-live-hero">
          {renderScoreHeader()}
        </div>

        {error && <div className="admin-alert admin-alert-light">{error}</div>}
        {notice && <div className="admin-success admin-success-light">{notice}</div>}
        {isLoading && <div className="admin-muted-panel admin-muted-panel-light">Loading game...</div>}

        {!isLoading && game && (
          <>
            {renderTabs()}
            {activeTab === "scoring" && renderScoringTab()}
            {activeTab === "stats" && renderStatsTab()}
            {activeTab === "roster" && renderRosterTab()}
            {renderEventHistory()}
          </>
        )}
      </div>

      {renderShotSheet()}
      {renderReassignSheet()}
    </section>
  );
}

export default AdminLiveGame;
