import { auth } from 'express-openid-connect';
import type { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET,
  baseURL: 'https://inspeksjonsskjema-vann.onrender.com',
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  routes: {
    callback: '/api/callback', // Matcher din eksisterende logikk
    login: '/api/login',
    logout: '/api/logout',
  }
};

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  // Bruk Auth0 middleware
  app.use(auth(config));

  // En enkel rute for å sjekke hvem som er logget inn
  app.get("/api/user", (req, res) => {
    if (req.oidc.isAuthenticated()) {
      res.json(req.oidc.user);
    } else {
      res.status(401).send();
    }
  });
}

// Middleware for å beskytte rutene dine
export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.oidc.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};