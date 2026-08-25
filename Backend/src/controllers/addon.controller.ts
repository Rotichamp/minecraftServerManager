import { type Request, type Response } from "express";
import { AddonService } from "../services/AddonService.js";

const addonService = new AddonService();

export const installAddon = async (
  req: Request,
  res: Response,
): Promise<any> => {
  const { containerId } = req.params;

  // Extract data from the frontend's request body
  const {
    provider, // 'modrinth', 'curseforge', or 'url'
    addonType, // 'plugin', 'mod', 'datapack'
    versionId, // Used for Modrinth/CurseForge
    directUrl, // Used for direct link installs
    fileName, // Used for direct link installs
  } = req.body;

  if (!provider || !addonType) {
    return res
      .status(400)
      .json({ error: "Provider and addonType are required." });
  }

  // Since containerId is 'b7e1343f5d11', but our volumes are named using 'serverId',
  // you might need to pass the actual serverId in the body or look it up in your DB.
  // For this example, assuming the frontend passes `serverId` in the body:
  const serverId = req.body.serverId;

  try {
    let installedFile = "";

    if (provider === "modrinth") {
      if (!versionId)
        return res
          .status(400)
          .json({ error: "versionId is required for Modrinth" });
      installedFile = await addonService.installFromModrinth(
        serverId,
        versionId,
        addonType,
      );
    } else if (provider === "url") {
      if (!directUrl || !fileName)
        return res
          .status(400)
          .json({ error: "directUrl and fileName are required" });
      await addonService.installFromUrl(
        serverId,
        directUrl,
        fileName,
        addonType,
      );
      installedFile = fileName;
    } else if (provider === "curseforge") {
      // Note: CurseForge requires an API key in the headers.
      // You would build a similar installFromCurseForge() method.
      return res
        .status(501)
        .json({ error: "CurseForge integration coming soon." });
    } else {
      return res.status(400).json({ error: "Invalid provider." });
    }

    return res.json({
      message: `Successfully installed ${installedFile} into /${addonType}s`,
      file: installedFile,
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error.message || "Failed to install addon" });
  }
};
