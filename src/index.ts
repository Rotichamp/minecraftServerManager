import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { SocketService } from "./services/SocketService.js";

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Note: Update this to your frontend URL in production
    methods: ["GET", "POST"],
  },
});

// Initialize our new Socket Service
const socketService = new SocketService(io);
socketService.initializeHandlers();

server.listen(PORT, () => {
  console.log(
    `🚀 Minecraft Hosting Backend API running at http://localhost:${PORT}`,
  );
  console.log(`📡 WebSocket Service initialized and ready!`);
});
