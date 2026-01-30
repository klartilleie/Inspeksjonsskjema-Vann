if (email === "kundeservice@smarthjem.as") {
  // Denne koden MÅ kjøre for å opprette deg i databasen første gang
  user = await storage.createUser({
    id: req.oidc.user.sub,
    username: email,
    email: email,
    role: "admin"
  });
}
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth"; // Denne linjen er magisk
import { inspectionFormSchema } from "@shared/schema";
import { generateInspectionPDF } from "./pdfGenerator";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // 1. Dette aktiverer Auth0 og lager automatisk ruten /login
  await setupAuth(app);

  // 2. Koble Auth0-innloggingen din til Admin-rollen
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    if (req.oidc && req.oidc.user) {
      const email = req.oidc.user.email;
      let user = await storage.getUser(req.oidc.user.sub);

      // Automatisk Admin for din e-post
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

  // 3. Beskyttede data-ruter
  app.get("/api/inspections", isAuthenticated, async (req, res) => {
    const inspections = await storage.getAllInspections();
    res.json(inspections);
  });

  return httpServer;
}