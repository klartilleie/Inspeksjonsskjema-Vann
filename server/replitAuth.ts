import { auth } from "express-openid-connect";
import type { Express, Request, Response, NextFunction } from "express";

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET || process.env.SESSION_SECRET,
  baseURL: process.env.AUTH0_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET, // Viktig: Denne kobler til Render-verdien
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  authorizationParams: {
    response_type: 'code',
  },
  routes: {
    login: false,
  }
};

export async function setupAuth(app: Express) {
  app.use(auth(config));

  app.get('/login', (req, res) => {
    res.oidc.login({ 
      returnTo: '/', 
      authorizationParams: { redirect_uri: `${process.env.AUTH0_BASE_URL}/callback` } 
    });
  });
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if ((req as any).oidc.isAuthenticated()) {
    return next();
  }
  res.status(401).send("Vennligst logg inn");
}