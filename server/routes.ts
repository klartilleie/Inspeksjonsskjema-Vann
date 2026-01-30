import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { inspectionFormSchema, loginSchema, registerUserSchema, type Inspection } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateInspectionPDF } from "./pdfGenerator";
import crypto from "crypto";
import { Resend } from "resend";

async function sendInspectionEmail(inspection: Inspection): Promise<boolean> {
  const resendApiKey = process.env.resend_API;

  if (!resendApiKey) {
    console.log("Resend API key not configured, skipping email notification");
    return false;
  }

  try {
    const resend = new Resend(resendApiKey);

    const mapMarkers = inspection.mapMarkers as Array<{id: string, type: string, position: [number, number]}> || [];
    const markersList = mapMarkers.map(m => {
      const label = m.type === "biocleaner" ? "Biocleaner" : m.type === "slamavskiller" ? "Slamavskiller" : "Utslippspunkt";
      return `- ${label}: ${m.position[0].toFixed(6)}, ${m.position[1].toFixed(6)}`;
    }).join("\n");

    const formatPrice = (price: number | null | undefined) => 
      price ? `kr ${price.toLocaleString("nb-NO")},-` : "kr 0,-";

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
${inspection.mapNotes ? `\nNotat til plasseringstegning: ${
  mapNotes}` : ""}

  BILDER:
  - Antall bilder: ${inspection.imageCount}

  ${inspection.logisticsComments ? `LOGISTIKK:\n${inspection.logisticsComments}` : ""}

  TILBUD PÅ BIOCLEANER RENSEANLEGG:
  ${inspection.biocleanerModel ? `- Biocleaner-modell: ${inspection.biocleanerModel}` : ""}
  ${inspection.numberOfHomes ? `- Antall boliger/hytter: ${inspection.numberOfHomes}` : ""}
  - Biocleaner renseanlegg: ${formatPrice(inspection.biocleanerPrice)}
  - Styreskap: ${formatPrice(inspection.styreskapPrice)}
  - Søknad om utslipp: ${formatPrice(inspection.soknadUtslippPrice)}
  - Søknad om dispensasjon: ${formatPrice(inspection.soknadDispensasjonPrice)}
  - Innregulering/oppstart/montering: ${formatPrice(inspection.innreguleringPrice)}
  - Graving med singel: ${formatPrice(inspection.gravingPrice)}
  - Frakt: ${formatPrice(inspection.fraktPrice)}
  ----------------------------------------
  - Sum: ${formatPrice(inspection.offerSum)}
  - Mva (25%): ${formatPrice(inspection.offerMva)}
  - TOTAL: ${formatPrice(inspection.offerTotal)}
  ${inspection.offerComments ? `\nKommentarer til tilbudet:\n${inspection.offerComments}` : ""}

  ---
  Dette er en automatisk generert e-post fra befaringsskjema-systemet.
      `;

      await resend.emails.send({
        from: "Befaringsskjema <onboarding@resend.dev>",
        to: ["kundeservice@smarthjem.as"],
        subject: `Nytt befaringsskjema - ${inspection.customerName}`,
        text: emailContent,
      });

      console.log("Email notification sent successfully via Resend");
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
        res.json({ id: user.id, username: user.username, fullName: user.fullName, role: user.role });
      } catch (error) {
        res.status(400).json({ error: "Ugyldig innlogging" });
      }
    });

    app.post("/api/app/logout", (req, res) => {
      (req.session as any).appUserId = null;
      res.json({ success: true });
    });

    app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
      try {
        if (req.oidc && req.oidc.user) {
          const userId = req.oidc.user.sub;
          const user = await storage.getUser(userId);
          return res.json(user || req.oidc.user);
        }
        res.status(401).json({ message: "Not authenticated" });
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch user" });
      }
    });

    app.post("/api/inspections", async (req, res) => {
      try {
        const validatedData = inspectionFormSchema.parse(req.body);
        const inspection = await storage.createInspection(validatedData);
        sendInspectionEmail(inspection).catch(err => console.error(err));
        res.status(201).json(inspection);
      } catch (error) {
        res.status(400).json({ error: "Invalid form data" });
      }
    });

    app.get("/api/inspections", isAuthenticated, async (req, res) => {
      const inspections = await storage.getAllInspections();
      res.json(inspections);
    });

    app.get("/api/inspections/:id/pdf", isAuthenticated, async (req, res) => {
      try {
        const inspection = await storage.getInspection(req.params.id);
        if (!inspection) return res.status(404).send();
        const doc = generateInspectionPDF(inspection);
        res.setHeader("Content-Type", "application/pdf");
        doc.pipe(res);
        doc.end();
      } catch (error) {
        res.status(500).send();
      }
    });

    return httpServer;
  }