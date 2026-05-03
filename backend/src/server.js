const http = require("http");
const { app, registerErrorHandling } = require("./app");
const { env } = require("./config/env");
const { pool } = require("./db/pool");
const { registerAdminRoutes } = require("./routes/admin");
const { registerPublicRoutes } = require("./routes/public");
const { registerSocketServer } = require("./socket");

const server = http.createServer(app);
const { broadcastLiveGameState } = registerSocketServer(server);

registerPublicRoutes(app);
registerAdminRoutes(app, { broadcastLiveGameState });
registerErrorHandling(app);

server.listen(env.PORT, () => {
  console.log(`IFNBL API listening on port ${env.PORT}`);
});

const shutdown = async () => {
  console.log("Shutting down IFNBL API...");
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
