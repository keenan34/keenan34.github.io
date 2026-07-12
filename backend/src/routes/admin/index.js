const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth.middleware");
const { login, logout, refresh } = require("./auth.routes");
const { createGamesRouter } = require("./games.routes");
const rosterRouter = require("./roster.routes");

function registerAdminRoutes(app, options = {}) {
  const router = Router();

  router.post("/login", login);
  router.use(requireAuth);
  router.post("/refresh", refresh);
  router.post("/logout", logout);
  router.use("/games", createGamesRouter(options));
  router.use("/roster", rosterRouter);

  app.use("/api/admin", router);
}

module.exports = { registerAdminRoutes };
