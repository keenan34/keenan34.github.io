const fs = require("fs/promises");
const path = require("path");
const { pool } = require("../../pool");

const PROJECT_ROOT = path.resolve(__dirname, "../../../../..");
const SEASONS_ROOT = path.join(PROJECT_ROOT, "frontend", "public", "seasons");
const SEASON_SLUGS = ["szn3", "szn4", "szn5"];
const CURRENT_SEASON_SLUG = "szn5";

const STAT_MAP = {
  points: ["Points"],
  fgm: ["FGM"],
  fga: ["FGA"],
  two_pm: ["2 PTM"],
  two_pa: ["2 PTA"],
  three_pm: ["3 PTM"],
  three_pa: ["3 PTA"],
  ftm: ["FTM"],
  fta: ["FTA"],
  rebounds: ["REB"],
  assists: ["AST", "Assists", "assists"],
  turnovers: ["TOs", "Turnovers", "turnovers"],
  fouls: ["Fouls"],
  steals_blocks: ["STLS/BLKS", "STL/BLK", "stocks"],
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^the\s+/, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function seasonName(slug) {
  const number = slug.replace(/^szn/i, "");
  return `Season ${number}`;
}

async function readJson(filePath, fallback = null) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

function getStat(row, keys) {
  for (const key of keys) {
    if (row && row[key] != null) return row[key];
  }
  return null;
}

function toNonNegativeInt(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
}

function isDidPlay(row) {
  return getStat(row, STAT_MAP.points) != null;
}

function extractStats(row) {
  const stats = {};
  for (const [column, keys] of Object.entries(STAT_MAP)) {
    stats[column] = toNonNegativeInt(getStat(row, keys));
  }
  return stats;
}

function statsSnapshot(stats) {
  return {
    points: stats.points,
    fgm: stats.fgm,
    fga: stats.fga,
    two_pm: stats.two_pm,
    two_pa: stats.two_pa,
    three_pm: stats.three_pm,
    three_pa: stats.three_pa,
    ftm: stats.ftm,
    fta: stats.fta,
    rebounds: stats.rebounds,
    assists: stats.assists,
    turnovers: stats.turnovers,
    fouls: stats.fouls,
    steals_blocks: stats.steals_blocks,
  };
}

function hasAnyStat(row, keys) {
  return keys.some((key) => row && row[key] != null);
}

function normalizeStats(row, context) {
  const stats = extractStats(row);
  const before = statsSnapshot(stats);
  const hasShotBreakdown =
    hasAnyStat(row, STAT_MAP.two_pm) ||
    hasAnyStat(row, STAT_MAP.two_pa) ||
    hasAnyStat(row, STAT_MAP.three_pm) ||
    hasAnyStat(row, STAT_MAP.three_pa);

  if (hasShotBreakdown && stats.fgm !== stats.two_pm + stats.three_pm) {
    stats.fgm = stats.two_pm + stats.three_pm;
  }

  if (hasShotBreakdown && stats.fga < stats.two_pa + stats.three_pa) {
    stats.fga = stats.two_pa + stats.three_pa;
  }

  if (stats.two_pm > stats.two_pa) {
    stats.two_pa = stats.two_pm;
  }

  if (stats.three_pm > stats.three_pa) {
    stats.three_pa = stats.three_pm;
  }

  if (stats.ftm > stats.fta) {
    stats.fta = stats.ftm;
  }

  if (stats.fgm > stats.fga) {
    stats.fga = stats.fgm;
  }

  const after = statsSnapshot(stats);
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    console.warn(
      [
        "Corrected stat row",
        `season=${context.season}`,
        `week=${context.week}`,
        `game=${context.game}`,
        `team=${context.team}`,
        `player=${context.player}`,
        `before=${JSON.stringify(before)}`,
        `after=${JSON.stringify(after)}`,
      ].join(" | ")
    );
  }

  return stats;
}

function parseGameId(publicGameId) {
  const match = String(publicGameId || "").match(/^week(\d+)-game(\d+)$/i);
  if (!match) return { weekNumber: null, gameNumber: null };
  return {
    weekNumber: Number(match[1]),
    gameNumber: Number(match[2]),
  };
}

function parseScheduledAt(dateValue, timeValue) {
  if (!dateValue) return null;

  const [month, day, year] = String(dateValue).split("/").map(Number);
  if (!month || !day || !year) return null;

  let hour = 0;
  let minute = 0;

  if (timeValue) {
    const match = String(timeValue)
      .trim()
      .match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);

    if (match) {
      hour = Number(match[1]);
      minute = Number(match[2] || 0);
      const meridiem = match[3].toUpperCase();
      if (meridiem === "PM" && hour !== 12) hour += 12;
      if (meridiem === "AM" && hour === 12) hour = 0;
    }
  }

  return new Date(year, month - 1, day, hour, minute);
}

