const seasonsRoutes = require("./seasons.routes");
const teamsRoutes = require("./teams.routes");
const playersRoutes = require("./players.routes");
const gamesRoutes = require("./games.routes");
const standingsRoutes = require("./standings.routes");
const leadersRoutes = require("./leaders.routes");
const playerProfileRoutes = require("./player-profile.routes");

function registerPublicRoutes(app) {
  app.use("/api/seasons", seasonsRoutes);
  app.use("/api/seasons", teamsRoutes);
  app.use("/api/seasons", playersRoutes);
  app.use("/api", gamesRoutes);
  app.use("/api/standings", standingsRoutes);
  app.use("/api/leaders", leadersRoutes);
  app.use("/api/players", playerProfileRoutes);
}

module.exports = { registerPublicRoutes };
