import { Server, Socket } from "socket.io";
import { DockerService } from "./DockerService.js";

export class SocketService {
  private io: Server;
  private dockerService: DockerService;

  // We pass the Socket.io server instance in when we create the class
  constructor(io: Server) {
    this.io = io;
    this.dockerService = new DockerService();
  }

  /**
   * Initializes all WebSocket event listeners
   */
  public initializeHandlers() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`🔌 New frontend client connected: ${socket.id}`);

      this.handleConsoleSubscription(socket);
      this.handleStatsSubscription(socket); // <-- Add this line

      socket.on("disconnect", () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Handles clients subscribing to live server logs
   */
  private handleConsoleSubscription(socket: Socket) {
    socket.on("subscribe_console", async (containerId: string) => {
      console.log(
        `[Socket] Client ${socket.id} subscribing to console: ${containerId}`,
      );

      // Join a specific room for this container's logs
      socket.join(`console_${containerId}`);

      // Start streaming from Docker
      await this.dockerService.streamConsole(containerId, (logLine) => {
        // Emit only to clients viewing this specific server
        this.io.to(`console_${containerId}`).emit("console_output", {
          containerId,
          log: logLine,
        });
      });
    });
  }

  /**
   * Handles clients subscribing to live CPU/RAM stats
   */
  private handleStatsSubscription(socket: Socket) {
    socket.on("subscribe_stats", async (containerId: string) => {
      console.log(
        `[Socket] Client ${socket.id} subscribing to stats: ${containerId}`,
      );

      // Join a specific room for this container's stats
      socket.join(`stats_${containerId}`);

      // Start streaming from Docker
      await this.dockerService.streamStats(containerId, (statsData) => {
        // Emit cleanly formatted data to the frontend room every second
        this.io.to(`stats_${containerId}`).emit("stats_update", {
          containerId,
          ...statsData,
        });
      });
    });
  }
}
