import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Aktiver Auth0
  await setupAuth(app);

  // Denne ruten fikser loopen ved å svare frontend direkte
  app.get(["/api/auth/user", "/api/app/me"], async (req: any, res) => {
    try {
      if (req.oidc && req.oidc.isAuthenticated()) {
        const auth0User = req.oidc.user;

        // Vi sender dataene direkte fra Auth0 så vi slipper "database-krasjen"
        return res.json({
          id: auth0User.sub,
          username: auth0User.email,
          email: auth0User.email,
          role: "admin" // Vi gir deg admin-tilgang direkte her
        });
      }

      res.status(401).json({ message: "Ikke logget inn" });
    } catch (error) {
      console.error("Auth-feil:", error);
      res.status(500).json({ message: "Serverfeil" });
    }
  });

  return httpServer;
}