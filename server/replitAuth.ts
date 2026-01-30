import { expressjwt } from "express-jwt";
import jwksRsa from "jwks-rsa";
import { auth } from "express-openid-connect";
import type { Express, Request, Response, NextFunction } from "express";

// Konfigurasjon for Auth0
const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET,
  baseURL: "https://inspeksjonsskjema-vann.onrender.com", // Din Render-URL
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`, // Bruker domenet fra miljøvariabler
};

export async function setupAuth(app: Express) {
  // Dette aktiverer Auth0-motoren og lager automatisk ruter som /login og /callback
  app.use(auth(config));

  console.log("Auth0-systemet er aktivert for Render");
}

// Middleware for å sjekke om brukeren er logget inn på beskyttede sider
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if ((req as any).oidc.isAuthenticated()) {
    return next();
  }
  res.status(401).send("Vennligst logg inn");
}