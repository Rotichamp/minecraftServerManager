import { useEffect, useState } from "react";
import type { StatsData } from "../types";
import { connectSocket } from "../lib/socket";

/**
 * Live per-second CPU/RAM telemetry for one container.
 * Opens a dedicated socket, cleans up on unmount/container change.
 */
export function useStats(containerId: string | null): StatsData | null {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    if (!containerId) return;
    setStats(null);

    const socket = connectSocket();

    const onConnect = () => socket.emit("subscribe_stats", containerId);
    const onUpdate = (data: StatsData) => setStats(data);

    socket.on("connect", onConnect);
    socket.on("stats_update", onUpdate);

    return () => {
      socket.off("connect", onConnect);
      socket.off("stats_update", onUpdate);
      socket.disconnect();
    };
  }, [containerId]);

  return stats;
}
