import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { inspectionFormSchema, type Inspection } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateInspectionPDF } from "./pdfGenerator";
import { Resend } from "resend";

async function sendInspectionEmail(inspection: Inspection): Promise<boolean> {
  const resendApiKey = process.env.resend_API;
  if (!resendApiKey) return false;

  try {
    const resend = new Resend(resendApiKey);
    const emailContent = `Ny befaring mottatt fra ${inspection.customerName}.`;
    await resend.emails.send({
      from: "Befaringsskjema <onboarding@resend.dev>",
      to: ["kundeservice@smarthjem.as"],
      subject: `Nytt befaringsskjema - ${inspection.customerName}`,
      text: emailContent,
    });
    return true;
  } catch (error) {
    return false;
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // 1. Sett opp Auth0 (Håndterer /login, /logout og /callback)
  await setupAuth(app);

  // 2. Middleware som tvinger innlogging på ALLE ruter (siden dere ikke har forside)
  // Dette gjør at man blir sendt rett til Auth0 hvis man ikke er logget inn
  app.use((req, res, next) => {
    if (req.path === '/login' || req.path === '/callback' || req.path.startsWith('/api/public')) {
      return next();
    }
    isAuthenticated(req, res, next);
  });

  // 3. Auth0 Bruker-endepunkt med AUTO-ADMIN
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      if (req.oidc && req.oidc.user) {
        const userId = req.oidc.user.sub;
        let user = await storage.getUser(userId);

        // Auto-Admin sjekk
        if (req.oidc.user.email === "kundeservice@smarthjem.as") {
          if (!user) {
            user = await storage.createUser({
              id: userId,
              username: req.oidc.user.email,
              email: req.oidc.user.email,
              role: "admin"
            });
          }
        }
        return res.json(user || req.oidc.user);
      }
      res.status(401).json({ message: "Ikke autentisert" });
    } catch (error) {
      res.status(500).json({ message: "Feil ved henting av bruker" });
    }
  });

  // 4. Inspeksjons-ruter (Nå beskyttet av middleware over)
  app.post("/api/inspections", async (req, res) => {
    try {
      const validatedData = inspectionFormSchema.parse(req.body);
      const inspection = await storage.createInspection(validatedData);
      sendInspectionEmail(inspection);
      res.status(201).json(inspection);
    } catch (error) {
      res.status(400).json({ error: "Ugyldige data" });
    }
  });

  app.get("/api/inspections", async (req, res) => {
    const inspections = await storage.getAllInspections();
    res.json(inspections);
  });

  app.get("/api/inspections/:id/pdf", async (req, res) => {
    const inspection = await storage.getInspection(req.params.id);
    if (!inspection) return res.status(404).send();
    const doc = generateInspectionPDF(inspection);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);
    doc.end();
  });

  return httpServer;
}