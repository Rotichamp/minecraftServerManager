import { io, type Socket } from "socket.io-client";
import { API_BASE } from "./api";

/**
 * The backend has no room-leave handler, so the clean pattern is:
 * one dedicated connection per realtime view, disconnected on unmount.
 */
export function connectSocket(): Socket {
  return io(API_BASE, {
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
  });
}
