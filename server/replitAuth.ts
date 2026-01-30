import { auth } from "express-openid-connect";
import type { Express, Request, Response, NextFunction } from "express";

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET,
  baseURL: "https://inspeksjonsskjema-vann.onrender.com",
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  // DENNE LINJEN SENDER DEG VIDERE ETTER INNLOGGING:
  authorizationParams: {
    response_type: 'code',
  },
  routes: {
    login: false, // Vi bruker vår egen knapp
    callback: '/callback',
    postLogoutRedirect: '/',
  }
};

export async function setupAuth(app: Express) {
  app.use(auth(config));

  // Vi lager en manuell rute for /login som tvinger videresending til forsiden etterpå
  app.get('/login', (req, res) => {
    res.oidc.login({ returnTo: '/' }); 
  });
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if ((req as any).oidc.isAuthenticated()) {
    return next();
  }
  res.status(401).send("Vennligst logg inn");
}