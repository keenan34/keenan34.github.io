/**
 * Idempotent, non-destructive seed for the Season 5 playoff bracket.
 *
 * Unlike `import:json`, this script never deletes existing rows. It:
 *   1. Ensures the playoff columns exist (safe if the migration already ran).
 *   2. Ensures the placeholder "Winner" teams exist for the undetermined slots.
 *   3. Upserts the five playoff games. On re-run it refreshes the schedule/flags
 *      but PRESERVES any matchup an admin has already assigned and any score,
 *      so picking winners in the admin UI is never clobbered.
 *
 * Run with: node src/db/seeds/playoffs/seedSzn5Playoffs.js
 */
const { pool } = require("../../pool");
const { resolvePlayoffBracket } = require("../../../routes/admin/games.routes");

const SEASON_SLUG = "szn5";
const WEEK_NUMBER = 7;
const GAME_DATE = "2026-07-19";
const GAME_TZ = "America/Chicago";

const PLACEHOLDER_TEAMS = [
  "5 PM Winner",
  "6 PM Winner",
  "7 PM Winner",
  "8 PM Winner",
];

// home/away, tip-off time (24h), and the public bracket order.
const PLAYOFF_GAMES = [
  { gameNumber: 1, time: "17:00:00", home: "Real Ikhwan", away: "Brick Squad" },
  { gameNumber: 2, time: "18:00:00", home: "UMMA", away: "AVO" },
  { gameNumber: 3, time: "19:00:00", home: "The Northmen", away: "5 PM Winner" },
  { gameNumber: 4, time: "20:00:00", home: "5 Pillars", away: "6 PM Winner" },
  { gameNumber: 5, time: "21:00:00", home: "7 PM Winner", away: "8 PM Winner" },
];

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^the\s+/, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function ensureColumns(client) {
  await client.query(
    `ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_placeholder boolean NOT NULL DEFAULT false`
  );
  await client.query(
    `ALTER TABLE games ADD COLUMN IF NOT EXISTS is_playoff boolean NOT NULL DEFAULT false`
  );
  await client.query(
    `ALTER TABLE games ADD COLUMN IF NOT EXISTS home_source_team_id uuid REFERENCES teams(id) ON DELETE SET NULL`
  );
  await client.query(
    `ALTER TABLE games ADD COLUMN IF NOT EXISTS away_source_team_id uuid REFERENCES teams(id) ON DELETE SET NULL`
  );
}

function isPlaceholderName(name) {
  return PLACEHOLDER_TEAMS.includes(name);
}

async function getSeasonId(client) {
  const { rows } = await client.query(
    `SELECT id FROM seasons WHERE slug = $1 LIMIT 1`,
    [SEASON_SLUG]
  );
  if (!rows.length) throw new Error(`Season ${SEASON_SLUG} not found`);
  return rows[0].id;
}

async function upsertTeam(client, seasonId, name, isPlaceholder) {
  const { rows } = await client.query(
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
    [seasonId, name, slugify(name), isPlaceholder]
  );
  return rows[0].id;
}

async function resolveTeamId(client, seasonId, name) {
  const { rows } = await client.query(
    `SELECT id FROM teams WHERE season_id = $1 AND slug = $2 LIMIT 1`,
    [seasonId, slugify(name)]
  );
  if (!rows.length) throw new Error(`Team "${name}" not found in ${SEASON_SLUG}`);
  return rows[0].id;
}

async function upsertGame(client, seasonId, game, homeTeamId, awayTeamId) {
  const publicGameId = `week${WEEK_NUMBER}-game${game.gameNumber}`;
  const scheduledAt = `${GAME_DATE} ${game.time} ${GAME_TZ}`;
  // Record which slots are seeded by a placeholder so the bracket can resolve
  // (and un-resolve) automatically from game results.
  const homeSourceId = isPlaceholderName(game.home) ? homeTeamId : null;
  const awaySourceId = isPlaceholderName(game.away) ? awayTeamId : null;

  // On conflict we intentionally do NOT touch home_team_id / away_team_id /
  // scores / status — those are owned by live scoring and the auto-resolver.
  // The source columns and scheduling metadata are structural, so we refresh
  // them.
  await client.query(
    `
      INSERT INTO games (
        season_id, week_number, game_number, public_game_id,
        scheduled_at, home_team_id, away_team_id, status, is_playoff,
        home_source_team_id, away_source_team_id
      )
      VALUES ($1, $2, $3, $4, $5::timestamptz, $6, $7, 'scheduled', true, $8, $9)
      ON CONFLICT (season_id, week_number, game_number)
      DO UPDATE SET
        public_game_id = EXCLUDED.public_game_id,
        scheduled_at = EXCLUDED.scheduled_at,
        is_playoff = true,
        home_source_team_id = EXCLUDED.home_source_team_id,
        away_source_team_id = EXCLUDED.away_source_team_id,
        updated_at = now()
    `,
    [
      seasonId,
      WEEK_NUMBER,
      game.gameNumber,
      publicGameId,
      scheduledAt,
      homeTeamId,
      awayTeamId,
      homeSourceId,
      awaySourceId,
    ]
  );
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await ensureColumns(client);
    const seasonId = await getSeasonId(client);

    for (const name of PLACEHOLDER_TEAMS) {
      await upsertTeam(client, seasonId, name, true);
    }

    for (const game of PLAYOFF_GAMES) {
      const homeTeamId = await resolveTeamId(client, seasonId, game.home);
      const awayTeamId = await resolveTeamId(client, seasonId, game.away);
      await upsertGame(client, seasonId, game, homeTeamId, awayTeamId);
    }

    await client.query("COMMIT");
    console.log(
      `Seeded ${PLAYOFF_GAMES.length} ${SEASON_SLUG} playoff games (week ${WEEK_NUMBER}).`
    );

    // Normalize every seeded slot against current results: advances decided
    // slots to their winner and reverts undecided ones to their placeholder.
    const changed = await resolvePlayoffBracket(pool);
    console.log(`Resolved bracket: ${changed.length} matchup(s) updated.`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Playoff seed failed:");
  console.error(err);
  process.exit(1);
});
