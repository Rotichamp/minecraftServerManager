import type { ServerEntry } from "../types";

/**
 * Backend gap workaround: there is no GET /api/servers endpoint yet,
 * so servers created through this UI are registered in localStorage.
 * Swap this module for an API call once the backend adds list support.
 * (See docs/API_MAP.md → Gaps #1)
 */

const KEY = "msm.servers.v1";

export function getServers(): ServerEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ServerEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: ServerEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function saveServer(entry: ServerEntry): void {
  const all = getServers().filter((s) => s.serverId !== entry.serverId);
  all.unshift(entry);
  writeAll(all);
}

export function removeServer(serverId: string): void {
  writeAll(getServers().filter((s) => s.serverId !== serverId));
}

export function getServer(serverId: string): ServerEntry | undefined {
  return getServers().find((s) => s.serverId === serverId);
}
