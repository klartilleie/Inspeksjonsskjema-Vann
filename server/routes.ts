import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { inspectionFormSchema, loginSchema, registerUserSchema, type Inspection } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateInspectionPDF } from "./pdfGenerator";
import crypto from "crypto";
import nodemailer from "nodemailer";

async function sendInspectionEmail(inspection: Inspection): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log("SMTP not configured, skipping email notification");
    return false;
  }
  
  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    
    const mapMarkers = inspection.mapMarkers as Array<{id: string, type: string, position: [number, number]}> || [];
    const markersList = mapMarkers.map(m => {
      const label = m.type === "biocleaner" ? "Biocleaner" : m.type === "slamavskiller" ? "Slamavskiller" : "Utslippspunkt";
      return `- ${label}: ${m.position[0].toFixed(6)}, ${m.position[1].toFixed(6)}`;
    }).join("\n");
    
    const emailContent = `
Nytt befaringsskjema mottatt!

KUNDEINFORMASJON:
- Kunde: ${inspection.customerName}
- Adresse: ${inspection.customerAddress}
- E-post: ${inspection.customerEmail}
- Telefon: ${inspection.customerPhone}
- Befaring: ${inspection.inspectionDateTime}
- Utfylt av: ${inspection.reportFilledBy}

AVLØPSLØSNING:
- Eksisterende løsning: ${inspection.existingDrainageSolution}
- Planlagt løsningstype: ${inspection.plannedSolutionType}
- Planlagt plassering: ${inspection.plannedPlacement}

FROSTBESKYTTELSE:
- Naturlig frostfritt: ${inspection.isNaturallyFrostFree}
- Frostsikringstiltak: ${inspection.frostProtectionMeasure}
${inspection.frostProtectionComments ? `- Kommentar: ${inspection.frostProtectionComments}` : ""}

TEKNISK TILKOBLING:
- Trenger elektriker: ${inspection.needsElectrician}
- Strømpunkt i nærheten: ${inspection.hasNearbyPowerPoint}
- Trenger rørlegger: ${inspection.needsPlumber}
${inspection.technicalConnectionComments ? `- Kommentar: ${inspection.technicalConnectionComments}` : ""}

PLASSERINGSMARKØRER:
${markersList || "Ingen markører plassert"}
${inspection.mapNotes ? `\nNotat til plasseringstegning: ${inspection.mapNotes}` : ""}

BILDER:
- Antall bilder: ${inspection.imageCount}

${inspection.logisticsComments ? `LOGISTIKK:\n${inspection.logisticsComments}` : ""}

---
Dette er en automatisk generert e-post fra befaringsskjema-systemet.
    `;
    
    await transporter.sendMail({
      from: smtpUser,
      to: "kundeservice@smarthjem.as",
      subject: `Nytt befaringsskjema - ${inspection.customerName}`,
      text: emailContent,
    });
    
    console.log("Email notification sent successfully");
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function isAppAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && (req.session as any).appUserId) {
    next();
  } else {
    res.status(401).json({ error: "Ikke logget inn" });
  }
}

function isAppAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session && (req.session as any).appUserRole === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Ingen tilgang" });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);

  // App user login
  app.post("/api/app/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.getAppUserByUsername(username);
      
      if (!user || user.password !== hashPassword(password)) {
        return res.status(401).json({ error: "Ugyldig brukernavn eller passord" });
      }
      
      (req.session as any).appUserId = user.id;
      (req.session as any).appUserRole = user.role;
      (req.session as any).appUserFullName = user.fullName;
      
      res.json({ 
        id: user.id, 
        username: user.username, 
        fullName: user.fullName, 
        role: user.role 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ error: "Ugyldig innlogging" });
    }
  });

  app.post("/api/app/logout", (req, res) => {
    (req.session as any).appUserId = null;
    (req.session as any).appUserRole = null;
    (req.session as any).appUserFullName = null;
    res.json({ success: true });
  });

  app.get("/api/app/me", isAppAuthenticated, async (req, res) => {
    try {
      const user = await storage.getAppUserById((req.session as any).appUserId);
      if (!user) {
        return res.status(404).json({ error: "Bruker ikke funnet" });
      }
      res.json({ 
        id: user.id, 
        username: user.username, 
        fullName: user.fullName, 
        role: user.role 
      });
    } catch (error) {
      console.error("Error fetching app user:", error);
      res.status(500).json({ error: "Kunne ikke hente bruker" });
    }
  });

  // Admin: Manage app users
  app.get("/api/app/users", isAppAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const users = await storage.getAllAppUsers();
      res.json(users.map(u => ({ 
        id: u.id, 
        username: u.username, 
        fullName: u.fullName, 
        role: u.role,
        createdAt: u.createdAt
      })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Kunne ikke hente brukere" });
    }
  });

  app.post("/api/app/users", isAppAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const data = registerUserSchema.parse(req.body);
      
      const existing = await storage.getAppUserByUsername(data.username);
      if (existing) {
        return res.status(400).json({ error: "Brukernavn er allerede i bruk" });
      }
      
      const user = await storage.createAppUser({
        username: data.username,
        password: hashPassword(data.password),
        fullName: data.fullName,
        role: data.role,
      });
      
      res.status(201).json({ 
        id: user.id, 
        username: user.username, 
        fullName: user.fullName, 
        role: user.role 
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ error: "Kunne ikke opprette bruker" });
    }
  });

  app.delete("/api/app/users/:id", isAppAuthenticated, isAppAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteAppUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Bruker ikke funnet" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Kunne ikke slette bruker" });
    }
  });

  // Setup endpoint - creates first admin if no users exist
  app.post("/api/app/setup", async (req, res) => {
    try {
      const users = await storage.getAllAppUsers();
      if (users.length > 0) {
        return res.status(400).json({ error: "Oppsett allerede fullført. Brukere finnes allerede." });
      }
      
      const data = registerUserSchema.parse({ ...req.body, role: "admin" });
      
      const user = await storage.createAppUser({
        username: data.username,
        password: hashPassword(data.password),
        fullName: data.fullName,
        role: "admin",
      });
      
      (req.session as any).appUserId = user.id;
      (req.session as any).appUserRole = user.role;
      (req.session as any).appUserFullName = user.fullName;
      
      res.status(201).json({ 
        id: user.id, 
        username: user.username, 
        fullName: user.fullName, 
        role: user.role 
      });
    } catch (error) {
      console.error("Error in setup:", error);
      res.status(400).json({ error: "Kunne ikke opprette admin-bruker" });
    }
  });

  // Check if setup is needed
  app.get("/api/app/setup-status", async (req, res) => {
    try {
      const users = await storage.getAllAppUsers();
      res.json({ needsSetup: users.length === 0 });
    } catch (error) {
      console.error("Error checking setup status:", error);
      res.status(500).json({ error: "Kunne ikke sjekke status" });
    }
  });

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/uploaded-images", async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.imageURL
      );
      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error processing uploaded image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/inspections", async (req, res) => {
    try {
      const validatedData = inspectionFormSchema.parse(req.body);
      const inspection = await storage.createInspection(validatedData);
      
      sendInspectionEmail(inspection).catch(err => {
        console.error("Email sending failed:", err);
      });
      
      res.status(201).json(inspection);
    } catch (error) {
      console.error("Error creating inspection:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid form data", details: error });
      }
      res.status(500).json({ error: "Failed to save inspection" });
    }
  });

  app.get("/api/inspections", isAuthenticated, async (req, res) => {
    try {
      const inspections = await storage.getAllInspections();
      res.json(inspections);
    } catch (error) {
      console.error("Error fetching inspections:", error);
      res.status(500).json({ error: "Failed to fetch inspections" });
    }
  });

  app.get("/api/inspections/:id", isAuthenticated, async (req, res) => {
    try {
      const inspection = await storage.getInspection(req.params.id);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      res.json(inspection);
    } catch (error) {
      console.error("Error fetching inspection:", error);
      res.status(500).json({ error: "Failed to fetch inspection" });
    }
  });

  app.delete("/api/inspections/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteInspection(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting inspection:", error);
      res.status(500).json({ error: "Failed to delete inspection" });
    }
  });

  app.get("/api/inspections/:id/pdf", isAuthenticated, async (req, res) => {
    try {
      const inspection = await storage.getInspection(req.params.id);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }

      const doc = generateInspectionPDF(inspection);
      
      const filename = `befaring-${inspection.customerName.replace(/\s+/g, "-").toLowerCase()}-${inspection.id.slice(0, 8)}.pdf`;
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  return httpServer;
}
