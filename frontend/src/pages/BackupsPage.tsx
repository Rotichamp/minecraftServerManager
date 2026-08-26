import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Archive, ArchiveRestore, Info } from "lucide-react";
import type { BackupItem, ServerEntry } from "../types";
import { createBackup, errMsg, listBackups, restoreBackup } from "../lib/api";
import { formatBytes, timeAgo } from "../lib/utils";
import { Button, ConfirmDialog, EmptyState, Spinner } from "../components/UI";
import { useToast } from "../components/Toast";

export default function BackupsPage() {
  const entry = useOutletContext<ServerEntry>();
  const toast = useToast();

  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<BackupItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBackups(await listBackups(entry.serverId));
    } catch (err) {
      toast("error", errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [entry.serverId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function makeBackup() {
    setCreating(true);
    try {
      const name = await createBackup(entry.serverId);
      toast("success", `Snapshot saved: ${name}`);
      await load();
    } catch (err) {
      toast("error", errMsg(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Info className="h-3.5 w-3.5" />
          Snapshots archive the whole server folder (.tar.gz)
        </p>
        <button onClick={() => void makeBackup()} disabled={creating} className="btn-primary">
          {creating ? <Spinner /> : <Archive className="h-4 w-4" />}
          {creating ? "Archiving…" : "Create backup"}
        </button>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <Spinner /> Loading backups…
        </div>
      ) : backups.length === 0 ? (
        <EmptyState
          icon={<Archive className="h-6 w-6" />}
          title="No backups yet"
          body="Take your first snapshot before big changes — installing mods, updating versions, or experimenting with commands."
        />
      ) : (
        <div className="space-y-2">
          {backups.map((b, i) => (
            <div
              key={b.name}
              style={{ animationDelay: `${i * 50}ms` }}
              className="card card-hover flex items-center gap-3 p-4"
            >
              <Archive className="h-4 w-4 shrink-0 text-accent/70" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[13px]">{b.name}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted">
                  {formatBytes(b.size)} · {timeAgo(b.createdAt)}
                </p>
              </div>
              <Button
                onClick={() => setRestoring(b)}
                className="shrink-0 !border-danger/30 !text-danger hover:!bg-danger/10"
              >
                <ArchiveRestore className="h-3.5 w-3.5" />
                Restore
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={restoring !== null}
        onClose={() => setRestoring(null)}
        title={`Restore ${restoring?.name ?? ""}?`}
        body="The server stops, ALL current world data is wiped, and the snapshot takes its place. Anything done since this backup is gone forever."
        confirmLabel="Wipe & restore"
        danger
        loading={false}
        onConfirm={async () => {
          if (!restoring) return;
          try {
            const msg = await restoreBackup(entry.serverId, restoring.name);
            toast("success", msg);
            setRestoring(null);
          } catch (err) {
            toast("error", errMsg(err));
          }
        }}
      />
    </div>
  );
}
