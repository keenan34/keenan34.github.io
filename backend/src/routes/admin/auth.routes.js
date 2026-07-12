const jwt = require("jsonwebtoken");
const { env } = require("../../config/env");

function issueToken(username) {
  return jwt.sign(
    {
      sub: username,
      role: "admin",
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );
}

function login(req, res) {
  const { username, password } = req.body || {};

  if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  res.json({
    token: issueToken(env.ADMIN_USERNAME),
    tokenType: "Bearer",
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

// Trades a still-valid token for a fresh one so an active admin session keeps
// sliding forward instead of hard-expiring mid-game.
function refresh(req, res) {
  res.json({
    token: issueToken(req.admin.sub),
    tokenType: "Bearer",
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

function logout(_req, res) {
  res.json({ ok: true });
}

module.exports = { login, logout, refresh };
