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
  // 1. AUTO-OPPRETT ADMIN (Kjører hver gang serveren starter)
  async function ensureAdminExists() {
    const adminUsername = "kundeservice@smarthjem.as";
    const existingUser = await storage.getAppUserByUsername(adminUsername);

    if (!existingUser) {
      console.log("Oppretter standard admin-bruker på Render...");
      await storage.createAppUser({
        username: adminUsername,
        password: hashPassword("Admin2026"),
        fullName: "Admin",
        role: "admin"
      });
      console.log("Admin-bruker opprettet suksessfullt.");
    }
  }

  ensureAdminExists().catch(console.error);

  // 2. Sett opp Auth0-konfigurasjon
  await setupAuth(app);

  // 3. LOGGINN-LOGIKK (For din hvite logginn-skjerm)
  app.post("/api/app/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.getAppUserByUsername(username);

      if (!user || user.password !== hashPassword(password)) {
        return res.status(401).json({ error: "Ugyldig brukernavn eller passord" });
      }

      (req.session as any).appUserId = user.id;
      (req.session as any).appUserRole = user.role;

      res.json({ id: user.id, username: user.username, role: user.role });
    } catch (error) {
      res.status(400).json({ error: "Ugyldig forespørsel" });
    }
  });

  // 4. Brukersjekk (Brukes av frontend for å se om man er logget inn)
  app.get("/api/auth/user", (req: any, res) => {
    if ((req.session as any).appUserId) {
      return res.json({ 
        id: (req.session as any).appUserId, 
        role: (req.session as any).appUserRole,
        username: "kundeservice@smarthjem.as" 
      });
    }
    res.status(401).json({ message: "Ikke logget inn" });
  });

  // 5. Beskyttede ruter
  app.get("/api/inspections", async (req, res) => {
    if (!(req.session as any).appUserId) {
      return res.status(401).send("Logg inn først");
    }
    const inspections = await storage.getAllInspections();
    res.json(inspections);
  });

  return httpServer;
}