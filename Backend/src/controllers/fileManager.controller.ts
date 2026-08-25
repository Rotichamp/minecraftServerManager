import { type Request, type Response } from "express";
import { FileManagerService } from "../services/FileManagerService.js";

export class FileManagerController {
  public static async listFiles(req: Request, res: Response) {
    try {
      const serverId = req.params.serverId as string;
      const path = (req.query.path as string) || ""; // Default to empty string if undefined

      const files = await FileManagerService.listDirectory(serverId, path);
      res.json({ success: true, data: files });
    } catch (error: any) {
      res
        .status(error.message.includes("403") ? 403 : 500)
        .json({ error: error.message });
    }
  }

  public static async readFile(req: Request, res: Response) {
    try {
      const serverId = req.params.serverId as string;
      const path = req.query.path as string;

      if (!path) throw new Error("Path is required");

      const content = await FileManagerService.readFile(serverId, path);
      res.json({ success: true, data: content });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public static async writeFile(req: Request, res: Response) {
    try {
      const serverId = req.params.serverId as string;
      const { path, content } = req.body;

      if (!path) throw new Error("Path is required");

      await FileManagerService.writeFile(
        serverId,
        path as string,
        content as string,
      );
      res.json({ success: true, message: "File saved successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
  public static async deleteItem(req: Request, res: Response) {
    try {
      const serverId = req.params.serverId as string;
      const path = req.query.path as string;
      if (!path) throw new Error("Path is required");

      await FileManagerService.deleteItem(serverId, path);
      res.json({ success: true, message: "Item deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public static async renameItem(req: Request, res: Response) {
    try {
      const serverId = req.params.serverId as string;
      const { oldPath, newName } = req.body;
      if (!oldPath || !newName)
        throw new Error("oldPath and newName are required");

      await FileManagerService.renameItem(
        serverId,
        oldPath as string,
        newName as string,
      );
      res.json({ success: true, message: "Item renamed successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public static async createDirectory(req: Request, res: Response) {
    try {
      const serverId = req.params.serverId as string;
      const { path } = req.body;
      if (!path) throw new Error("Path is required");

      await FileManagerService.createDirectory(serverId, path as string);
      res.json({ success: true, message: "Directory created successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
