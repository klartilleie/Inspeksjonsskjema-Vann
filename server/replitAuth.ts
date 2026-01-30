import { auth } from 'express-openid-connect';
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET,
  baseURL: 'https://inspeksjonsskjema-vann.onrender.com',
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  routes: {
    callback: '/api/callback',
    login: '/api/login',
    logout: '/api/logout',
  }
};

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  // Aktiver Auth0
  app.use(auth(config));

  // Hent brukerdata og lagre/oppdater i din database
  app.get("/api/user", async (req: any, res) => {
    if (req.oidc.isAuthenticated()) {
      const claims = req.oidc.user;

      // Valgfritt: Synkroniser med din storage.ts hvis du trenger det
      await storage.upsertUser({
        id: claims.sub,
        email: claims.email,
        firstName: claims.given_name || "",
        lastName: claims.family_name || "",
        profileImageUrl: claims.picture || "",
      });

      res.json(req.oidc.user);
    } else {
      res.status(401).send();
    }
  });
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.oidc.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};