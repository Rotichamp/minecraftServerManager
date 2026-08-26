import { useEffect, useState, type ReactNode } from "react";
import { useOutletContext } from "react-router-dom";
import { Cpu, MemoryStick, Clock, Activity } from "lucide-react";
import type { ServerEntry } from "../types";
import { useStats } from "../hooks/useStats";
import { formatUptime } from "../lib/utils";

function StatCard({
  icon,
  label,
  value,
  sub,
  bar,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  /** 0..1 — renders an accent progress bar when provided */
  bar?: number;
}) {
  return (
    <div className="card animate-fade-up p-4 sm:p-5">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <p className="text-xs font-medium uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-3 font-mono text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-1 font-mono text-xs text-muted">{sub}</p>}
      {bar !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full origin-left rounded-full bg-accent transition-transform duration-700 ease-out"
            style={{
              transform: `scaleX(${Math.min(1, Math.max(0, bar))})`,
              filter:
                bar > 0.85
                  ? "drop-shadow(0 0 6px rgb(248 113 113 / 0.6))"
                  : undefined,
              backgroundColor: bar > 0.85 ? "rgb(var(--c-danger))" : undefined,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function Overview() {
  const entry = useOutletContext<ServerEntry>();
  const stats = useStats(entry.containerId);
  const [, tick] = useState(0);

  // Uptime ticker
  useEffect(() => {
    if (!stats?.startedAt) return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [stats?.startedAt]);

  const memPct = stats ? Number(stats.memoryPercent) : null;
  const cpuPct = stats ? Number(stats.cpuPercent) : null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Status"
          value={stats?.status === "running" ? "RUNNING" : "—"}
          sub={stats?.status === "running" ? "telemetry live" : "waiting for data"}
        />
        <StatCard
          icon={<Cpu className="h-3.5 w-3.5" />}
          label="CPU"
          value={cpuPct === null ? "—" : `${cpuPct.toFixed(1)}%`}
          sub={entry.cpuCores ? `limit ${entry.cpuCores} vCPU` : "unrestricted"}
          bar={cpuPct === null ? undefined : cpuPct / 100}
        />
        <StatCard
          icon={<MemoryStick className="h-3.5 w-3.5" />}
          label="Memory"
          value={memPct === null ? "—" : `${memPct.toFixed(1)}%`}
          sub={stats ? `${stats.memoryMb} MB in use` : undefined}
          bar={memPct === null ? undefined : memPct / 100}
        />
        <StatCard
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Uptime"
          value={stats?.startedAt ? formatUptime(stats.startedAt) : "—"}
          sub={entry.type.toLowerCase()}
        />
      </div>

      {/* Connection info */}
      <div className="card mt-4 flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold">Connect in Minecraft</h3>
          <p className="mt-1 text-xs text-muted">
            Multiplayer → Direct Connection → enter this address
          </p>
        </div>
        <code className="rounded-lg bg-surface2 px-3 py-2 font-mono text-sm text-accent ring-1 ring-inset ring-accent/20">
          {window.location.hostname}:{entry.port}
        </code>
      </div>

      <p className="mt-4 px-1 text-xs leading-relaxed text-muted">
        Telemetry streams over Socket.IO once the container is running — a
        freshly created server reports its first stats after the world finishes
        generating.
      </p>
    </>
  );
}
