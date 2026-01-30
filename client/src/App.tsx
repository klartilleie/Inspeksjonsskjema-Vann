import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import InspectionForm from "@/pages/inspection-form";
import AdminDashboard from "@/pages/admin-dashboard";
import InspectionDetail from "@/pages/inspection-detail";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

// Denne funksjonen beskytter vanlige brukersider
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Hvis ingen bruker er funnet etter Auth0-sjekken, vis Login-siden
  if (!user) {
    return <Login />;
  }

  return <Component />;
}

// Denne funksjonen beskytter Admin-sider
function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Ingen tilgang</h1>
          <p className="text-muted-foreground">Du har ikke tilgang til denne siden.</p>
        </div>
      </div>
    );
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* 1. Vi definerer login-ruten separat for å unngå loopen */}
      <Route path="/login" component={Login} />

      {/* 2. Hovedsiden (Befaringsskjema) - lander her etter Auth0 callback */}
      <Route path="/">
        {() => <ProtectedRoute component={InspectionForm} />}
      </Route>

      {/* 3. Admin-oversikt */}
      <Route path="/admin">
        {() => <AdminRoute component={AdminDashboard} />}
      </Route>

      {/* 4. Spesifikke skjemaer */}
      <Route path="/skjema/:id">
        {() => <ProtectedRoute component={InspectionDetail} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;