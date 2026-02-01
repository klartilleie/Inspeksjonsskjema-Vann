import { auth } from "express-openid-connect";
import type { Express, Request, Response, NextFunction } from "express";

const isAuth0Configured = !!(
  process.env.AUTH0_BASE_URL &&
  process.env.AUTH0_CLIENT_ID &&
  process.env.AUTH0_DOMAIN
);

const config = isAuth0Configured ? {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET || process.env.SESSION_SECRET,
  baseURL: process.env.AUTH0_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  authorizationParams: {
    response_type: 'code',
  },
  routes: {
    login: false,
  }
} : null;

export async function setupAuth(app: Express) {
  if (config) {
    app.use(auth(config));

    app.get('/login', (req, res) => {
      (res as any).oidc.login({ 
        returnTo: '/', 
        authorizationParams: { redirect_uri: `${process.env.AUTH0_BASE_URL}/callback` } 
      });
    });
  } else {
    console.log("Auth0 ikke konfigurert - kjører uten autentisering");
  }
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (config && (req as any).oidc && (req as any).oidc.isAuthenticated()) {
    return next();
  }
  if (!config) {
    return next();
  }
  res.status(401).send("Vennligst logg inn");
}
