import fs from "fs-extra";
import path from "path";

// Define the absolute base path where all server data is stored on your host
const BASE_SERVERS_DIR = path.resolve("/var/lib/mc-hosting/servers");

export class FileManagerService {
  /**
   * CRITICAL: Resolves and sanitizes a path to ensure it strictly stays within the server's root.
   */
  public static resolveAndValidatePath(
    serverId: string,
    requestPath: string,
  ): string {
    const serverRoot = path.join(
      BASE_SERVERS_DIR,
      `mc-data-${serverId}`,
      "data",
    );

    // path.resolve automatically resolves '..' and '.' segments
    const absolutePath = path.resolve(
      serverRoot,
      requestPath.replace(/^\//, ""),
    );

    // Check if the resulting path still starts with the serverRoot
    if (!absolutePath.startsWith(serverRoot)) {
      throw new Error("403: Forbidden - Path Traversal Attempt Detected");
    }

    return absolutePath;
  }

  public static async listDirectory(serverId: string, dirPath: string = "") {
    const targetPath = this.resolveAndValidatePath(serverId, dirPath);

    if (!(await fs.pathExists(targetPath))) {
      throw new Error("404: Directory not found");
    }

    const items = await fs.readdir(targetPath, { withFileTypes: true });

    return items.map((item) => ({
      name: item.name,
      isDirectory: item.isDirectory(),
      size: item.isFile()
        ? fs.statSync(path.join(targetPath, item.name)).size
        : 0,
      createdAt: fs.statSync(path.join(targetPath, item.name)).birthtime,
    }));
  }

  public static async readFile(
    serverId: string,
    filePath: string,
  ): Promise<string> {
    const targetPath = this.resolveAndValidatePath(serverId, filePath);
    return await fs.readFile(targetPath, "utf-8");
  }

  public static async writeFile(
    serverId: string,
    filePath: string,
    content: string,
  ): Promise<void> {
    const targetPath = this.resolveAndValidatePath(serverId, filePath);
    await fs.writeFile(targetPath, content, "utf-8");
  }

  public static async deleteItem(
    serverId: string,
    target: string,
  ): Promise<void> {
    const targetPath = this.resolveAndValidatePath(serverId, target);
    await fs.remove(targetPath);
  }

  public static async renameItem(
    serverId: string,
    oldPath: string,
    newName: string,
  ): Promise<void> {
    const sourcePath = this.resolveAndValidatePath(serverId, oldPath);
    // Ensure the new name doesn't try to traverse
    const destPath = this.resolveAndValidatePath(
      serverId,
      path.join(path.dirname(oldPath), newName),
    );

    await fs.rename(sourcePath, destPath);
  }

  public static async createDirectory(
    serverId: string,
    dirPath: string,
  ): Promise<void> {
    const targetPath = this.resolveAndValidatePath(serverId, dirPath);
    await fs.ensureDir(targetPath);
  }
}
