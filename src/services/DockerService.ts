import Docker from "dockerode";

export class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker({ socketPath: "/var/run/docker.sock" });
  }

  /**
   * Pulls a Docker image programmatically
   */
  async pullImage(imageName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(
        `Checking/Pulling image ${imageName}. This might take a minute...`,
      );
      this.docker.pull(imageName, (err: any, stream: any) => {
        if (err) return reject(err);

        // Dockerode requires us to follow the progress stream to know when it's done
        this.docker.modem.followProgress(stream, (err: any, output: any) => {
          if (err) return reject(err);
          console.log(`Successfully pulled ${imageName}`);
          resolve();
        });
      });
    });
  }

  /**
   * Creates a new Minecraft server container with optional resource limits
   */
  async createMinecraftServer(
    serverId: string,
    hostPort: number,
    serverType: string = "PAPER",
    memoryMB?: number, // e.g., 2048 for 2GB
    cpuCores?: number, // e.g., 2 for 2 cores
  ) {
    const image = "itzg/minecraft-server:latest";
    await this.pullImage(image);
    console.log(`Creating server ${serverId} on port ${hostPort}...`);

    // Define resource limits if provided, otherwise leave unrestricted
    const hostConfig: any = {
      PortBindings: {
        "25565/tcp": [{ HostPort: hostPort.toString() }],
      },
      Binds: [`mc-data-${serverId}:/data`],
    };

    if (memoryMB) {
      // Docker expects memory in bytes
      hostConfig.Memory = memoryMB * 1024 * 1024;
      // Swap limit (Memory + Swap). Setting it same as Memory disables swap.
      hostConfig.MemorySwap = memoryMB * 1024 * 1024;
    }

    if (cpuCores) {
      // Docker expects CPU in NanoCPUs (1 core = 1,000,000,000)
      hostConfig.NanoCPUs = cpuCores * 1000000000;
    }

    try {
      const container = await this.docker.createContainer({
        Image: image,
        name: `mc-${serverId}`,
        Env: [
          "EULA=TRUE",
          `TYPE=${serverType}`,
          // Tell Java to respect the Docker memory limits
          memoryMB ? `MEMORY=${memoryMB}M` : "",
        ].filter(Boolean),
        HostConfig: hostConfig,
        ExposedPorts: {
          "25565/tcp": {},
        },
      });

      return container.id;
    } catch (error) {
      console.error("Failed to create container:", error);
      throw error;
    }
  }

  /**
   * Starts an existing container
   */
  async startServer(containerId: string) {
    try {
      const container = this.docker.getContainer(containerId);
      await container.start();
      console.log(`Server ${containerId} started successfully.`);
    } catch (error) {
      console.error(`Failed to start server ${containerId}:`, error);
      throw error;
    }
  }

  /**
   * Stops a running container
   */
  async stopServer(containerId: string) {
    try {
      const container = this.docker.getContainer(containerId);
      // Gives the server 10 seconds to shut down gracefully before killing it
      await container.stop({ t: 10 });
      console.log(`Server ${containerId} stopped.`);
    } catch (error) {
      console.error(`Failed to stop server ${containerId}:`, error);
      throw error;
    }
  }

  /**
   * Restarts a running container gracefully
   */
  async restartServer(containerId: string) {
    try {
      const container = this.docker.getContainer(containerId);
      // 10 second timeout for graceful shutdown before force kill
      await container.restart({ t: 10 });
      console.log(`Server ${containerId} restarted.`);
    } catch (error) {
      console.error(`Failed to restart server ${containerId}:`, error);
      throw error;
    }
  }

  /**
   * Streams live console logs for a specific container
   */
  async streamConsole(containerId: string, onData: (chunk: string) => void) {
    try {
      const container = this.docker.getContainer(containerId);

      // Grab the last 50 lines immediately, then follow new output
      const stream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 50,
      });

      stream.on("data", (chunk: Buffer) => {
        // Docker attaches an 8-byte header to multiplex stdout/stderr.
        // A quick regex cleans up non-printable characters so the console looks clean.
        const log = chunk
          .toString("utf8")
          .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, "");

        if (log.trim()) {
          onData(log);
        }
      });

      stream.on("end", () => {
        onData("\n[Server Stream Disconnected]\n");
      });
    } catch (error) {
      console.error(`Failed to stream logs for ${containerId}:`, error);
      onData(`\n[Error: Could not attach to server console]\n`);
    }
  }

  /**
   * Sends a command to the Minecraft server console via rcon-cli
   */
  async sendCommand(containerId: string, command: string): Promise<string> {
    try {
      const container = this.docker.getContainer(containerId);

      // Create an exec instance inside the running container
      const exec = await container.exec({
        Cmd: ["rcon-cli", command],
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });

      // Start the exec instance
      const stream = await exec.start({ Detach: false, Tty: false });

      // Collect the output from the command (e.g., "Opped PlayerName")
      return await new Promise((resolve, reject) => {
        let output = "";

        stream.on("data", (chunk: Buffer) => {
          // Clean up Docker's multiplexing headers just like we did for logs
          output += chunk
            .toString("utf8")
            .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, "");
        });

        stream.on("end", () => resolve(output.trim()));
        stream.on("error", (err: any) => reject(err));
      });
    } catch (error) {
      console.error(`Failed to send command to ${containerId}:`, error);
      throw error;
    }
  }

  /**
   * Streams live CPU and Memory stats for a container
   */
  async streamStats(containerId: string, onData: (stats: any) => void) {
    try {
      const container = this.docker.getContainer(containerId);

      // Get the container info to calculate uptime
      const inspectData = await container.inspect();
      const startedAt = inspectData.State.StartedAt;

      // Attach to the live stats stream
      const stream = await container.stats({ stream: true });

      stream.on("data", (chunk: Buffer) => {
        try {
          const rawStats = JSON.parse(chunk.toString("utf8"));

          // --- Calculate Memory % ---
          const memoryUsage = rawStats.memory_stats.usage || 0;
          const memoryLimit = rawStats.memory_stats.limit || 1;
          const memoryPercent = ((memoryUsage / memoryLimit) * 100).toFixed(2);
          const memoryMb = (memoryUsage / 1024 / 1024).toFixed(2);

          // --- Calculate CPU % ---
          let cpuPercent = 0.0;
          const cpuDelta =
            rawStats.cpu_stats.cpu_usage.total_usage -
            (rawStats.precpu_stats.cpu_usage.total_usage || 0);
          const systemDelta =
            rawStats.cpu_stats.system_cpu_usage -
            (rawStats.precpu_stats.system_cpu_usage || 0);

          if (systemDelta > 0 && cpuDelta > 0) {
            const cores = rawStats.cpu_stats.online_cpus || 1;
            cpuPercent = parseFloat(
              ((cpuDelta / systemDelta) * cores * 100).toFixed(2),
            );
          }

          // --- Calculate Uptime ---
          // The frontend can use this timestamp to show a running "02:15:30" timer

          // Emit the clean, processed data
          onData({
            cpuPercent,
            memoryPercent,
            memoryMb,
            startedAt,
            status: rawStats.name ? "running" : "offline",
          });
        } catch (e) {
          // Docker sometimes sends fragmented JSON chunks; we can safely ignore the fragments
        }
      });

      stream.on("end", () =>
        onData({ status: "offline", cpuPercent: 0, memoryPercent: 0 }),
      );
    } catch (error) {
      console.error(`Failed to stream stats for ${containerId}:`, error);
    }
  }
}
