import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { inspectionFormSchema } from "@shared/schema";
import { generateInspectionPDF } from "./pdfGenerator";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // 1. Aktiver Auth0
  await setupAuth(app);

  // 2. Sjekk bruker og gi Admin-tilgang
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      if (req.oidc && req.oidc.isAuthenticated()) {
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
    } catch (error) {
      console.error("Auth-feil:", error);
      res.status(500).json({ message: "Serverfeil" });
    }
  });

  // 3. Beskyttede ruter
  app.get("/api/inspections", isAuthenticated, async (req, res) => {
    const inspections = await storage.getAllInspections();
    res.json(inspections);
  });

  return httpServer;
}
