import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./replitAuth";
import { v2 as cloudinary } from 'cloudinary';
import { Resend } from 'resend';

// Konfigurer Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Konfigurer Resend for e-post
const resend = new Resend(process.env.resend_API);

async function sendNotificationEmail(inspection: any) {
  try {
    await resend.emails.send({
      from: 'Befaringsskjema <onboarding@resend.dev>',
      to: ['kundeservice@smarthjem.as'],
      subject: `Nytt befaringsskjema: ${inspection.customerName}`,
      html: `
        <h2>Nytt befaringsskjema mottatt</h2>
        <p><strong>Kunde:</strong> ${inspection.customerName}</p>
        <p><strong>Adresse:</strong> ${inspection.customerAddress}</p>
        <p><strong>E-post:</strong> ${inspection.customerEmail}</p>
        <p><strong>Telefon:</strong> ${inspection.customerPhone}</p>
        <p><strong>Utfylt av:</strong> ${inspection.reportFilledBy}</p>
        <p><strong>Dato:</strong> ${inspection.inspectionDateTime}</p>
        <p><strong>Antall bilder:</strong> ${inspection.imagePaths?.length || 0}</p>
        ${inspection.offerTotal ? `<p><strong>Tilbud totalt:</strong> kr ${inspection.offerTotal.toLocaleString('nb-NO')},-</p>` : ''}
        <hr>
        <p>Se hele skjemaet i <a href="${process.env.AUTH0_BASE_URL || 'https://inspeksjonsskjema-vann.onrender.com'}/admin">admin-panelet</a>.</p>
      `,
    });
    console.log('E-postvarsel sendt til kundeservice@smarthjem.as');
  } catch (error) {
    console.error('Feil ved sending av e-post:', error);
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await setupAuth(app);

  // Rute for bildeopplasting til Cloudinary
  app.post("/api/upload", async (req, res) => {
    try {
      const { data } = req.body;
      if (!data) return res.status(400).json({ message: "Ingen bildedata mottatt" });

      const uploadResponse = await cloudinary.uploader.upload(data, {
        folder: "befaringer",
      });

      res.json({ url: uploadResponse.secure_url });
    } catch (error) {
      console.error("Cloudinary error:", error);
      res.status(500).json({ message: "Feil ved bildeopplasting" });
    }
  });

  // Bruker-rute for Auth0
  app.get(["/api/auth/user", "/api/app/me"], async (req: any, res) => {
    try {
      if (req.oidc && req.oidc.isAuthenticated()) {
        const auth0User = req.oidc.user;
        return res.json({
          id: auth0User.sub,
          username: auth0User.email,
          email: auth0User.email,
          fullName: auth0User.name || auth0User.email,
          role: "admin"
        });
      }
      res.status(401).json({ error: "Ikke logget inn" });
    } catch (error) {
      res.status(500).json({ error: "Serverfeil" });
    }
  });

  // Opprett ny inspeksjon
  app.post("/api/inspections", async (req: any, res) => {
    try {
      // Konverter prisfelt til tall
      const data = {
        ...req.body,
        biocleanerPrice: req.body.biocleanerPrice ? Number(req.body.biocleanerPrice) : null,
        styreskapPrice: req.body.styreskapPrice ? Number(req.body.styreskapPrice) : null,
        soknadUtslippPrice: req.body.soknadUtslippPrice ? Number(req.body.soknadUtslippPrice) : null,
        soknadDispensasjonPrice: req.body.soknadDispensasjonPrice ? Number(req.body.soknadDispensasjonPrice) : null,
        innreguleringPrice: req.body.innreguleringPrice ? Number(req.body.innreguleringPrice) : null,
        gravingPrice: req.body.gravingPrice ? Number(req.body.gravingPrice) : null,
        fraktPrice: req.body.fraktPrice ? Number(req.body.fraktPrice) : null,
        offerSum: req.body.offerSum ? Number(req.body.offerSum) : null,
        offerMva: req.body.offerMva ? Number(req.body.offerMva) : null,
        offerTotal: req.body.offerTotal ? Number(req.body.offerTotal) : null,
        imageCount: Number(req.body.imageCount) || 0,
      };
      
      const inspection = await storage.createInspection(data);
      
      // Send e-postvarsel til kundeservice
      sendNotificationEmail(inspection);
      
      res.status(201).json(inspection);
    } catch (error: any) {
      console.error("Feil ved opprettelse av inspeksjon:", error?.message || error);
      console.error("Stack:", error?.stack);
      res.status(500).json({ error: "Kunne ikke opprette inspeksjon", details: error?.message });
    }
  });

  // Hent alle inspeksjoner
  app.get("/api/inspections", async (req, res) => {
    try {
      const allInspections = await storage.getAllInspections();
      res.json(allInspections);
    } catch (error) {
      console.error("Feil ved henting av inspeksjoner:", error);
      res.status(500).json({ error: "Kunne ikke hente inspeksjoner" });
    }
  });

  // Hent en spesifikk inspeksjon
  app.get("/api/inspections/:id", async (req, res) => {
    try {
      const inspection = await storage.getInspection(req.params.id);
      if (!inspection) {
        return res.status(404).json({ error: "Inspeksjon ikke funnet" });
      }
      res.json(inspection);
    } catch (error) {
      console.error("Feil ved henting av inspeksjon:", error);
      res.status(500).json({ error: "Kunne ikke hente inspeksjon" });
    }
  });

  // Slett en inspeksjon
  app.delete("/api/inspections/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInspection(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Inspeksjon ikke funnet" });
      }
      res.json({ message: "Inspeksjon slettet" });
    } catch (error) {
      console.error("Feil ved sletting av inspeksjon:", error);
      res.status(500).json({ error: "Kunne ikke slette inspeksjon" });
    }
  });

  return httpServer;
}
