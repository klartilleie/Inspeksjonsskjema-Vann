import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Inspection } from "@shared/schema";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Trash2, Eye, LogOut, FileText, Image } from "lucide-react";
import logoUrl from "@assets/Lars_Logo-01_1765460766343.jpg";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Ikke autorisert",
        description: "Logger inn...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: inspections, isLoading } = useQuery<Inspection[]>({
    queryKey: ["/api/inspections"],
    enabled: isAuthenticated,
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Klar til Leie AS" className="h-10 w-auto object-contain" />
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logg ut
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-semibold">Befaringsskjemaer</h2>
          <Badge variant="secondary">{inspections?.length || 0} skjemaer</Badge>
        </div>

        {isLoading ? (
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
                      Se detaljer
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
      </main>
    </div>
  );
}
