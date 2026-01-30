// Endre ruten slik at den støtter både /api/auth/user og /api/app/me
app.get(["/api/auth/user", "/api/app/me"], async (req: any, res) => {
  try {
    // Sjekk om Auth0 har logget inn brukeren
    if (req.oidc && req.oidc.isAuthenticated()) {
      const auth0User = req.oidc.user;
      const email = auth0User.email;

      // Hent eller opprett bruker i din database
      let user = await storage.getUser(auth0User.sub);

      if (email === "kundeservice@smarthjem.as" && (!user || user.role !== "admin")) {
        user = await storage.createUser({
          id: auth0User.sub,
          username: email,
          email: email,
          role: "admin"
        });
      }

      // Returner brukerdata slik at frontend stopper loopen
      return res.json(user || {
        id: auth0User.sub,
        username: email,
        email: email,
        role: "admin" // Vi tvinger admin-rolle her for deg
      });
    }

    // Hvis ikke logget inn, send 401
    res.status(401).json({ message: "Ikke logget inn" });
  } catch (error) {
    console.error("Auth-sjekk feilet:", error);
    res.status(500).json({ message: "Serverfeil" });
  }
});