async function listWeekFiles(seasonPath) {
  const entries = await fs.readdir(seasonPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^week\d+\.json$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => {
      const aNum = Number(a.match(/\d+/)[0]);
      const bNum = Number(b.match(/\d+/)[0]);
      return aNum - bNum;
    });
}

async function upsertSeason(client, slug) {
  const result = await client.query(
    `
      INSERT INTO seasons (slug, name, status, is_current)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (slug)
      DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        updated_at = now()
      RETURNING id
    `,
    [slug, seasonName(slug), slug === CURRENT_SEASON_SLUG ? "active" : "completed", slug === CURRENT_SEASON_SLUG]
  );

  return result.rows[0].id;
}

async function upsertTeam(client, seasonId, teamName, isPlaceholder = false) {
  const slug = slugify(teamName);
  const result = await client.query(
    `
      INSERT INTO teams (season_id, name, slug, is_placeholder)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (season_id, slug)
      DO UPDATE SET
        name = EXCLUDED.name,
        is_placeholder = EXCLUDED.is_placeholder,
        updated_at = now()
      RETURNING id
    `,
    [seasonId, teamName, slug, isPlaceholder]
  );

  return result.rows[0].id;
}

async function upsertPlayer(client, playerName, imageUrl = null) {
  const slug = slugify(playerName);
  const result = await client.query(
    `
      INSERT INTO players (name, slug, image_url)
      VALUES ($1, $2, $3)
      ON CONFLICT (slug)
      DO UPDATE SET
        name = EXCLUDED.name,
        image_url = COALESCE(EXCLUDED.image_url, players.image_url),
        updated_at = now()
      RETURNING id
    `,
    [playerName, slug, imageUrl]
  );

  return result.rows[0].id;
}

async function upsertTeamPlayer(client, seasonId, teamId, playerId, jerseyNumber) {
  await client.query(
    `
      INSERT INTO team_players (season_id, team_id, player_id, jersey_number, roster_status)
      VALUES ($1, $2, $3, $4, 'active')
      ON CONFLICT (season_id, team_id, player_id)
      DO UPDATE SET
        jersey_number = EXCLUDED.jersey_number,
        roster_status = 'active',
        updated_at = now()
    `,
    [seasonId, teamId, playerId, jerseyNumber == null ? null : String(jerseyNumber)]
  );
}

async function upsertGame(client, seasonId, teamIdsByName, scheduleGame, fallback = {}) {
  const publicGameId = scheduleGame?.gameId || fallback.publicGameId;
  const parsed = parseGameId(publicGameId);
  const weekNumber = parsed.weekNumber || fallback.weekNumber;
  const gameNumber = parsed.gameNumber || fallback.gameNumber;

  const homeTeamName = scheduleGame?.teamA || fallback.teamA;
  const awayTeamName = scheduleGame?.teamB || fallback.teamB;
  const homeTeamId = teamIdsByName.get(homeTeamName);
  const awayTeamId = teamIdsByName.get(awayTeamName);

  if (!weekNumber || !gameNumber || !homeTeamId || !awayTeamId) {
    throw new Error(`Cannot import game ${publicGameId || JSON.stringify(fallback)}`);
  }

  const isPlayoff = Boolean(scheduleGame?.playoff ?? fallback.isPlayoff ?? false);

  const result = await client.query(
    `
      INSERT INTO games (
        season_id,
        week_number,
        game_number,
        public_game_id,
        scheduled_at,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        status,
        is_playoff,
        youtube_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (season_id, week_number, game_number)
      DO UPDATE SET
        public_game_id = EXCLUDED.public_game_id,
        scheduled_at = EXCLUDED.scheduled_at,
        home_team_id = EXCLUDED.home_team_id,
        away_team_id = EXCLUDED.away_team_id,
        home_score = EXCLUDED.home_score,
        away_score = EXCLUDED.away_score,
        status = EXCLUDED.status,
        is_playoff = EXCLUDED.is_playoff,
        youtube_url = COALESCE(EXCLUDED.youtube_url, games.youtube_url),
        updated_at = now()
      RETURNING id
    `,
    [
      seasonId,
      weekNumber,
      gameNumber,
      publicGameId,
      parseScheduledAt(scheduleGame?.date, scheduleGame?.time),
      homeTeamId,
      awayTeamId,
      scheduleGame?.scoreA != null && Number.isFinite(Number(scheduleGame.scoreA))
        ? Number(scheduleGame.scoreA)
        : null,
      scheduleGame?.scoreB != null && Number.isFinite(Number(scheduleGame.scoreB))
        ? Number(scheduleGame.scoreB)
        : null,
      scheduleGame?.scoreA != null && scheduleGame?.scoreB != null &&
      Number.isFinite(Number(scheduleGame.scoreA)) &&
      Number.isFinite(Number(scheduleGame.scoreB))
        ? "final"
        : "scheduled",
      isPlayoff,
      fallback.youtubeUrl || null,
    ]
  );

  return result.rows[0].id;
}

