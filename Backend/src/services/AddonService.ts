import fs from "fs";
import path from "path";
import axios from "axios";

export class AddonService {
  // Base path where your Docker volumes are stored on the host OS
  // (Adjust this depending on Linux vs Mac/Windows Docker setup)
  private readonly BASE_VOLUME_PATH = "/var/lib/docker/volumes";

  /**
   * Helper to get the correct destination folder based on addon type
   */
  private getTargetDirectory(
    serverId: string,
    type: "plugin" | "mod" | "datapack" | "modpack",
  ): string {
    const serverPath = path.join(
      this.BASE_VOLUME_PATH,
      `mc-data-${serverId}`,
      "_data",
    );

    switch (type) {
      case "plugin":
        return path.join(serverPath, "plugins");
      case "mod":
        return path.join(serverPath, "mods");
      case "datapack":
        return path.join(serverPath, "world", "datapacks");
      case "modpack":
        return serverPath; // Modpacks usually extract to the root
      default:
        throw new Error("Invalid addon type");
    }
  }

  /**
   * Downloads a file from a URL directly to the server's disk using Streams
   */
  async installFromUrl(
    serverId: string,
    fileUrl: string,
    fileName: string,
    type: "plugin" | "mod" | "datapack",
  ) {
    const targetDir = this.getTargetDirectory(serverId, type);

    // Ensure the directory exists (e.g., if the server hasn't created the /plugins folder yet)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, fileName);

    console.log(`[AddonService] Downloading ${fileName} to ${filePath}...`);

    const response = await axios({
      method: "GET",
      url: fileUrl,
      responseType: "stream", // CRITICAL: Prevents loading the whole file into RAM
    });

    const writer = fs.createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      let error: Error | null = null;

      writer.on("error", (err) => {
        error = err;
        writer.close();
        reject(err);
      });

      writer.on("close", () => {
        if (!error) resolve(filePath);
      });
    });
  }

  /**
   * Resolves a Modrinth Version ID into a direct download URL, then installs it
   */
  async installFromModrinth(
    serverId: string,
    versionId: string,
    type: "plugin" | "mod" | "datapack",
  ) {
    try {
      // 1. Ask Modrinth for the file details
      const modrinthApi = `https://api.modrinth.com/v2/version/${versionId}`;
      const res = await axios.get(modrinthApi);

      // 2. Find the primary file in the response
      const primaryFile =
        res.data.files.find((f: any) => f.primary) || res.data.files[0];

      if (!primaryFile)
        throw new Error("No files found for this Modrinth version");

      const downloadUrl = primaryFile.url;
      const fileName = primaryFile.filename;

      // 3. Pass it to our URL installer
      await this.installFromUrl(serverId, downloadUrl, fileName, type);
      return fileName;
    } catch (error) {
      console.error("[AddonService] Modrinth API Error:", error);
      throw new Error("Failed to install from Modrinth");
    }
  }

  /**
   * Moves a locally uploaded file into the server's addon directory
   */
  async installCustomUpload(
    serverId: string,
    tempFilePath: string,
    originalFileName: string,
    type: "plugin" | "mod" | "datapack",
  ) {
    const targetDir = this.getTargetDirectory(serverId, type);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const destinationPath = path.join(targetDir, originalFileName);

    // Move the temp file to the final server volume path
    fs.renameSync(tempFilePath, destinationPath);
    console.log(
      `[AddonService] Installed custom upload: ${originalFileName} to ${targetDir}`,
    );

    return originalFileName;
  }
}
