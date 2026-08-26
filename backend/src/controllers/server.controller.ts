import { type Request, type Response } from "express";
import { DockerService } from "../services/DockerService.js";

const dockerService = new DockerService();

export const createServer = async (
  req: Request,
  res: Response,
): Promise<any> => {
  // Extract the new optional parameters
  const { serverId, serverPort, serverType, memoryMB, cpuCores } = req.body;

  if (!serverId || !serverPort) {
    return res
      .status(400)
      .json({ error: "serverId and serverPort are required" });
  }

  try {
    console.log(
      `[API] Spawning server: ${serverId} (RAM: ${memoryMB || "Unrestricted"}, CPU: ${cpuCores || "Unrestricted"})`,
    );

    const containerId = await dockerService.createMinecraftServer(
      serverId,
      serverPort,
      serverType || "PAPER",
      memoryMB,
      cpuCores,
    );

    await dockerService.startServer(containerId);

    return res.status(201).json({
      message: "Server created and started",
      serverId,
      containerId,
      port: serverPort,
    });
  } catch (error) {
    console.error("[API] Error creating server:", error);
    return res.status(500).json({ error: "Failed to create and start server" });
  }
};

// Add the new restart controller
export const restartServer = async (
  req: Request,
  res: Response,
): Promise<any> => {
  const containerIdParam = req.params.containerId;
  const containerId = Array.isArray(containerIdParam)
    ? containerIdParam[0]
    : containerIdParam;

  if (!containerId) {
    return res.status(400).json({ error: "containerId is required" });
  }

  try {
    await dockerService.restartServer(containerId);
    return res.json({
      message: `Server ${containerId} restarted successfully.`,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to restart server" });
  }
};

export const stopServer = async (req: Request, res: Response): Promise<any> => {
  const containerIdParam = req.params.containerId;
  const containerId = Array.isArray(containerIdParam)
    ? containerIdParam[0]
    : containerIdParam;

  if (!containerId) {
    return res.status(400).json({ error: "containerId is required" });
  }

  try {
    console.log(`[API] Request to stop container: ${containerId}`);
    await dockerService.stopServer(containerId);
    return res.json({ message: `Server ${containerId} stopped.` });
  } catch (error) {
    console.error("[API] Error stopping server:", error);
    return res.status(500).json({ error: "Failed to stop server" });
  }
};

export const sendCommand = async (
  req: Request,
  res: Response,
): Promise<any> => {
  const containerIdParam = req.params.containerId;
  const containerId = Array.isArray(containerIdParam)
    ? containerIdParam[0]
    : containerIdParam;
  const { command } = req.body;

  if (!containerId) {
    return res.status(400).json({ error: "containerId is required" });
  }

  if (!command) {
    return res.status(400).json({ error: "Command is required" });
  }

  try {
    console.log(`[API] Sending command to ${containerId}: ${command}`);

    // Strip the leading slash if the user provided one (rcon doesn't need it)
    const cleanCommand = command.startsWith("/") ? command.slice(1) : command;

    const output = await dockerService.sendCommand(containerId, cleanCommand);

    return res.json({
      message: "Command executed successfully",
      output,
    });
  } catch (error) {
    console.error("[API] Error executing command:", error);
    return res.status(500).json({ error: "Failed to execute command" });
  }
};
