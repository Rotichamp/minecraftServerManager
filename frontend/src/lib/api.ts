import axios from "axios";
import type {
  BackupItem,
  CreateServerPayload,
  CreateServerResponse,
  FileItem,
  InstallAddonPayload,
} from "../types";

export const API_BASE =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120_000, // image pull on first create can be slow
});

/** Unwrap axios errors into readable messages */
export function errMsg(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

/* ── Servers ─────────────────────────────────────────────── */

export async function createServer(
  payload: CreateServerPayload,
): Promise<CreateServerResponse> {
  const { data } = await api.post<CreateServerResponse>("/api/servers", payload);
  return data;
}

export async function stopServer(containerId: string): Promise<string> {
  const { data } = await api.post<{ message: string }>(
    `/api/servers/${containerId}/stop`,
  );
  return data.message;
}

export async function restartServer(containerId: string): Promise<string> {
  const { data } = await api.post<{ message: string }>(
    `/api/servers/${containerId}/restart`,
  );
  return data.message;
}

export async function sendCommand(
  containerId: string,
  command: string,
): Promise<string> {
  const { data } = await api.post<{ message: string; output: string }>(
    `/api/servers/${containerId}/command`,
    { command },
  );
  return data.output;
}

/* ── File manager ────────────────────────────────────────── */

export async function listFiles(serverId: string, path = ""): Promise<FileItem[]> {
  const { data } = await api.get<{ success: boolean; data: FileItem[] }>(
    `/api/servers/${serverId}/files`,
    { params: { path } },
  );
  return data.data;
}

export async function readFile(serverId: string, path: string): Promise<string> {
  const { data } = await api.get<{ success: boolean; data: string }>(
    `/api/servers/${serverId}/files/read`,
    { params: { path } },
  );
  return data.data;
}

export async function writeFile(serverId: string, path: string, content: string): Promise<void> {
  await api.post(`/api/servers/${serverId}/files/write`, { path, content });
}

export async function deleteItem(serverId: string, path: string): Promise<void> {
  await api.delete(`/api/servers/${serverId}/files`, { params: { path } });
}

export async function renameItem(serverId: string, oldPath: string, newName: string): Promise<void> {
  await api.put(`/api/servers/${serverId}/files/rename`, { oldPath, newName });
}

export async function createFolder(serverId: string, path: string): Promise<void> {
  await api.post(`/api/servers/${serverId}/files/folder`, { path });
}

export async function uploadFiles(serverId: string, path: string, files: File[]): Promise<void> {
  const form = new FormData();
  form.append("path", path);
  for (const f of files) form.append("files", f);
  await api.post(`/api/servers/${serverId}/files/upload`, form);
}

/* ── Backups ─────────────────────────────────────────────── */

export async function listBackups(serverId: string): Promise<BackupItem[]> {
  const { data } = await api.get<{ success: boolean; data: BackupItem[] }>(
    `/api/servers/${serverId}/backups`,
  );
  return data.data;
}

export async function createBackup(serverId: string): Promise<string> {
  const { data } = await api.post<{ success: boolean; data: string }>(
    `/api/servers/${serverId}/backups`,
  );
  return data.data;
}

export async function restoreBackup(serverId: string, backupName: string): Promise<string> {
  const { data } = await api.post<{ success: boolean; message: string }>(
    `/api/servers/${encodeURIComponent(serverId)}/backups/${encodeURIComponent(backupName)}/restore`,
  );
  return data.message;
}

/* ── Addons ──────────────────────────────────────────────── */

export async function installAddon(payload: InstallAddonPayload): Promise<string> {
  // Backend routes by :containerId but resolves volumes by body.serverId
  const { data } = await api.post<{ message: string; file: string }>(
    `/api/servers/${payload.serverId}/addons/install`,
    payload,
  );
  return data.message;
}
