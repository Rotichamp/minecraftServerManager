import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  File as FileIcon,
  Folder,
  FolderPlus,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
  ChevronRight,
  Save,
} from "lucide-react";
import type { FileItem, ServerEntry } from "../types";
import * as filesApi from "../lib/api";
import { errMsg } from "../lib/api";
import { formatBytes, cn } from "../lib/utils";
import {
  Button,
  ConfirmDialog,
  Input,
  Modal,
  Spinner,
} from "../components/UI";
import { useToast } from "../components/Toast";

type Dialog =
  | { kind: "newFolder" }
  | { kind: "rename"; path: string; name: string }
  | { kind: "delete"; path: string; name: string }
  | null;

export default function FilesPage() {
  const entry = useOutletContext<ServerEntry>();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [path, setPath] = useState("");
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [editor, setEditor] = useState<{ path: string; content: string; saving: boolean } | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [textValue, setTextValue] = useState("");

  // Prefill the shared text dialog each time it opens
  useEffect(() => {
    if (dialog?.kind === "rename") setTextValue(dialog.name);
    else if (dialog?.kind === "newFolder") setTextValue("");
  }, [dialog]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await filesApi.listFiles(entry.serverId, path));
    } catch (err) {
      toast("error", errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [entry.serverId, path, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function openFolder(name: string) {
    setPath((p) => (p ? `${p}/${name}` : name));
  }

  async function openFile(item: FileItem) {
    const filePath = path ? `${path}/${item.name}` : item.name;
    try {
      const content = await filesApi.readFile(entry.serverId, filePath);
      setEditor({ path: filePath, content, saving: false });
    } catch (err) {
      toast("error", `Can't open binary/large file — ${errMsg(err)}`);
    }
  }

  async function saveEditor() {
    if (!editor || editor.saving) return;
    setEditor({ ...editor, saving: true });
    try {
      await filesApi.writeFile(entry.serverId, editor.path, editor.content);
      toast("success", `${editor.path} saved`);
      setEditor(null);
    } catch (err) {
      toast("error", errMsg(err));
      setEditor({ ...editor, saving: false });
    }
  }

  async function upload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      await filesApi.uploadFiles(entry.serverId, path, Array.from(fileList));
      toast("success", `${fileList.length} file(s) uploaded`);
      await load();
    } catch (err) {
      toast("error", errMsg(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const crumbs = path ? path.split("/") : [];

  return (
    <div className="animate-fade-up">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Breadcrumbs */}
        <nav
          aria-label="Folder path"
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scroll-thin rounded-lg border border-white/[0.06] bg-surface2/50 px-3 py-2 font-mono text-xs"
        >
          <button
            onClick={() => setPath("")}
            className="shrink-0 text-muted transition-colors hover:text-accent"
          >
            root
          </button>
          {crumbs.map((c, i) => (
            <span key={i} className="flex shrink-0 items-center">
              <ChevronRight className="mx-0.5 h-3 w-3 text-muted/50" />
              <button
                onClick={() => setPath(crumbs.slice(0, i + 1).join("/"))}
                className={cn(
                  "transition-colors",
                  i === crumbs.length - 1
                    ? "font-semibold text-accent"
                    : "text-muted hover:text-accent",
                )}
              >
                {c}
              </button>
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => void upload(e.target.files)}
          />
          <Button loading={uploading} onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
          <Button onClick={() => setDialog({ kind: "newFolder" })}>
            <FolderPlus className="h-4 w-4" />
            <span className="hidden sm:inline">New folder</span>
          </Button>
          <button aria-label="Refresh files" onClick={() => void load()} className="btn-icon border border-white/10 bg-surface2">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Listing */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
            <Spinner /> Loading…
          </div>
        ) : items.length === 0 ? (
          <p className="py-14 text-center text-sm text-muted">
            Empty folder{path === "" && " — world files appear after first boot"}
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {[...items]
              .sort((a, b) =>
                a.isDirectory === b.isDirectory
                  ? a.name.localeCompare(b.name)
                  : a.isDirectory
                    ? -1
                    : 1,
              )
              .map((item) => {
                const itemPath = path ? `${path}/${item.name}` : item.name;
                return (
                  <li
                    key={item.name}
                    className="group flex items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-white/[0.03]"
                  >
                    {item.isDirectory ? (
                      <Folder className="h-4 w-4 shrink-0 fill-accent/15 text-accent" />
                    ) : (
                      <FileIcon className="h-4 w-4 shrink-0 text-muted" />
                    )}

                    <button
                      onClick={() => (item.isDirectory ? openFolder(item.name) : void openFile(item))}
                      className="min-w-0 flex-1 truncate text-left font-mono text-[13px] hover:text-accent"
                    >
                      {item.name}
                      {item.isDirectory && "/"}
                    </button>

                    <span className="hidden shrink-0 font-mono text-[11px] text-muted sm:block">
                      {item.isDirectory ? "—" : formatBytes(item.size)}
                    </span>

                    <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                      <button
                        aria-label={`Rename ${item.name}`}
                        onClick={() => setDialog({ kind: "rename", path: itemPath, name: item.name })}
                        className="btn-icon"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        aria-label={`Delete ${item.name}`}
                        onClick={() => setDialog({ kind: "delete", path: itemPath, name: item.name })}
                        className="btn-icon hover:!text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </div>

      {/* Editor modal */}
      <Modal
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={`Editing ${editor?.path ?? ""}`}
        wide
      >
        {editor && (
          <>
            <textarea
              value={editor.content}
              onChange={(e) => setEditor({ ...editor, content: e.target.value })}
              spellCheck={false}
              rows={18}
              className="scroll-thin input resize-y font-mono !text-xs leading-relaxed"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={() => setEditor(null)}>Cancel</Button>
              <button onClick={() => void saveEditor()} disabled={editor.saving} className="btn-primary">
                <Save className="h-4 w-4" /> {editor.saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* New folder / rename share one text-input modal */}
      <Modal
        open={dialog?.kind === "newFolder" || dialog?.kind === "rename"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "newFolder" ? "New folder" : `Rename ${dialog?.name ?? ""}`}
      >
        <Input
          autoFocus
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder={dialog?.kind === "newFolder" ? "plugins-backup" : dialog?.name}
          onKeyDown={(e) => e.key === "Enter" && void submitTextDialog()}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <button onClick={() => void submitTextDialog()} className="btn-primary">
            {dialog?.kind === "newFolder" ? "Create" : "Rename"}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={dialog?.kind === "delete"}
        onClose={() => setDialog(null)}
        title={`Delete ${dialog?.name ?? ""}?`}
        body="This permanently removes the file or folder from the server. There is no undo — make a backup first if it matters."
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (dialog?.kind !== "delete") return;
          try {
            await filesApi.deleteItem(entry.serverId, dialog.path);
            toast("success", `${dialog.name} deleted`);
            setDialog(null);
            await load();
          } catch (err) {
            toast("error", errMsg(err));
          }
        }}
      />
    </div>
  );

  /* shared handler for the two text-input dialogs */
  async function submitTextDialog(): Promise<void> {
    if (!dialog) return;
    const value = textValue.trim();
    if (!value) return;
    try {
      if (dialog.kind === "newFolder") {
        await filesApi.createFolder(entry.serverId, path ? `${path}/${value}` : value);
        toast("success", `Created /${value}`);
      } else if (dialog.kind === "rename") {
        await filesApi.renameItem(entry.serverId, dialog.path, value);
        toast("success", `Renamed to ${value}`);
      }
      setDialog(null);
      setTextValue("");
      await load();
    } catch (err) {
      toast("error", errMsg(err));
    }
  }
}
