import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { adminCreateUser } from "./routes/admin-create-user";
import { getVisibleAlerts } from "./routes/visible-alerts";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Public visible alerts (org or user/team filters)
  app.get("/api/visible-alerts", getVisibleAlerts);

  // Admin routes
  app.post("/api/admin/users", adminCreateUser);

  return app;
}
