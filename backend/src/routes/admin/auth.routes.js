const jwt = require("jsonwebtoken");
const { env } = require("../../config/env");

function login(req, res) {
  const { username, password } = req.body || {};

  if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = jwt.sign(
    {
      sub: env.ADMIN_USERNAME,
      role: "admin",
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );

  res.json({
    token,
    tokenType: "Bearer",
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

function logout(_req, res) {
  res.json({ ok: true });
}

module.exports = { login, logout };
