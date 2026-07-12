import { resolveApiBaseUrl } from "./baseUrl";

const API_BASE_URL = resolveApiBaseUrl();

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      data?.error || `API request failed with ${response.status}`
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

async function apiGet(path, options = {}) {
  return apiRequest(path, options);
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function getSeasonGames(seasonSlug, options) {
  return apiGet(
    `/api/seasons/${encodeURIComponent(seasonSlug)}/games`,
    options
  );
}

export function getSeasonTeams(seasonSlug, options) {
  return apiGet(
    `/api/seasons/${encodeURIComponent(seasonSlug)}/teams`,
    options
  );
}

export function getSeasonStandings(seasonSlug, options) {
  return apiGet(`/api/standings/${encodeURIComponent(seasonSlug)}`, options);
}

export function getWeekPlayerStats(seasonSlug, weekNumber, options) {
  return apiGet(
    `/api/seasons/${encodeURIComponent(seasonSlug)}/weeks/${weekNumber}/player-stats`,
    options
  );
}

export function adminLogin(username, password) {
  return apiRequest("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
}

export function refreshAdminToken(token) {
  return apiRequest("/api/admin/refresh", {
    method: "POST",
    headers: authHeaders(token),
  });
}

export function getAdminGames(token) {
  return apiGet("/api/admin/games", {
    headers: authHeaders(token),
  });
}

export function getAdminLiveGame(gameId, token) {
  return apiGet(`/api/admin/games/${encodeURIComponent(gameId)}/live`, {
    headers: authHeaders(token),
  });
}

export function startAdminGame(gameId, token) {
  return apiRequest(`/api/admin/games/${encodeURIComponent(gameId)}/start`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export function updateAdminGameStatus(gameId, status, token) {
  return apiRequest(`/api/admin/games/${encodeURIComponent(gameId)}/status`, {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
}

export function swapAdminGameHomeAway(gameId, token) {
  return apiRequest(
    `/api/admin/games/${encodeURIComponent(gameId)}/swap-home-away`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
}

export function getAdminGameEvents(gameId, token) {
  return apiGet(`/api/admin/games/${encodeURIComponent(gameId)}/events`, {
    headers: authHeaders(token),
  });
}

export function resetAdminGameEvents(gameId, token) {
  return apiRequest(`/api/admin/games/${encodeURIComponent(gameId)}/events`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function undoAdminGameEvent(gameId, eventId, token) {
  return apiRequest(
    `/api/admin/games/${encodeURIComponent(
      gameId
    )}/events/${encodeURIComponent(eventId)}/undo`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
}

export function updateAdminPlayerStats(gameId, playerId, stats, token) {
  return apiRequest(
    `/api/admin/games/${encodeURIComponent(
      gameId
    )}/player-stats/${encodeURIComponent(playerId)}`,
    {
      method: "PATCH",
      headers: {
        ...authHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stats),
    }
  );
}

export function updateAdminGameClock(gameId, clock, token) {
  return apiRequest(`/api/admin/games/${encodeURIComponent(gameId)}/clock`, {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(clock),
  });
}

export function updateAdminGameScore(gameId, score, token) {
  return apiRequest(`/api/admin/games/${encodeURIComponent(gameId)}/score`, {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(score),
  });
}

export function updateAdminGameTimeouts(gameId, timeouts, token) {
  return apiRequest(`/api/admin/games/${encodeURIComponent(gameId)}/timeouts`, {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(timeouts),
  });
}

export function finalizeAdminGame(gameId, token) {
  return apiRequest(`/api/admin/games/${encodeURIComponent(gameId)}/finalize`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export function finalizeAdminTeam(gameId, teamId, token) {
  return apiRequest(
    `/api/admin/games/${encodeURIComponent(
      gameId
    )}/teams/${encodeURIComponent(teamId)}/finalize`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
}

export function submitAdminTeamToPublish(gameId, teamId, token) {
  return apiRequest(
    `/api/admin/games/${encodeURIComponent(
      gameId
    )}/teams/${encodeURIComponent(teamId)}/submit-to-publish`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
}

export function reopenAdminTeam(gameId, teamId, token) {
  return apiRequest(
    `/api/admin/games/${encodeURIComponent(
      gameId
    )}/teams/${encodeURIComponent(teamId)}/reopen`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
}

export function addAdminTempPlayer(gameId, teamId, player, token) {
  return apiRequest(
    `/api/admin/games/${encodeURIComponent(
      gameId
    )}/teams/${encodeURIComponent(teamId)}/temp-players`,
    {
      method: "POST",
      headers: {
        ...authHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(player),
    }
  );
}

export function getAdminRoster(seasonSlug, token) {
  return apiGet(`/api/admin/roster/${encodeURIComponent(seasonSlug)}`, {
    headers: authHeaders(token),
  });
}

export function addAdminRosterPlayer(seasonSlug, teamId, player, token) {
  return apiRequest(`/api/admin/roster/${encodeURIComponent(seasonSlug)}/teams/${encodeURIComponent(teamId)}/players`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(player),
  });
}

export function updateAdminRosterPlayerNumber(seasonSlug, teamId, playerId, number, token) {
  return apiRequest(`/api/admin/roster/${encodeURIComponent(seasonSlug)}/teams/${encodeURIComponent(teamId)}/players/${encodeURIComponent(playerId)}`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ number }),
  });
}

export function deleteAdminRosterPlayer(seasonSlug, teamId, playerId, token) {
  return apiRequest(`/api/admin/roster/${encodeURIComponent(seasonSlug)}/teams/${encodeURIComponent(teamId)}/players/${encodeURIComponent(playerId)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function updateAdminGameYoutubeUrl(gameId, youtubeUrl, token) {
  return apiRequest(`/api/admin/games/${encodeURIComponent(gameId)}/youtube-url`, {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ youtubeUrl }),
  });
}

export function removeAdminRosterPlayer(gameId, teamId, playerId, token) {
  return apiRequest(
    `/api/admin/games/${encodeURIComponent(
      gameId
    )}/teams/${encodeURIComponent(teamId)}/players/${encodeURIComponent(playerId)}`,
    {
      method: "DELETE",
      headers: authHeaders(token),
    }
  );
}
