/** Shared types — mirrors backend payloads 1:1 (see docs/API_MAP.md) */

export interface ServerEntry {
  serverId: string;
  containerId: string;
  port: number;
  type: string;
  memoryMB?: number;
  cpuCores?: number;
  createdAt: string;
}

export interface CreateServerPayload {
  serverId: string;
  serverPort: number;
  serverType?: string;
  memoryMB?: number;
  cpuCores?: number;
}

export interface CreateServerResponse {
  message: string;
  serverId: string;
  containerId: string;
  port: number;
}

export interface FileItem {
  name: string;
  isDirectory: boolean;
  size: number;
  createdAt: string;
}

export interface BackupItem {
  name: string;
  size: number;
  createdAt: string;
}

export type AddonType = "plugin" | "mod" | "datapack";

export interface InstallAddonPayload {
  provider: "modrinth" | "url";
  addonType: AddonType;
  serverId: string;
  versionId?: string;
  directUrl?: string;
  fileName?: string;
}

export interface StatsData {
  containerId: string;
  cpuPercent: number;
  memoryPercent: number;
  memoryMb: string | number;
  startedAt?: string;
  status: string;
}

/* ── Modrinth public API shapes (subset we consume) ── */
export interface ModrinthHit {
  project_id: string;
  title: string;
  description: string;
  downloads: number;
  icon_url: string | null;
  slug: string;
}

export interface ModrinthVersion {
  id: string;
  name: string;
  version_number: string;
  date_published: string;
  files: { url: string; filename: string; primary: boolean }[];
}
