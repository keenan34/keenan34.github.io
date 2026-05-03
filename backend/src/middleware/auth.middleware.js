const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function getBearerToken(req) {
  const header = req.get("authorization");
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
}

function requireAuth(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    req.admin = jwt.verify(token, env.JWT_SECRET);
    next();
  } catch (_err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireAuth };
