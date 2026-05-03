const express = require("express");
const cors = require("cors");
const { env } = require("./config/env");

const app = express();

app.use(
  cors({
    origin: env.corsOriginChecker,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ifnbl-api",
    environment: env.NODE_ENV,
  });
});

function registerErrorHandling(targetApp) {
  targetApp.use((_req, res) => {
    res.status(404).json({
      error: "Not found",
    });
  });

  targetApp.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({
      error: "Internal server error",
    });
  });
}

module.exports = { app, registerErrorHandling };
