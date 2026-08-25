import { Router } from "express";
import multer from "multer";
import fs from "fs-extra";
import { FileManagerController } from "../controllers/FileManager.controller.js";
import { BackupController } from "../controllers/Backup.controller.js";
import { FileManagerService } from "../services/FileManagerService.js";
import { installAddon } from "../controllers/addon.controller.js";
import {
  createServer,
  stopServer,
  restartServer,
  sendCommand,
} from "../controllers/server.controller.js";

const router = Router();

// --- MULTER CONFIGURATION FOR DIRECT-TO-DISK STREAMING ---
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const serverId = req.params.serverId as string;
      // The frontend should pass the target directory path in the form data
      const targetPath = (req.body.path as string) || "";

      // Use our existing security function to prevent Directory Traversal
      const absoluteDest = FileManagerService.resolveAndValidatePath(
        serverId,
        targetPath,
      );

      // Ensure the target folder exists before piping the file to it
      await fs.ensureDir(absoluteDest);
      cb(null, absoluteDest);
    } catch (err: any) {
      cb(err, "");
    }
  },
  filename: (req, file, cb) => {
    // Preserve the original filename of the uploaded file (e.g., world.zip, Paper-1.20.jar)
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

router.post("/", createServer);
router.post("/:containerId/stop", stopServer);
router.post("/:containerId/restart", restartServer); // <--- New Route
router.post("/:containerId/command", sendCommand);

// --- FILE MANAGER ROUTES ---
router.get("/:serverId/files", FileManagerController.listFiles);
router.get("/:serverId/files/read", FileManagerController.readFile);
router.post("/:serverId/files/write", FileManagerController.writeFile);

// New File Manager Routes
router.delete("/:serverId/files", FileManagerController.deleteItem);
router.put("/:serverId/files/rename", FileManagerController.renameItem);
router.post("/:serverId/files/folder", FileManagerController.createDirectory);

// Upload Route (Uses Multer middleware before hitting the final response)
router.post("/:serverId/files/upload", upload.array("files"), (req, res) => {
  // If we reach this point, Multer successfully streamed the files to the disk
  res.json({ success: true, message: "Files uploaded successfully" });
});

// --- BACKUP ROUTES ---
router.get("/:serverId/backups", BackupController.list);
router.post("/:serverId/backups", BackupController.create);
router.post("/:serverId/backups/:backupName/restore", BackupController.restore);

// --- ADDON INSTALLATION ROUTE ---
router.post("/:containerId/addons/install", installAddon);

export default router;
