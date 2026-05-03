const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth.middleware");
const { login, logout } = require("./auth.routes");
const { createGamesRouter } = require("./games.routes");

function registerAdminRoutes(app, options = {}) {
  const router = Router();

  router.post("/login", login);
  router.use(requireAuth);
  router.post("/logout", logout);
  router.use("/games", createGamesRouter(options));

  app.use("/api/admin", router);
}

module.exports = { registerAdminRoutes };
