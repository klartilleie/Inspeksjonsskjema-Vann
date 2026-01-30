import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { inspectionFormSchema } from "@shared/schema";
import { generateInspectionPDF } from "./pdfGenerator";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // 1. Aktiver Auth0-motoren (håndterer /login og /logout)
  await setupAuth(app);

  // 2. Bruker-endepunkt: Kobler Auth0-brukeren din til databasen som Admin
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    if (req.oidc && req.oidc.user) {
      const email = req.oidc.user.email;
      let user = await storage.getUser(req.oidc.user.sub);

      // Hvis det er din e-post, sørg for at du er registrert som admin i systemet
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

  // 3. Data-ruter (Alle er nå beskyttet av Auth0 via 'isAuthenticated')
  app.get("/api/inspections", isAuthenticated, async (req, res) => {
    const inspections = await storage.getAllInspections();
    res.json(inspections);
  });

  app.post("/api/inspections", async (req, res) => {
    const validatedData = inspectionFormSchema.parse(req.body);
    const inspection = await storage.createInspection(validatedData);
    res.status(201).json(inspection);
  });

  app.get("/api/inspections/:id/pdf", isAuthenticated, async (req, res) => {
    const inspection = await storage.getInspection(req.params.id);
    if (!inspection) return res.status(404).send();
    const doc = generateInspectionPDF(inspection);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);
    doc.end();
  });

  return httpServer;
}