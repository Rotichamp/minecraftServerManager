import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, Link2, Puzzle, Search } from "lucide-react";
import axios from "axios";
import type { AddonType, ModrinthHit, ModrinthVersion, ServerEntry } from "../types";
import { errMsg, installAddon } from "../lib/api";
import { cn, downloadCount } from "../lib/utils";
import { Button, Input, Spinner } from "../components/UI";
import { useToast } from "../components/Toast";

const MODRINTH = "https://api.modrinth.com/v2";

const TYPES: { id: AddonType; label: string }[] = [
  { id: "plugin", label: "Plugins" },
  { id: "mod", label: "Mods" },
  { id: "datapack", label: "Datapacks" },
];

export default function AddonsPage() {
  const entry = useOutletContext<ServerEntry>();
  const toast = useToast();

  const [addonType, setAddonType] = useState<AddonType>("plugin");
  const [tab, setTab] = useState<"modrinth" | "url">("modrinth");

  /* Modrinth search */
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ModrinthHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const debounceRef = useRef<number>();

  /* URL install */
  const [directUrl, setDirectUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [installingUrl, setInstallingUrl] = useState(false);

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        // Modrinth's public API supports CORS — queried straight from the browser
        const { data } = await axios.get(`${MODRINTH}/search`, {
          params: { query: query.trim(), limit: 12 },
        });
        setHits(data.hits as ModrinthHit[]);
      } catch (err) {
        toast("error", `Modrinth search failed — ${errMsg(err)}`);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => window.clearTimeout(debounceRef.current);
  }, [query, toast]);

  async function installFromModrinth(hit: ModrinthHit) {
    setInstallingId(hit.project_id);
    try {
      const { data: versions } = await axios.get<ModrinthVersion[]>(
        `${MODRINTH}/project/${hit.project_id}/version`,
      );
      const latest = versions[0];
      if (!latest) throw new Error("No downloadable versions for this project");
      const msg = await installAddon({
        provider: "modrinth",
        addonType,
        serverId: entry.serverId,
        versionId: latest.id,
      });
      toast("success", `${msg} — restart the server to load it`);
    } catch (err) {
      toast("error", errMsg(err));
    } finally {
      setInstallingId(null);
    }
  }

  async function installFromUrl() {
    if (!directUrl.trim() || !fileName.trim()) {
      toast("error", "Both URL and filename are required");
      return;
    }
    setInstallingUrl(true);
    try {
      const msg = await installAddon({
        provider: "url",
        addonType,
        serverId: entry.serverId,
        directUrl: directUrl.trim(),
        fileName: fileName.trim(),
      });
      toast("success", `${msg} — restart the server to load it`);
      setDirectUrl("");
      setFileName("");
    } catch (err) {
      toast("error", errMsg(err));
    } finally {
      setInstallingUrl(false);
    }
  }

  return (
    <div className="animate-fade-up">
      {/* Type selector */}
      <div className="mb-4 flex gap-1 overflow-x-auto scroll-thin">
        {TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setAddonType(t.id)}
            className={cn("chip", addonType === t.id && "chip-active")}
          >
            <Puzzle className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
        <span className="chip cursor-default opacity-50">CurseForge · soon</span>
      </div>

      {/* Tab switcher */}
      <div className="mb-4 flex w-fit rounded-lg border border-white/[0.08] bg-surface2 p-1">
        {(
          [
            ["modrinth", "Browse Modrinth"],
            ["url", "Install from URL"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150",
              tab === id ? "bg-accent/15 text-accent" : "text-muted hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "modrinth" ? (
        <>
          <div className="relative mb-4 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                addonType === "plugin"
                  ? "EssentialsX, Vault, WorldEdit…"
                  : addonType === "mod"
                    ? "Sodium, JEI, Create…"
                    : "Datapack name…"
              }
              className="!pl-9"
              aria-label="Search Modrinth"
            />
          </div>

          {searching ? (
            <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted">
              <Spinner /> Searching Modrinth…
            </div>
          ) : hits.length === 0 ? (
            <p className="py-14 text-center text-sm text-muted">
              {query.trim().length < 2
                ? "Start typing to search 100k+ projects"
                : "No results"}
            </p>
          ) : (
            <ul className="space-y-2">
              {hits.map((hit, i) => (
                <li
                  key={hit.project_id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="card card-hover animate-fade-up flex items-center gap-3 p-3.5"
                >
                  {hit.icon_url ? (
                    <img
                      src={hit.icon_url}
                      alt=""
                      width={40}
                      height={40}
                      loading="lazy"
                      className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-inset ring-white/10"
                    />
                  ) : (
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                      <Puzzle className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{hit.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">{hit.description}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted/70">
                      {downloadCount(hit.downloads)} downloads
                    </p>
                  </div>
                  <Button
                    loading={installingId === hit.project_id}
                    onClick={() => void installFromModrinth(hit)}
                    className="shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" /> Install
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        /* URL install form */
        <div className="card max-w-md space-y-4 p-5">
          <div>
            <label htmlFor="aurl" className="mb-1.5 block text-sm font-medium">
              Direct download URL
            </label>
            <Input
              id="aurl"
              value={directUrl}
              onChange={(e) => setDirectUrl(e.target.value)}
              placeholder="https://example.com/MyPlugin.jar"
            />
          </div>
          <div>
            <label htmlFor="aname" className="mb-1.5 block text-sm font-medium">
              Filename
            </label>
            <Input
              id="aname"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="MyPlugin.jar"
            />
          </div>
          <button
            onClick={() => void installFromUrl()}
            disabled={installingUrl}
            className="btn-primary w-full"
          >
            {installingUrl ? <Spinner /> : <Link2 className="h-4 w-4" />}
            Install to /{addonType}s
          </button>
          <p className="text-xs leading-relaxed text-muted">
            The file streams straight to the server folder — nothing touches this
            browser.
          </p>
        </div>
      )}
    </div>
  );
}
