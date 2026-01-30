import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth"; // Denne bruker express-openid-connect
import { inspectionFormSchema } from "@shared/schema";
import { generateInspectionPDF } from "./pdfGenerator";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // 1. Aktiver Auth0-motoren
  await setupAuth(app);

  // 2. Gjør din bruker til ADMIN automatisk ved innlogging
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    if (req.oidc && req.oidc.user) {
      const email = req.oidc.user.email;
      let user = await storage.getUser(req.oidc.user.sub);

      if (email === "kundeservice@smarthjem.as" && (!user || user.role !== "admin")) {
        user = await storage.createUser({
          id: req.oidc.user.sub,
          username: email,
          email: email,
          role: "admin"
        });
      }
      return res.json(user || req.oidc.user);
    }
    res.status(401).json({ message: "Ikke logget inn" });
  });

  // 3. Beskyttede ruter for data
  app.get("/api/inspections", isAuthenticated, async (req, res) => {
    const inspections = await storage.getAllInspections();
    res.json(inspections);
  });

  return httpServer;
}