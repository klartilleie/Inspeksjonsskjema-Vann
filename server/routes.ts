import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { inspectionFormSchema, loginSchema, type Inspection } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateInspectionPDF } from "./pdfGenerator";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // 1. Sett opp autentisering (Auth0 kobles på her)
  await setupAuth(app);

  // 2. LOGGINN-LOGIKK (For din spesielle skjerm i bilde image_2f1e65.png)
  app.post("/api/app/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.getAppUserByUsername(username);

      if (!user || user.password !== hashPassword(password)) {
        return res.status(401).json({ error: "Ugyldig brukernavn eller passord" });
      }

      // Lagre sesjon manuelt for din egen logginn-skjerm
      (req.session as any).appUserId = user.id;
      (req.session as any).appUserRole = user.role;

      res.json({ id: user.id, username: user.username, role: user.role });
    } catch (error) {
      res.status(400).json({ error: "Ugyldig forespørsel" });
    }
  });

  // 3. Sjekk om bruker er logget inn (brukes av din frontend)
  app.get("/api/auth/user", (req: any, res) => {
    // Sjekker både Auth0 og din manuelle sesjon
    if ((req.session as any).appUserId) {
      return res.json({ id: (req.session as any).appUserId, role: (req.session as any).appUserRole });
    }

    if (req.oidc && req.oidc.isAuthenticated()) {
      return res.json(req.oidc.user);
    }

    res.status(401).json({ message: "Ikke logget inn" });
  });

  // 4. API-ruter for inspeksjoner (Beskyttet)
  app.get("/api/inspections", async (req, res) => {
    // Tvinger sjekk før man får se data
    if (!(req.session as any).appUserId && !(req.oidc && req.oidc.isAuthenticated())) {
      return res.status(401).send("Logg inn først");
    }
    const inspections = await storage.getAllInspections();
    res.json(inspections);
  });

  return httpServer;
}