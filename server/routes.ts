import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./replitAuth";
import { v2 as cloudinary } from 'cloudinary';

// Konfigurer Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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

  return httpServer;
}
