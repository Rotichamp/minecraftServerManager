import { type Request, type Response } from "express";
import { BackupService } from "../services/BackupService.js";
import { DockerService } from "../services/DockerService.js";

const dockerService = new DockerService();

export class BackupController {
  public static async create(req: Request, res: Response) {
    try {
      const serverId = req.params.serverId as string;

      const backupName = await BackupService.createBackup(serverId);
      res.json({ success: true, message: "Backup created", data: backupName });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public static async list(req: Request, res: Response) {
    try {
      const serverId = req.params.serverId as string;

      const backups = await BackupService.listBackups(serverId);
      res.json({ success: true, data: backups });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public static async restore(req: Request, res: Response) {
    try {
      const serverId = req.params.serverId as string;
      const backupName = req.params.backupName as string;
      const containerName = `mc-${serverId}`;

      // 1. Stop the server gracefully (10 seconds timeout)
      console.log(`Stopping server ${containerName} for backup restoration...`);
      try {
        await dockerService.stopServer(containerName);
      } catch (err) {
        console.log(
          `Container ${containerName} might already be stopped. Proceeding with restore.`,
        );
      }

      // 2. Perform the actual file wipe and extraction
      console.log(
        `Restoring backup ${backupName} for server ${containerName}...`,
      );
      await BackupService.restoreBackup(serverId, backupName);

      // 3. Boot the server back up
      console.log(`Starting server ${containerName} post-restore...`);
      await dockerService.startServer(containerName);

      res.json({
        success: true,
        message: "Server restored and restarted successfully",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
