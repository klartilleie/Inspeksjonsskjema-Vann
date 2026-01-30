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
  // 1. AUTO-ADMIN: Sikrer at brukeren finnes med riktig hashet passord
  async function ensureAdminExists() {
    const adminEmail = "kundeservice@smarthjem.as";
    const user = await storage.getAppUserByUsername(adminEmail);
    const targetHash = hashPassword("Admin2026");

    if (!user) {
      await storage.createAppUser({
        username: adminEmail,
        password: targetHash,
        fullName: "Admin",
        role: "admin"
      });
      console.log("Admin opprettet på nytt.");
    } else if (user.password !== targetHash) {
      // Oppdaterer passordet hvis det er feil hash i databasen
      console.log("Oppdaterer admin-passord...");
      await storage.updateAppUserPassword(user.id, targetHash);
    }
  }

  ensureAdminExists().catch(console.error);
  await setupAuth(app);

  // 2. FORBEDRET LOGGINN-RUTE
  app.post("/api/app/login", async (req, res) => {
    try {
      // Vi logger hva som kommer inn for å feilsøke (du ser dette i Render-loggen)
      console.log("Innloggingsforsøk for:", req.body.username);

      const { username, password } = req.body;
      const user = await storage.getAppUserByUsername(username);

      if (!user) {
        console.log("Bruker ikke funnet i databasen.");
        return res.status(401).json({ error: "Ugyldig brukernavn" });
      }

      const submittedHash = hashPassword(password);
      if (user.password !== submittedHash) {
        console.log("Passord-match feilet.");
        return res.status(401).json({ error: "Ugyldig passord" });
      }

      (req.session as any).appUserId = user.id;
      (req.session as any).appUserRole = user.role;

      console.log("Innlogging vellykket for:", username);
      res.json({ id: user.id, username: user.username, role: user.role });
    } catch (error) {
      console.error("Logginn-error:", error);
      res.status(500).json({ error: "Serverfeil ved innlogging" });
    }
  });

  app.get("/api/auth/user", (req: any, res) => {
    if ((req.session as any).appUserId) {
      return res.json({ id: (req.session as any).appUserId, role: (req.session as any).appUserRole });
    }
    res.status(401).json({ message: "Ikke logget inn" });
  });

  app.get("/api/inspections", async (req, res) => {
    if (!(req.session as any).appUserId) return res.status(401).send("Logg inn først");
    const inspections = await storage.getAllInspections();
    res.json(inspections);
  });

  return httpServer;
}