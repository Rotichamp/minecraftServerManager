import fs from "fs-extra";
import path from "path";
import * as archiver from "archiver";
import * as tar from "tar";

const BASE_SERVERS_DIR = path.resolve("/var/lib/mc-hosting/servers");

export class BackupService {
  private static getServerPaths(serverId: string) {
    const serverBase = path.join(BASE_SERVERS_DIR, `mc-data-${serverId}`);
    return {
      dataDir: path.join(serverBase, "data"),
      backupDir: path.join(serverBase, "backups"),
    };
  }

  public static async createBackup(serverId: string): Promise<string> {
    const { dataDir, backupDir } = this.getServerPaths(serverId);
    await fs.ensureDir(backupDir);

    const backupFileName = `backup-${Date.now()}.tar.gz`;
    const backupFilePath = path.join(backupDir, backupFileName);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(backupFilePath);

      const archive = (archiver as any)("tar", {
        gzip: true,
        gzipOptions: { level: 9 },
      });

      output.on("close", () => resolve(backupFileName));

      archive.on("error", (err: any) => reject(err));

      archive.pipe(output);
      archive.directory(dataDir, false);
      archive.finalize();
    });
  }

  public static async listBackups(serverId: string) {
    const { backupDir } = this.getServerPaths(serverId);
    if (!(await fs.pathExists(backupDir))) return [];

    const files = await fs.readdir(backupDir);
    return files
      .filter((f) => f.endsWith(".tar.gz"))
      .map((file) => {
        const stats = fs.statSync(path.join(backupDir, file));
        return { name: file, size: stats.size, createdAt: stats.birthtime };
      });
  }

  public static async restoreBackup(
    serverId: string,
    backupName: string,
  ): Promise<void> {
    const { dataDir, backupDir } = this.getServerPaths(serverId);
    const backupPath = path.join(backupDir, backupName);

    if (!(await fs.pathExists(backupPath))) {
      throw new Error("404: Backup not found");
    }

    // Optional: Stop the Docker container via DockerService before doing this!

    // 1. Wipe current data (except the backups folder, which is safely outside this dir)
    await fs.emptyDir(dataDir);

    // 2. Extract tar.gz into the data directory
    await tar.x({
      file: backupPath,
      cwd: dataDir,
    });
  }

  public static async deleteBackup(
    serverId: string,
    backupName: string,
  ): Promise<void> {
    const { backupDir } = this.getServerPaths(serverId);
    const backupPath = path.join(backupDir, backupName);
    await fs.remove(backupPath);
  }
}
