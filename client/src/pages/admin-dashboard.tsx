import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Inspection } from "@shared/schema";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Trash2, Eye, LogOut, FileText, Image, Download, Home } from "lucide-react";
import logoUrl from "@assets/Smart_Hjem_As_-_FinalizedLogoD2L5_(Transparent)-01_1769033291619.png";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const { data: inspections, isLoading: inspectionsLoading } = useQuery<Inspection[]>({
    queryKey: ["/api/inspections"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/inspections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      toast({
        title: "Slettet",
        description: "Befaringsskjemaet ble slettet.",
      });
    },
    onError: () => {
      toast({
        title: "Feil",
        description: "Kunne ikke slette skjemaet.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Smart Hjem AS" className="h-16 w-auto object-contain" />
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground" data-testid="text-admin-user">
              {user?.fullName}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = "/"}
              data-testid="button-back-to-form"
            >
              <Home className="h-4 w-4 mr-2" />
              Til skjema
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              data-testid="button-admin-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logg ut
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">Befaringsskjemaer</h2>
          <Badge variant="secondary">{inspections?.length || 0} skjemaer</Badge>
        </div>

        {inspectionsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : inspections?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Ingen befaringsskjemaer funnet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inspections?.map((inspection) => (
              <Card key={inspection.id} data-testid={`card-inspection-${inspection.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{inspection.customerName}</CardTitle>
                    <Badge variant="outline" className="shrink-0">
                      <Image className="h-3 w-3 mr-1" />
                      {inspection.imageCount}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{inspection.customerAddress}</p>
                    <p>{inspection.customerEmail}</p>
                    <p>{inspection.customerPhone}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Utfylt av: {inspection.reportFilledBy}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {inspection.createdAt && format(new Date(inspection.createdAt), "d. MMMM yyyy, HH:mm", { locale: nb })}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(`/skjema/${inspection.id}`, "_blank")}
                      data-testid={`button-view-${inspection.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Se
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(`/api/inspections/${inspection.id}/pdf`, "_blank")}
                      data-testid={`button-pdf-${inspection.id}`}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteMutation.mutate(inspection.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${inspection.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground text-center">
              Brukeradministrasjon håndteres i{" "}
              <a 
                href="https://manage.auth0.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Auth0 Dashboard
              </a>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
