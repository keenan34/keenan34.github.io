const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { env } = require("./config/env");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function gameRoom(gameId) {
  return `game:${gameId}`;
}

function registerSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.corsOriginChecker,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      next(new Error("Authentication required"));
      return;
    }

    try {
      socket.admin = jwt.verify(token, env.JWT_SECRET);
      next();
    } catch (_err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("admin:game:join", (gameId, ack) => {
      if (!UUID_PATTERN.test(gameId)) {
        if (typeof ack === "function") ack({ ok: false, error: "Invalid gameId" });
        return;
      }

      socket.join(gameRoom(gameId));
      if (typeof ack === "function") ack({ ok: true });
    });
  });

  function broadcastLiveGameState(gameId, liveGameState, reason) {
    io.to(gameRoom(gameId)).emit("admin:live-game:update", {
      reason,
      ...liveGameState,
    });

    if (reason === "finalized") {
      io.to(gameRoom(gameId)).emit("admin:live-game:finalized", {
        reason,
        game: liveGameState.game,
      });
    }
  }

  return { io, broadcastLiveGameState };
}

module.exports = { registerSocketServer };
