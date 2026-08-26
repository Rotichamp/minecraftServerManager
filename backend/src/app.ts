import express from "express";
import serverRoutes from "./routes/server.routes.js";

const app = express();

app.use(express.json());

// Mount the routes
app.use("/api/servers", serverRoutes);

export default app;