async function upsertGamePlayerStats(client, gameId, teamId, playerId, row, context) {
  const stats = normalizeStats(row, context);

  await client.query(
    `
      INSERT INTO game_player_stats (
        game_id,
        team_id,
        player_id,
        did_play,
        points,
        fgm,
        fga,
        two_pm,
        two_pa,
        three_pm,
        three_pa,
        ftm,
        fta,
        rebounds,
        assists,
        turnovers,
        fouls,
        steals_blocks
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18
      )
      ON CONFLICT (game_id, player_id)
      DO UPDATE SET
        team_id = EXCLUDED.team_id,
        did_play = EXCLUDED.did_play,
        points = EXCLUDED.points,
        fgm = EXCLUDED.fgm,
        fga = EXCLUDED.fga,
        two_pm = EXCLUDED.two_pm,
        two_pa = EXCLUDED.two_pa,
        three_pm = EXCLUDED.three_pm,
        three_pa = EXCLUDED.three_pa,
        ftm = EXCLUDED.ftm,
        fta = EXCLUDED.fta,
        rebounds = EXCLUDED.rebounds,
        assists = EXCLUDED.assists,
        turnovers = EXCLUDED.turnovers,
        fouls = EXCLUDED.fouls,
        steals_blocks = EXCLUDED.steals_blocks,
        updated_at = now()
    `,
    [
      gameId,
      teamId,
      playerId,
      isDidPlay(row),
      stats.points,
      stats.fgm,
      stats.fga,
      stats.two_pm,
      stats.two_pa,
      stats.three_pm,
      stats.three_pa,
      stats.ftm,
      stats.fta,
      stats.rebounds,
      stats.assists,
      stats.turnovers,
      stats.fouls,
      stats.steals_blocks,
    ]
  );
}

function isPlaceholderTeam(name) {
  return /^Seed\s+\d+/i.test(name) || /\bWinner\b/i.test(name);
}

function collectPlaceholderTeamNames(schedule) {
  const names = new Set();

  (schedule || []).forEach((game) => {
    if (game.teamA && isPlaceholderTeam(game.teamA)) names.add(game.teamA);
    if (game.teamB && isPlaceholderTeam(game.teamB)) names.add(game.teamB);
  });

  return [...names];
}

function collectTeamNames(rosters, playersWithImages, schedule, weekDataByFile) {
  const names = new Set();

  Object.keys(rosters || {}).forEach((name) => names.add(name));
  Object.keys(playersWithImages || {}).forEach((name) => names.add(name));
  (schedule || []).forEach((game) => {
    if (game.teamA && !isPlaceholderTeam(game.teamA)) names.add(game.teamA);
    if (game.teamB && !isPlaceholderTeam(game.teamB)) names.add(game.teamB);
  });

  for (const weekData of Object.values(weekDataByFile)) {
    Object.values(weekData || {}).forEach((game) => {
      if (game?.teamA?.name) names.add(game.teamA.name);
      if (game?.teamB?.name) names.add(game.teamB.name);
    });
  }

  return [...names].filter(Boolean);
}

function buildImageInfo(playersWithImages) {
  const info = new Map();

  Object.entries(playersWithImages || {}).forEach(([teamName, players]) => {
    (players || []).forEach((player) => {
      if (!player?.name) return;
      info.set(`${teamName}|${player.name}`, player);
      if (!info.has(player.name)) info.set(player.name, player);
    });
  });

  return info;
}

async function resetSeasonData(client, seasonId) {
  await client.query(`DELETE FROM games WHERE season_id = $1`, [seasonId]);
  await client.query(`DELETE FROM teams WHERE season_id = $1`, [seasonId]);
}

