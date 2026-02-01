import { auth, requiresAuth } from "express-openid-connect";
import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";

// Use the new Render database if available, fallback to Replit DATABASE_URL
const databaseUrl = process.env.Inspeksjonsskjema_db || process.env.DATABASE_URL;
const isRenderDatabase = !!process.env.Inspeksjonsskjema_db;

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  
  const sessionStore = new pgStore({
    conString: databaseUrl,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
    conObject: isRenderDatabase ? {
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    } : undefined,
  });

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET || process.env.SESSION_SECRET,
  baseURL: process.env.AUTH0_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  issuerBaseURL: process.env.AUTH0_DOMAIN ? `https://${process.env.AUTH0_DOMAIN}` : undefined,
  authorizationParams: {
    response_type: 'code',
  },
  routes: {
    login: false,
  }
};

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  
  // Only enable Auth0 if all required environment variables are set
  if (config.baseURL && config.clientID && config.issuerBaseURL) {
    app.use(auth(config));
    
    app.get('/api/auth0/login', (req, res) => {
      (res as any).oidc.login({ 
        returnTo: '/', 
        authorizationParams: { redirect_uri: `${process.env.AUTH0_BASE_URL}/callback` } 
      });
    });
    
    app.get('/api/auth0/logout', (req, res) => {
      (res as any).oidc.logout({ returnTo: process.env.AUTH0_BASE_URL });
    });
    
    app.get('/api/auth0/user', (req: any, res) => {
      if (req.oidc && req.oidc.isAuthenticated()) {
        const user = req.oidc.user;
        return res.json({
          id: user.sub,
          email: user.email,
          name: user.name,
          picture: user.picture,
        });
      }
      res.status(401).json({ error: "Ikke logget inn via Auth0" });
    });
  }
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Check if user is authenticated via Auth0
  if ((req as any).oidc && (req as any).oidc.isAuthenticated()) {
    return next();
  }
  // Check if user is authenticated via app session
  if (req.session && (req.session as any).appUserId) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}
