import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { adminCreateUser } from "./routes/admin-create-user";
import { getVisibleAlerts } from "./routes/visible-alerts";
import { seedTestOrgAlert } from "./routes/seed-test";

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

  // Debug/seed: create a test org alert
  app.get("/api/seed-test-alert", seedTestOrgAlert);

  // Admin routes
  app.post("/api/admin/users", adminCreateUser);

  return app;
}