async function importSeason(client, seasonSlug) {
  const seasonPath = path.join(SEASONS_ROOT, seasonSlug);
  const rosters = await readJson(path.join(seasonPath, "team_rosters.json"), {});
  const playersWithImages = await readJson(
    path.join(seasonPath, "players_with_images.json"),
    {}
  );
  const schedule = await readJson(path.join(seasonPath, "full_schedule.json"), []);
  const weekFiles = await listWeekFiles(seasonPath);
  const weekDataByFile = {};

  for (const weekFile of weekFiles) {
    weekDataByFile[weekFile] = await readJson(path.join(seasonPath, weekFile), {});
  }

  const seasonId = await upsertSeason(client, seasonSlug);
  await resetSeasonData(client, seasonId);
  const teamIdsByName = new Map();
  const playerIdsByName = new Map();
  const imageInfo = buildImageInfo(playersWithImages);

  for (const teamName of collectTeamNames(rosters, playersWithImages, schedule, weekDataByFile)) {
    teamIdsByName.set(teamName, await upsertTeam(client, seasonId, teamName));
  }

  // Placeholder teams (e.g. "5 PM Winner") fill undetermined playoff slots.
  // They are flagged so standings, rosters, and team listings ignore them.
  for (const teamName of collectPlaceholderTeamNames(schedule)) {
    if (teamIdsByName.has(teamName)) continue;
    teamIdsByName.set(teamName, await upsertTeam(client, seasonId, teamName, true));
  }

  for (const [teamName, teamPlayers] of Object.entries(rosters || {})) {
    const teamId = teamIdsByName.get(teamName);
    if (!teamId) continue;

    for (const rosterPlayer of teamPlayers || []) {
      if (!rosterPlayer?.name) continue;

      const imagePlayer =
        imageInfo.get(`${teamName}|${rosterPlayer.name}`) || imageInfo.get(rosterPlayer.name);
      const imageUrl = imagePlayer?.imgUrl || null;
      const jerseyNumber = imagePlayer?.number ?? rosterPlayer.number ?? null;
      const playerId = await upsertPlayer(client, rosterPlayer.name, imageUrl);

      playerIdsByName.set(rosterPlayer.name, playerId);
      await upsertTeamPlayer(client, seasonId, teamId, playerId, jerseyNumber);
    }
  }

  for (const [teamName, imagePlayers] of Object.entries(playersWithImages || {})) {
    const teamId = teamIdsByName.get(teamName);
    if (!teamId) continue;

    for (const imagePlayer of imagePlayers || []) {
      if (!imagePlayer?.name) continue;

      const playerId = await upsertPlayer(client, imagePlayer.name, imagePlayer.imgUrl || null);
      playerIdsByName.set(imagePlayer.name, playerId);
      await upsertTeamPlayer(client, seasonId, teamId, playerId, imagePlayer.number ?? null);
    }
  }

  const scheduleByPublicGameId = new Map(
    (schedule || []).filter((game) => game.gameId).map((game) => [game.gameId, game])
  );

  for (const scheduleGame of schedule || []) {
    if (!scheduleGame?.gameId) continue;
    // Import any game whose teams both resolve to a team id, including playoff
    // games that reference placeholder ("Winner") teams.
    if (
      !teamIdsByName.has(scheduleGame.teamA) ||
      !teamIdsByName.has(scheduleGame.teamB)
    ) {
      continue;
    }
    await upsertGame(client, seasonId, teamIdsByName, scheduleGame);
  }

  for (const [weekFile, weekData] of Object.entries(weekDataByFile)) {
    const weekNumber = Number(weekFile.match(/\d+/)[0]);

    for (const [gameKey, gameData] of Object.entries(weekData || {})) {
      const gameNumber = Number(String(gameKey).match(/\d+/)?.[0]);
      const publicGameId = `week${weekNumber}-game${gameNumber}`;
      const scheduleGame = scheduleByPublicGameId.get(publicGameId);
      const gameId = await upsertGame(client, seasonId, teamIdsByName, scheduleGame, {
        publicGameId,
        weekNumber,
        gameNumber,
        teamA: gameData?.teamA?.name,
        teamB: gameData?.teamB?.name,
        youtubeUrl: gameData?.youtubeUrl,
      });

      for (const side of ["teamA", "teamB"]) {
        const teamName = gameData?.[side]?.name;
        const teamId = teamIdsByName.get(teamName);
        if (!teamId) continue;

        for (const statRow of gameData?.[side]?.players || []) {
          const playerName = statRow?.Player;
          if (!playerName) continue;

          let playerId = playerIdsByName.get(playerName);
          if (!playerId) {
            const imagePlayer =
              imageInfo.get(`${teamName}|${playerName}`) || imageInfo.get(playerName);
            playerId = await upsertPlayer(client, playerName, imagePlayer?.imgUrl || null);
            playerIdsByName.set(playerName, playerId);
            await upsertTeamPlayer(
              client,
              seasonId,
              teamId,
              playerId,
              imagePlayer?.number ?? null
            );
          }

          await upsertGamePlayerStats(client, gameId, teamId, playerId, statRow, {
            season: seasonSlug,
            week: weekNumber,
            game: publicGameId,
            team: teamName,
            player: playerName,
          });
        }
      }
    }
  }

  console.log(
    `Imported ${seasonSlug}: ${teamIdsByName.size} teams, ${playerIdsByName.size} players, ${schedule.length} scheduled games, ${weekFiles.length} week files`
  );
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const seasonSlug of SEASON_SLUGS) {
      await importSeason(client, seasonSlug);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("JSON import failed:");
  console.error(err);
  process.exit(1);
});
