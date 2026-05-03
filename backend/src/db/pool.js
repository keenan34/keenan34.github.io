const { Pool } = require("pg");
const { env } = require("../config/env");

const needsSsl =
  env.NODE_ENV === "production" ||
  /render\.com|render\.internal/i.test(env.DATABASE_URL);

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

module.exports = { pool };
