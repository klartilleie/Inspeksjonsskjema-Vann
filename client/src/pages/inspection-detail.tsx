import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Inspection } from "@shared/schema";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { ArrowLeft, User, MapPin, Mail, Phone, Calendar, Droplets, Thermometer, Plug, Wrench, Camera, FileDown, Receipt, Map } from "lucide-react";
import logoUrl from "@assets/Smart_Hjem_As_-_FinalizedLogoD2L5_(Transparent)-01_1769033291619.png";

export default function InspectionDetail() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const params = useParams<{ id: string }>();

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

  const { data: inspection, isLoading } = useQuery<Inspection>({
    queryKey: ["/api/inspections", params.id],
    enabled: isAuthenticated && !!params.id,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-96 w-full max-w-4xl mx-auto" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!inspection) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Skjema ikke funnet</p>
          <Button className="mt-4" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Button>
        </Card>
      </div>
    );
  }

  const translateValue = (value: string) => {
    const translations: Record<string, string> = {
      ja: "Ja",
      nei: "Nei",
      kommunalt: "Kommunalt avløp",
      tett_tank: "Tett tank",
      renseanlegg: "Renseanlegg",
      ikke_aktuelt: "Ikke aktuelt",
      bekk: "Utslipp til bekk/vann",
      infiltrasjon: "Infiltrasjon",
      ingen: "Ingen",
      isolering: "Isolering",
      varmekabel: "Varmekabel",
      annet: "Annet",
    };
    return translations[value] || value;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logoUrl} alt="Smart Hjem AS" className="h-8 w-auto object-contain" />
            <h1 className="text-xl font-semibold">Befaringsdetaljer</h1>
          </div>
          <Button
            variant="default"
            onClick={() => window.open(`/api/inspections/${params.id}/pdf`, "_blank")}
            data-testid="button-download-pdf"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Last ned PDF
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Kundeinformasjon</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Navn</p>
              <p className="font-medium">{inspection.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Adresse</p>
              <p className="font-medium">{inspection.customerAddress}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> E-post</p>
              <p className="font-medium">{inspection.customerEmail}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Telefon</p>
              <p className="font-medium">{inspection.customerPhone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Befaringsdato</p>
              <p className="font-medium">{inspection.inspectionDateTime}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rapport fylt ut av</p>
              <p className="font-medium">{inspection.reportFilledBy}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Offentlig ordre</p>
              <Badge variant="outline">{translateValue(inspection.hasPublicOrder)}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Avløpsløsning</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Eksisterende løsning</p>
              <p className="font-medium">{translateValue(inspection.existingDrainageSolution)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Egen brønn</p>
              <Badge variant="outline">{translateValue(inspection.hasOwnWell)}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Planlagt løsning</p>
              <p className="font-medium">{translateValue(inspection.plannedSolutionType)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avstand til nabogrense</p>
              <p className="font-medium">{inspection.distanceToNeighborBorder || "Ikke spesifisert"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nabokonflikt</p>
              <Badge variant="outline">{translateValue(inspection.hasNeighborConflict)}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Plassering og frostsikring</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Planlagt plassering</p>
              <p className="font-medium">{inspection.plannedPlacement}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Målt klaring</p>
              <p className="font-medium">{inspection.measuredClearance || "Ikke spesifisert"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Naturlig frostfritt</p>
              <Badge variant="outline">{translateValue(inspection.isNaturallyFrostFree)}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Frostsikringstiltak</p>
              <p className="font-medium">{translateValue(inspection.frostProtectionMeasure)}</p>
            </div>
            {inspection.frostProtectionOther && (
              <div>
                <p className="text-sm text-muted-foreground">Annet tiltak</p>
                <p className="font-medium">{inspection.frostProtectionOther}</p>
              </div>
            )}
            {inspection.frostProtectionComments && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Kommentarer</p>
                <p className="font-medium">{inspection.frostProtectionComments}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-muted-foreground" />
              <Wrench className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Tekniske tilkoblinger</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Trenger elektriker</p>
              <Badge variant="outline">{translateValue(inspection.needsElectrician)}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Strømpunkt i nærheten</p>
              <Badge variant="outline">{translateValue(inspection.hasNearbyPowerPoint)}</Badge>
            </div>
            {inspection.powerPointDistance && (
              <div>
                <p className="text-sm text-muted-foreground">Avstand til strømpunkt</p>
                <p className="font-medium">{inspection.powerPointDistance}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Ny kurs nødvendig</p>
              <Badge variant="outline">{inspection.needsNewCircuit ? "Ja" : "Nei"}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Trenger rørlegger</p>
              <Badge variant="outline">{translateValue(inspection.needsPlumber)}</Badge>
            </div>
            {inspection.existingDrainPipe && (
              <div>
                <p className="text-sm text-muted-foreground">Eksisterende avløpsrør</p>
                <p className="font-medium">{inspection.existingDrainPipe}</p>
              </div>
            )}
            {inspection.outletPoint && (
              <div>
                <p className="text-sm text-muted-foreground">Utløpspunkt</p>
                <p className="font-medium">{inspection.outletPoint}</p>
              </div>
            )}
            {inspection.otherProfessionals && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Andre fagfolk</p>
                <p className="font-medium">{inspection.otherProfessionals}</p>
              </div>
            )}
            {inspection.technicalConnectionComments && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Kommentarer</p>
                <p className="font-medium">{inspection.technicalConnectionComments}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Dokumentasjon</CardTitle>
              <Badge variant="secondary">{inspection.imageCount} bilder</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {inspection.imagePaths && inspection.imagePaths.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {inspection.imagePaths.map((path, index) => (
                  <a
                    key={index}
                    href={path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square rounded-md overflow-hidden border hover-elevate"
                  >
                    <img
                      src={path}
                      alt={`Bilde ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Ingen bilder lastet opp</p>
            )}
            {inspection.logisticsComments && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Logistikkkommentarer</p>
                <p className="font-medium">{inspection.logisticsComments}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {(() => {
          const markers = inspection.mapMarkers as unknown as Array<{id: string, type: string, position: [number, number]}> | null;
          const hasMarkers = markers && Array.isArray(markers) && markers.length > 0;
          const hasMapImage = !!inspection.mapImage;
          
          if (!hasMarkers && !hasMapImage) return null;
          
          return (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Map className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Situasjonsplan</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {hasMapImage && (
                  <div className="mb-4">
                    <img 
                      src={inspection.mapImage!} 
                      alt="Situasjonsplan" 
                      className="w-full rounded-lg border shadow-sm"
                    />
                  </div>
                )}
                {hasMarkers && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Markører:</p>
                    {markers!.map((marker, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{marker.type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          Posisjon: {marker.position[0].toFixed(6)}, {marker.position[1].toFixed(6)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {inspection.mapNotes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Kartnotater</p>
                    <p className="font-medium">{inspection.mapNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {(inspection.offerTotal || inspection.biocleanerPrice) && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Tilbud</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inspection.biocleanerModel && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <div>
                      <p className="font-medium">Biocleaner {inspection.biocleanerModel}</p>
                      <p className="text-sm text-muted-foreground">{inspection.biocleanerType}</p>
                    </div>
                    {inspection.biocleanerPrice && (
                      <p className="font-medium">kr {inspection.biocleanerPrice.toLocaleString('nb-NO')},-</p>
                    )}
                  </div>
                )}
                {inspection.styreskapSize && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <p className="font-medium">Styreskap ({inspection.styreskapSize})</p>
                    {inspection.styreskapPrice && (
                      <p className="font-medium">kr {inspection.styreskapPrice.toLocaleString('nb-NO')},-</p>
                    )}
                  </div>
                )}
                {inspection.soknadUtslippPrice && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <p>Søknad om utslippstillatelse</p>
                    <p className="font-medium">kr {inspection.soknadUtslippPrice.toLocaleString('nb-NO')},-</p>
                  </div>
                )}
                {inspection.soknadDispensasjonPrice && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <p>Søknad om dispensasjon</p>
                    <p className="font-medium">kr {inspection.soknadDispensasjonPrice.toLocaleString('nb-NO')},-</p>
                  </div>
                )}
                {inspection.innreguleringPrice && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <p>Innregulering/oppstart/montering</p>
                    <p className="font-medium">kr {inspection.innreguleringPrice.toLocaleString('nb-NO')},-</p>
                  </div>
                )}
                {inspection.gravingPrice && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <p>Graving med singel</p>
                    <p className="font-medium">kr {inspection.gravingPrice.toLocaleString('nb-NO')},-</p>
                  </div>
                )}
                {inspection.fraktPrice && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <p>Frakt</p>
                    <p className="font-medium">kr {inspection.fraktPrice.toLocaleString('nb-NO')},-</p>
                  </div>
                )}

                <div className="pt-4 space-y-2">
                  {inspection.offerSum && (
                    <div className="flex justify-between items-center">
                      <p className="text-muted-foreground">Sum</p>
                      <p className="font-medium">kr {inspection.offerSum.toLocaleString('nb-NO')},-</p>
                    </div>
                  )}
                  {inspection.offerMva && (
                    <div className="flex justify-between items-center">
                      <p className="text-muted-foreground">Mva (25%)</p>
                      <p className="font-medium">kr {inspection.offerMva.toLocaleString('nb-NO')},-</p>
                    </div>
                  )}
                  {inspection.offerTotal && (
                    <div className="flex justify-between items-center text-lg pt-2 border-t">
                      <p className="font-semibold">FRA - Totalpris</p>
                      <p className="font-bold text-primary">kr {inspection.offerTotal.toLocaleString('nb-NO')},-</p>
                    </div>
                  )}
                </div>

                {inspection.offerComments && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Kommentarer til tilbudet</p>
                    <p className="font-medium">{inspection.offerComments}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground">
          Opprettet: {inspection.createdAt && format(new Date(inspection.createdAt), "d. MMMM yyyy, HH:mm", { locale: nb })}
        </div>
      </main>
    </div>
  );
}
