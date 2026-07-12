require("dotenv").config();

const requiredEnvVars = [
  "DATABASE_URL",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "JWT_SECRET",
];

const missing = requiredEnvVars.filter((key) => !process.env[key]);

function parseOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://ifnbl.com",
  "https://www.ifnbl.com",
  "https://keenan34.github.io",
];

function isLocalDevelopmentOrigin(origin) {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );
  } catch (_err) {
    return false;
  }
}

function createCorsOriginChecker(allowedOrigins, nodeEnv) {
  const exactOrigins = new Set(allowedOrigins);

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (nodeEnv !== "production") {
      if (isLocalDevelopmentOrigin(origin) || exactOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, true);
      return;
    }

    if (exactOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin not allowed: ${origin}`));
  };
}

if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 4000),
  DATABASE_URL: process.env.DATABASE_URL,
  CORS_ORIGINS: parseOrigins(
    process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGINS.join(",")
  ),
  ADMIN_USERNAME: process.env.ADMIN_USERNAME,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "12h",
};

if (!Number.isInteger(env.PORT) || env.PORT <= 0) {
  throw new Error("PORT must be a positive integer");
}

env.corsOriginChecker = createCorsOriginChecker(env.CORS_ORIGINS, env.NODE_ENV);

module.exports = { env, parseOrigins, createCorsOriginChecker };
