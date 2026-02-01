import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./replitAuth";
import { v2 as cloudinary } from 'cloudinary';
import { Resend } from 'resend';
import { generateInspectionPDF } from "./pdfGenerator";

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
      from: 'Befaringsskjema <noreply@klartilleie.no>',
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

async function sendCustomerOfferEmail(inspection: any) {
  if (!inspection.customerEmail) {
    console.log('Ingen kunde-e-post oppgitt, hopper over kunde-e-post');
    return;
  }

  try {
    const formatPrice = (price: number | null | undefined) => {
      if (!price) return '';
      return `kr ${price.toLocaleString('nb-NO')},-`;
    };

    let priceDetailsHtml = '';
    
    if (inspection.biocleanerModel && inspection.biocleanerPrice) {
      priceDetailsHtml += `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">Biocleaner ${inspection.biocleanerModel} ${inspection.biocleanerType || ''}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(inspection.biocleanerPrice)}</td>
        </tr>
      `;
    }
    if (inspection.styreskapSize && inspection.styreskapPrice) {
      priceDetailsHtml += `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">Styreskap ${inspection.styreskapSize}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(inspection.styreskapPrice)}</td>
        </tr>
      `;
    }
    if (inspection.soknadUtslippPrice) {
      priceDetailsHtml += `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">Søknad om utslippstillatelse</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(inspection.soknadUtslippPrice)}</td>
        </tr>
      `;
    }
    if (inspection.soknadDispensasjonPrice) {
      priceDetailsHtml += `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">Søknad om dispensasjon</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(inspection.soknadDispensasjonPrice)}</td>
        </tr>
      `;
    }
    if (inspection.innreguleringPrice) {
      priceDetailsHtml += `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">Innregulering/oppstart/montering</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(inspection.innreguleringPrice)}</td>
        </tr>
      `;
    }
    if (inspection.gravingPrice) {
      priceDetailsHtml += `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">Graving med singel</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(inspection.gravingPrice)}</td>
        </tr>
      `;
    }
    if (inspection.fraktPrice) {
      priceDetailsHtml += `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">Frakt</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(inspection.fraktPrice)}</td>
        </tr>
      `;
    }

    await resend.emails.send({
      from: 'Smart Hjem AS <noreply@klartilleie.no>',
      to: [inspection.customerEmail],
      replyTo: 'kundeservice@klartilleie.no',
      subject: `Tilbud på avløpsanlegg - Smart Hjem AS`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Tilbud på Avløpsanlegg</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Fra Smart Hjem AS</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 25px; border: 1px solid #ddd; border-top: none;">
            <p style="margin-top: 0;">Hei ${inspection.customerName},</p>
            
            <p>Takk for at du tok kontakt med oss angående avløpsløsning. Basert på befaringen vi har utført, har vi gleden av å presentere følgende tilbud:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
              <h3 style="margin-top: 0; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px;">Kundeinformasjon</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; color: #666;">Kunde:</td>
                  <td style="padding: 5px 0; font-weight: bold;">${inspection.customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666;">Adresse:</td>
                  <td style="padding: 5px 0;">${inspection.customerAddress || ''}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666;">E-post:</td>
                  <td style="padding: 5px 0;">${inspection.customerEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666;">Telefon:</td>
                  <td style="padding: 5px 0;">${inspection.customerPhone || ''}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666;">Befaring utført av:</td>
                  <td style="padding: 5px 0;">${inspection.reportFilledBy || 'Smart Hjem AS'}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666;">Dato:</td>
                  <td style="padding: 5px 0;">${inspection.inspectionDateTime || ''}</td>
                </tr>
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
              <h3 style="margin-top: 0; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px;">Tilbudsspesifikasjon</h3>
              <table style="width: 100%; border-collapse: collapse;">
                ${priceDetailsHtml}
              </table>
              
              <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #1e3a5f;">
                <table style="width: 100%; border-collapse: collapse;">
                  ${inspection.offerSum ? `
                  <tr>
                    <td style="padding: 5px 0; font-weight: bold;">Sum eks. mva:</td>
                    <td style="padding: 5px 0; text-align: right; font-weight: bold;">${formatPrice(inspection.offerSum)}</td>
                  </tr>
                  ` : ''}
                  ${inspection.offerMva ? `
                  <tr>
                    <td style="padding: 5px 0;">Mva (25%):</td>
                    <td style="padding: 5px 0; text-align: right;">${formatPrice(inspection.offerMva)}</td>
                  </tr>
                  ` : ''}
                  ${inspection.offerTotal ? `
                  <tr>
                    <td style="padding: 10px 0; font-size: 18px; font-weight: bold; color: #1e3a5f;">TOTALPRIS inkl. mva:</td>
                    <td style="padding: 10px 0; text-align: right; font-size: 18px; font-weight: bold; color: #1e3a5f;">FRA ${formatPrice(inspection.offerTotal)}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
            </div>

            ${inspection.offerComments ? `
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <strong>Merknad:</strong><br>
              ${inspection.offerComments}
            </div>
            ` : ''}

            <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 15px 0; font-weight: bold; color: #1e3a5f;">Ønsker du å godkjenne tilbudet eller har du spørsmål?</p>
              <p style="margin: 0;">Svar på denne e-posten eller kontakt oss på:</p>
              <p style="margin: 10px 0; font-size: 18px; font-weight: bold;">
                <a href="mailto:kundeservice@klartilleie.no" style="color: #1e3a5f;">kundeservice@klartilleie.no</a>
              </p>
            </div>
            
            <p style="margin-bottom: 0;">Med vennlig hilsen,</p>
            <p style="margin-top: 5px; font-weight: bold;">Smart Hjem AS</p>
          </div>
          
          <div style="background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px;">
            <p style="margin: 0;">Smart Hjem AS | Avløpsløsninger</p>
            <p style="margin: 5px 0 0 0; opacity: 0.8;">Dette tilbudet er gyldig i 30 dager fra befaringsdato.</p>
          </div>
        </body>
        </html>
      `,
    });
    console.log(`Tilbuds-e-post sendt til kunde: ${inspection.customerEmail}`);
  } catch (error) {
    console.error('Feil ved sending av kunde-e-post:', error);
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
      // Konverter prisfelt til tall og sett standardverdier
      const imagePaths = req.body.imagePaths || [];
      const data = {
        ...req.body,
        imagePaths: imagePaths,
        imageCount: imagePaths.length,
        imagesUploaded: imagePaths.length > 0,
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
      };
      
      const inspection = await storage.createInspection(data);
      
      // Send e-postvarsel til kundeservice
      sendNotificationEmail(inspection);
      
      // Send tilbud til kunde
      sendCustomerOfferEmail(inspection);
      
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

  // Generer PDF for en inspeksjon
  app.get("/api/inspections/:id/pdf", async (req, res) => {
    try {
      const inspection = await storage.getInspection(req.params.id);
      if (!inspection) {
        return res.status(404).json({ error: "Inspeksjon ikke funnet" });
      }

      const doc = await generateInspectionPDF(inspection);
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="befaring-${inspection.customerName.replace(/[^a-zA-Z0-9æøåÆØÅ]/g, "_")}.pdf"`
      );
      
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("Feil ved generering av PDF:", error);
      res.status(500).json({ error: "Kunne ikke generere PDF" });
    }
  });

  return httpServer;
}
