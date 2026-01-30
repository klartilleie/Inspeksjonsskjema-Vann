import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const handleLogin = () => {
    // Dette sender deg direkte til Auth0-innloggingen som vi nå har satt opp
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center space-y-4">
          <img 
            src="/assets/Smart_Hjem_As_-_FinalizedLogoD2L5_ (Transparent)-01_1708033291010-BeqUA8Y1.png" 
            alt="Smart Hjem AS" 
            className="h-20 mx-auto"
          />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Befaringsskjema</h1>
            <p className="text-sm text-muted-foreground">
              Vennligst logg inn for å få tilgang til systemet.
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Button 
            className="w-full h-12 text-lg font-medium gap-3" 
            onClick={handleLogin}
          >
            <LogIn className="h-5 w-5" />
            Logg inn med Smart Hjem-konto
          </Button>
          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Lett Avløps-/Gråvannsystem
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}