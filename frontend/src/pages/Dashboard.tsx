import { useNavigate, Link } from "react-router-dom";
import { Boxes, Plus, Trash2, ChevronRight } from "lucide-react";
import { getServers, removeServer } from "../lib/storage";
import { timeAgo } from "../lib/utils";
import { EmptyState, PageHeader, ConfirmDialog } from "../components/UI";
import { useState } from "react";
import { useToast } from "../components/Toast";
import type { ServerEntry } from "../types";

export default function Dashboard() {
  const servers = getServers();
  const navigate = useNavigate();
  const toast = useToast();
  const [toRemove, setToRemove] = useState<ServerEntry | null>(null);
  // re-read after removal to force repaint
  const [, bump] = useState(0);

  return (
    <>
      <PageHeader
        title="Servers"
        subtitle={
          servers.length > 0
            ? `${servers.length} server${servers.length > 1 ? "s" : ""} registered in this browser`
            : "Your Minecraft fleet lives here"
        }
      />

      {servers.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-6 w-6" />}
          title="No servers yet"
          body="Spin up your first Minecraft server — pick a version, set the resources, and you're in the world in under a minute."
          action={
            <Link to="/create" className="btn-primary">
              <Plus className="h-4 w-4" /> Create your first server
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {servers.map((s, i) => (
            <div
              key={s.serverId}
              style={{ animationDelay: `${i * 60}ms` }}
              className="card card-hover group animate-fade-up p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-mono text-sm font-semibold text-glow">
                    {s.serverId}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    created {timeAgo(s.createdAt)}
                  </p>
                </div>
                <span className="badge bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">
                  {s.type}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="font-mono text-xs text-muted">
                  :{s.port}
                  {s.memoryMB ? ` · ${(s.memoryMB / 1024).toFixed(s.memoryMB % 1024 ? 1 : 0)}GB` : ""}
                  {s.cpuCores ? ` · ${s.cpuCores} vCPU` : ""}
                </p>
                <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  <button
                    aria-label={`Unregister ${s.serverId} from panel`}
                    onClick={() => setToRemove(s)}
                    className="btn-icon hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/server/${s.serverId}/overview`)}
                    className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
                  >
                    Manage <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* New server tile */}
          <Link
            to="/create"
            className="flex min-h-[140px] items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 text-sm font-medium text-muted transition-all duration-200 hover:border-accent/40 hover:text-accent"
          >
            <Plus className="h-4 w-4" /> New server
          </Link>
        </div>
      )}

      <ConfirmDialog
        open={toRemove !== null}
        onClose={() => setToRemove(null)}
        title="Remove from panel?"
        body={`${toRemove?.serverId ?? ""} will disappear from this dashboard. The Docker container and its world data are NOT deleted — it just won't be tracked here anymore.`}
        confirmLabel="Remove"
        danger
        onConfirm={() => {
          if (!toRemove) return;
          removeServer(toRemove.serverId);
          toast("success", `${toRemove.serverId} removed from panel`);
          setToRemove(null);
          bump((n) => n + 1);
        }}
      />
    </>
  );
}
