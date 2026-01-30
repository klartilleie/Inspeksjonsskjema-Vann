import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { inspectionFormSchema } from "@shared/schema";
import { generateInspectionPDF } from "./pdfGenerator";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // 1. Dette aktiverer Auth0-motoren
  await setupAuth(app);

  // 2. Bruker-sjekk: Kobler Auth0 til din Admin-rolle i databasen
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      if (req.oidc && req.oidc.user) {
        const email = req.oidc.user.email;
        let user = await storage.getUser(req.oidc.user.sub);

        // Hvis du er admin-brukeren, oppretter vi deg i databasen hvis du ikke finnes
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
      res.status(500).json({ message: "Feil ved henting av bruker" });
    }
  });

  // 3. Data-rute: Henter listen over alle befaringer
  app.get("/api/inspections", isAuthenticated, async (req, res) => {
    const inspections = await storage.getAllInspections();
    res.json(inspections);
  });

  return httpServer;
}