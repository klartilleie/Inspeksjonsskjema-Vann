import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Setter opp Auth0-integrasjonen
  await setupAuth(app);

  // Denne ruten svarer på det navnet frontend forventer (/api/app/me)
  app.get(["/api/auth/user", "/api/app/me"], async (req: any, res) => {
    try {
      // Sjekker om Auth0 har bekreftet brukeren
      if (req.oidc && req.oidc.isAuthenticated()) {
        const auth0User = req.oidc.user;
        const email = auth0User.email;

        // Finn eller lag brukeren i databasen din
        let user = await storage.getUser(auth0User.sub);

        // Hvis det er din e-post, tvinger vi admin-rolle
        if (email === "kundeservice@smarthjem.as" && (!user || user.role !== "admin")) {
          user = await storage.createUser({
            id: auth0User.sub,
            username: email,
            email: email,
            role: "admin"
          });
        }

        // Sender brukerdata tilbake til frontend
        return res.json(user || {
          id: auth0User.sub,
          username: email,
          email: email,
          role: "admin"
        });
      }

      // Hvis ikke logget inn, svarer vi 401 så frontend viser login-knappen
      res.status(401).json({ message: "Ikke logget inn" });
    } catch (error) {
      console.error("Auth-feil:", error);
      res.status(500).json({ message: "Serverfeil" });
    }
  });

  return httpServer;
}