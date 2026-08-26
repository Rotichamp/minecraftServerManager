# Backend API Map — minecraftServerManager

Reference for frontend development. Base URL: `http://localhost:3000` (Express). Realtime: Socket.IO on same port.

## REST Endpoints (prefix `/api/servers`)

### Servers lifecycle
| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| POST | `/` | `{ serverId, serverPort, serverType?, memoryMB?, cpuCores? }` | `201 { message, serverId, containerId, port }` | Creates + starts container `mc-<serverId>` (image `itzg/minecraft-server`, volume `mc-data-<serverId>:/data`, port `<serverPort>`→25565). `serverType`: PAPER default (any itzg TYPE value works: VANILLA, FORGE, FABRIC…). RAM in MB, CPU in cores. |
| POST | `/:containerId/stop` | — | `{ message }` | Graceful stop, 10s timeout |
| POST | `/:containerId/restart` | — | `{ message }` | Graceful restart, 10s |
| POST | `/:containerId/command` | `{ command }` | `{ message, output }` | Leading `/` stripped automatically; runs via rcon-cli |

⚠️ `:containerId` = the value returned by create (`containerId`) OR the container name `mc-<serverId>` — NOT bare serverId.

### File manager (paths relative to server root `/data`)
| Method | Path | Input | Returns |
|---|---|---|---|
| GET | `/:serverId/files?path=` | query path (default "") | `{ success, data: [{ name, isDirectory, size(bytes), createdAt }] }` |
| GET | `/:serverId/files/read?path=` | query path | `{ success, data: "<utf8 content>" }` |
| POST | `/:serverId/files/write` | `{ path, content }` | `{ success, message }` |
| DELETE | `/:serverId/files?path=` | query path | `{ success, message }` |
| PUT | `/:serverId/files/rename` | `{ oldPath, newName }` | `{ success, message }` |
| POST | `/:serverId/files/folder` | `{ path }` | `{ success, message }` |
| POST | `/:serverId/files/upload` | multipart: files[] + field `path` | `{ success, message }` |

### Backups
| Method | Path | Returns | Notes |
|---|---|---|---|
| GET | `/:serverId/backups` | `{ success, data: [{ name, size, createdAt }] }` | `.tar.gz` files |
| POST | `/:serverId/backups` | `{ success, data: "<backupName>" }` | Name format `backup-<timestamp>.tar.gz` |
| POST | `/:serverId/backups/:backupName/restore` | `{ success, message }` | Stops `mc-<serverId>`, WIPES data dir, extracts backup, restarts |

### Addons
`POST /:containerId/addons/install`
```json
{
  "provider": "modrinth" | "url",
  "addonType": "plugin" | "mod" | "datapack",
  "versionId": "<modrinth version id>",     // required for modrinth
  "directUrl": "...", "fileName": "...",     // required for url
  "serverId": "<serverId>"                   // REQUIRED in body (routes use serverId volumes)
}
```
→ `{ message, file }`. CurseForge returns 501 (not implemented).

## Socket.IO realtime

Client emits:
- `subscribe_console(containerId)` → joins room; server sends last 50 lines immediately, then live tail
- `subscribe_stats(containerId)` → joins room; ~1 update/sec

Server emits:
- `console_output` → `{ containerId, log }`
- `stats_update` → `{ containerId, cpuPercent, memoryPercent, memoryMb, startedAt(ISO→uptime timer), status }`

## Gaps discovered (ask backend owner / fix later)
1. **No list-servers endpoint** (`GET /api/servers`) — frontend can't discover existing servers; needs local storage or new endpoint.
2. **No standalone start** — stopped containers can't be restarted via API (only create-auto-starts and restore re-starts internally).
3. **No auth** on any route — fine for LAN dev, dangerous public.
4. `uploadCustomAddon` controller exists but is **not mounted** to any route.
5. `BackupService.deleteBackup` exists but **no DELETE route** exposes it.
6. Socket CORS is `*` — restrict in production.
