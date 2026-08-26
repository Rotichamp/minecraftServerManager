import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Terminal,
  FolderOpen,
  Archive,
  Puzzle,
  Gauge,
  RotateCcw,
} from "lucide-react";
import { getServer } from "../lib/storage";
import { cn } from "../lib/utils";
import { ConfirmDialog } from "../components/UI";
import { useState } from "react";
import { restartServer, errMsg, stopServer } from "../lib/api";
import { useToast } from "../components/Toast";

const tabs = [
  { to: "overview", label: "Overview", icon: Gauge },
  { to: "console", label: "Console", icon: Terminal },
  { to: "files", label: "Files", icon: FolderOpen },
  { to: "backups", label: "Backups", icon: Archive },
  { to: "addons", label: "Addons", icon: Puzzle },
];

export default function ServerLayout() {
  const { serverId } = useParams();
  const entry = serverId ? getServer(serverId) : undefined;
  const navigate = useNavigate();
  const toast = useToast();

  const [confirmStop, setConfirmStop] = useState(false);
  const [busy, setBusy] = useState<"restart" | "stop" | null>(null);

  if (!entry) {
    return (
      <div className="card mx-auto mt-10 max-w-md p-8 text-center">
        <h2 className="font-display text-lg font-semibold">Server not found</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This panel only tracks servers created in this browser. It may have
          been unregistered, or created on another device.
        </p>
        <button onClick={() => navigate("/")} className="btn-primary mt-5">
          Back to dashboard
        </button>
      </div>
    );
  }

  async function doRestart() {
    setBusy("restart");
    try {
      await restartServer(entry!.containerId);
      toast("success", `${entry!.serverId} restarted`);
    } catch (err) {
      toast("error", errMsg(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {/* Server header */}
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            onClick={() => navigate("/")}
            aria-label="Back to dashboard"
            className="btn-icon -ml-2 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="min-w-0 truncate font-mono text-lg font-bold tracking-tight sm:text-xl">
            {entry.serverId}
          </h1>
          <span className="badge bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">
            {entry.type}
          </span>
          <span className="badge bg-white/[0.06] text-muted">:{entry.port}</span>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={doRestart}
              disabled={busy !== null}
              className="btn-secondary h-8 px-3 text-xs"
            >
              <RotateCcw
                className={cn("h-3.5 w-3.5", busy === "restart" && "animate-spin")}
              />
              Restart
            </button>
            <button
              onClick={() => setConfirmStop(true)}
              disabled={busy !== null}
              className="btn-danger h-8 px-3 text-xs"
            >
              Stop
            </button>
          </div>
        </div>

        {/* Tab chips — horizontal scroll on mobile, inline on desktop */}
        <nav className="mt-4 flex gap-1 overflow-x-auto scroll-thin pb-1">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn("chip", isActive && "chip-active")}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet context={entry} />

      <ConfirmDialog
        open={confirmStop}
        onClose={() => setConfirmStop(false)}
        title={`Stop ${entry.serverId}?`}
        body="Players will be disconnected and the world saves gracefully (10s). You can't start it again from the panel yet — the backend is missing a start endpoint."
        confirmLabel="Stop server"
        danger
        loading={busy === "stop"}
        onConfirm={async () => {
          setBusy("stop");
          try {
            await stopServer(entry.containerId);
            toast("success", `${entry.serverId} stopped`);
            setConfirmStop(false);
          } catch (err) {
            toast("error", errMsg(err));
          } finally {
            setBusy(null);
          }
        }}
      />
    </>
  );
}
