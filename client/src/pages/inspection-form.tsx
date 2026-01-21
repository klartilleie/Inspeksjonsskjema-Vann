import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { clientInspectionFormSchema, type ClientInspectionFormData } from "@shared/schema";
import {
  User,
  MapPin,
  Mail,
  Phone,
  Calendar,
  FileText,
  Droplets,
  Thermometer,
  Wrench,
  Camera,
  CheckCircle,
  Upload,
  X,
  Loader2,
  LogOut,
  Settings,
  Map,
} from "lucide-react";
import logoUrl from "@assets/Lars_Logo-01_1765460766343.jpg";

export default function InspectionForm() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ClientInspectionFormData>({
    resolver: zodResolver(clientInspectionFormSchema),
    defaultValues: {
      customerName: "",
      customerAddress: "",
      customerEmail: "",
      customerPhone: "",
      inspectionDateTime: "",
      reportFilledBy: user?.fullName || "",
      hasPublicOrder: "nei",
      existingDrainageSolution: "ikke_aktuelt",
      hasOwnWell: "nei",
      plannedSolutionType: "ikke_aktuelt",
      distanceToNeighborBorder: "",
      hasNeighborConflict: "nei",
      plannedPlacement: "",
      measuredClearance: "",
      isNaturallyFrostFree: "nei",
      frostProtectionMeasure: "ingen",
      frostProtectionOther: "",
      frostProtectionComments: "",
      needsElectrician: "nei",
      hasNearbyPowerPoint: "nei",
      powerPointDistance: "",
      needsNewCircuit: false,
      needsPlumber: "nei",
      existingDrainPipe: "",
      outletPoint: "",
      otherProfessionals: "",
      technicalConnectionComments: "",
      imagePaths: [],
      logisticsComments: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: ClientInspectionFormData) => {
      const response = await apiRequest("POST", "/api/inspections", {
        ...data,
        imagePaths: uploadedImages,
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Skjema sendt",
        description: "Befaringsskjemaet ble lagret.",
      });
      form.reset({
        customerName: "",
        customerAddress: "",
        customerEmail: "",
        customerPhone: "",
        inspectionDateTime: "",
        reportFilledBy: user?.fullName || "",
        hasPublicOrder: "nei",
        existingDrainageSolution: "ikke_aktuelt",
        hasOwnWell: "nei",
        plannedSolutionType: "ikke_aktuelt",
        distanceToNeighborBorder: "",
        hasNeighborConflict: "nei",
        plannedPlacement: "",
        measuredClearance: "",
        isNaturallyFrostFree: "nei",
        frostProtectionMeasure: "ingen",
        frostProtectionOther: "",
        frostProtectionComments: "",
        needsElectrician: "nei",
        hasNearbyPowerPoint: "nei",
        powerPointDistance: "",
        needsNewCircuit: false,
        needsPlumber: "nei",
        existingDrainPipe: "",
        outletPoint: "",
        otherProfessionals: "",
        technicalConnectionComments: "",
        imagePaths: [],
        logisticsComments: "",
      });
      setUploadedImages([]);
    },
    onError: () => {
      toast({
        title: "Feil",
        description: "Kunne ikke sende skjemaet. Prøv igjen.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        const uploadUrlRes = await apiRequest("POST", "/api/objects/upload", {});
        const { uploadURL } = uploadUrlRes as { uploadURL: string };

        await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        const updateRes = await apiRequest("PUT", "/api/uploaded-images", {
          imageURL: uploadURL,
        });
        const { objectPath } = updateRes as { objectPath: string };

        setUploadedImages((prev) => [...prev, objectPath]);
      }

      toast({
        title: "Bilder lastet opp",
        description: `${files.length} bilde(r) ble lastet opp.`,
      });
    } catch (error) {
      toast({
        title: "Feil ved opplasting",
        description: "Kunne ikke laste opp bildet. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: ClientInspectionFormData) => {
    if (uploadedImages.length < 5) {
      toast({
        title: "Manglende bilder",
        description: "Minimum 5 bilder er påkrevd.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate(data);
  };

  const frostProtectionMeasure = form.watch("frostProtectionMeasure");
  const hasNearbyPowerPoint = form.watch("hasNearbyPowerPoint");

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span data-testid="text-logged-in-user">{user?.fullName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = "/kart"}
              data-testid="button-map"
            >
              <Map className="w-4 h-4 mr-2" />
              Kart & Tilbud
            </Button>
            {user?.role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = "/admin"}
                data-testid="button-admin-panel"
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logg ut
            </Button>
          </div>
        </div>

        <div className="mb-8 flex flex-col items-center text-center">
          <img src={logoUrl} alt="Klar til Leie AS" className="h-48 w-auto object-contain mb-4" />
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
            Befaringsskjema: Lett Avløps-/Gråvannsystem
          </h1>
          <p className="text-muted-foreground">
            V.3 - Samle inn nødvendig informasjon under befaring for et enkelt, frostfritt avløpssystem
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-row items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground text-sm font-semibold">
                    1
                  </div>
                  <CardTitle className="text-lg">Kunde- og Prosjektdetaljer</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Kunde Navn *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Skriv inn kundens navn"
                          data-testid="input-customer-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Kunde Adresse og Postnummer *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Adresse, postnummer og sted"
                          data-testid="input-customer-address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Kunde E-post *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="eksempel@epost.no"
                          data-testid="input-customer-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Kundens Telefonnummer *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+47 XXX XX XXX"
                          data-testid="input-customer-phone"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inspectionDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Dato og Tid for befaring *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          data-testid="input-inspection-datetime"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reportFilledBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Hvem fylte ut rapporten *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ditt navn"
                          data-testid="input-report-filled-by"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasPublicOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Foreligger det noen form for offentlig påbud?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2 mt-2"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="ja" id="public-order-yes" data-testid="radio-public-order-yes" />
                            <Label htmlFor="public-order-yes">Ja</Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="nei" id="public-order-no" data-testid="radio-public-order-no" />
                            <Label htmlFor="public-order-no">Nei</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground text-sm font-semibold">
                  2
                </div>
                <CardTitle className="text-lg">Eksisterende Avløp og Kontekst</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="existingDrainageSolution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Droplets className="w-4 h-4" />
                        Eksisterende avløpsløsning
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2 mt-2"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="kommunalt" id="drainage-municipal" data-testid="radio-drainage-municipal" />
                            <Label htmlFor="drainage-municipal">Kommunalt tilknyttet</Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="tett_tank" id="drainage-tank" data-testid="radio-drainage-tank" />
                            <Label htmlFor="drainage-tank">Tett tank</Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="renseanlegg" id="drainage-treatment" data-testid="radio-drainage-treatment" />
                            <Label htmlFor="drainage-treatment">Renseanlegg</Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="ikke_aktuelt" id="drainage-na" data-testid="radio-drainage-na" />
                            <Label htmlFor="drainage-na">Ikke aktuelt</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasOwnWell"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Er det egen brønn på eiendommen?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2 mt-2"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="ja" id="well-yes" data-testid="radio-well-yes" />
                            <Label htmlFor="well-yes">Ja</Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="nei" id="well-no" data-testid="radio-well-no" />
                            <Label htmlFor="well-no">Nei</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plannedSolutionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenkt løsningstype (Utløp)</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2 mt-2"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="bekk" id="solution-stream" data-testid="radio-solution-stream" />
                            <Label htmlFor="solution-stream">Utløp i helårs bekk</Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="infiltrasjon" id="solution-infiltration" data-testid="radio-solution-infiltration" />
                            <Label htmlFor="solution-infiltration">Infiltrasjon</Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="ikke_aktuelt" id="solution-na" data-testid="radio-solution-na" />
                            <Label htmlFor="solution-na">Ikke aktuelt</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="distanceToNeighborBorder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avstand til nabogrense (m)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="F.eks. 15"
                          data-testid="input-neighbor-distance"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasNeighborConflict"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Foreligger det konflikt med naboer?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2 mt-2"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="ja" id="conflict-yes" data-testid="radio-conflict-yes" />
                            <Label htmlFor="conflict-yes">Ja</Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="nei" id="conflict-no" data-testid="radio-conflict-no" />
                            <Label htmlFor="conflict-no">Nei</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground text-sm font-semibold">
                  3
                </div>
                <CardTitle className="text-lg">Plassering av Systemet og Frostsikring</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="plannedPlacement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Ønsket/Planlagt plassering *
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="F.eks.: Under sydvendt balkong, i eksisterende bod."
                          className="min-h-24"
                          data-testid="input-planned-placement"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="measuredClearance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Målt frihøyde på stedet (cm)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="F.eks. 180"
                          data-testid="input-clearance"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isNaturallyFrostFree"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4" />
                        Er plasseringen naturlig frostfri?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2 mt-2"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="ja" id="frost-free-yes" data-testid="radio-frost-free-yes" />
                            <Label htmlFor="frost-free-yes">Ja</Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="nei" id="frost-free-no" data-testid="radio-frost-free-no" />
                            <Label htmlFor="frost-free-no">Nei</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="frostProtectionMeasure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tiltak for frostsikring</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2 mt-2"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="ingen" id="frost-none" data-testid="radio-frost-none" />
                            <Label htmlFor="frost-none">Ingen tiltak nødvendig</Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="isolering" id="frost-insulation" data-testid="radio-frost-insulation" />
                            <Label htmlFor="frost-insulation">Enkel isolering</Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="varmekabel" id="frost-heating" data-testid="radio-frost-heating" />
                            <Label htmlFor="frost-heating">Behov for varmekabel/Tining</Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="annet" id="frost-other" data-testid="radio-frost-other" />
                            <Label htmlFor="frost-other">Annet</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {frostProtectionMeasure === "annet" && (
                  <FormField
                    control={form.control}
                    name="frostProtectionOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spesifiser annet tiltak</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Beskriv annet tiltak"
                            data-testid="input-frost-other"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="frostProtectionComments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KOMMENTARER om Frostsikring og Krav</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Skriv kommentarer om frostsikring her..."
                          className="min-h-32"
                          data-testid="input-frost-comments"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground text-sm font-semibold">
                  4
                </div>
                <CardTitle className="text-lg">Teknisk Tilkobling og Fagfolk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="needsElectrician"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        Behov for Elektriker?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2 mt-2"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="ja" id="electrician-yes" data-testid="radio-electrician-yes" />
                            <Label htmlFor="electrician-yes">Ja</Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="nei" id="electrician-no" data-testid="radio-electrician-no" />
                            <Label htmlFor="electrician-no">Nei</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasNearbyPowerPoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tilgjengelig strømpunkt nær plassering?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2 mt-2"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="ja" id="power-yes" data-testid="radio-power-yes" />
                            <Label htmlFor="power-yes">Ja</Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="nei" id="power-no" data-testid="radio-power-no" />
                            <Label htmlFor="power-no">Nei</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {hasNearbyPowerPoint === "ja" && (
                  <FormField
                    control={form.control}
                    name="powerPointDistance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hvor langt unna? (m)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="F.eks. 5"
                            data-testid="input-power-distance"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {hasNearbyPowerPoint === "nei" && (
                  <FormField
                    control={form.control}
                    name="needsNewCircuit"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-new-circuit"
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Behov for ny kurs?
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="needsPlumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Behov for Rørlegger?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2 mt-2"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="ja" id="plumber-yes" data-testid="radio-plumber-yes" />
                            <Label htmlFor="plumber-yes">Ja</Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="nei" id="plumber-no" data-testid="radio-plumber-no" />
                            <Label htmlFor="plumber-no">Nei</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="existingDrainPipe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Eksisterende avløpsrør (Diameter/Materiale)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="F.eks.: Ø110 PVC-rør"
                          data-testid="input-drain-pipe"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="outletPoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Utløpspunkt (Beskriv hvor det rensede vannet skal ledes ut)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="F.eks.: Overflatevann/grøft, Utløp i bekk"
                          className="min-h-24"
                          data-testid="input-outlet-point"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="otherProfessionals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Eventuelle andre fagfolk som trengs</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="F.eks. graver, murer"
                          data-testid="input-other-professionals"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="technicalConnectionComments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KOMMENTARER om Teknisk Tilkobling</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Noter rørføringsmuligheter, vanskelighetsgrad for graving/trekking av strøm..."
                          className="min-h-32"
                          data-testid="input-technical-comments"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground text-sm font-semibold">
                  5
                </div>
                <CardTitle className="text-lg">Dokumentasjon og Logistikk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="flex items-center gap-2 mb-4">
                    <Camera className="w-4 h-4" />
                    Bilder fra eiendommen *
                  </Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Kreves min. 5 stk. Inkludert bilde av systemets plassering og tilkomst.
                  </p>
                  
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover-elevate transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      data-testid="input-image-upload"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer flex flex-col items-center gap-3"
                    >
                      {isUploading ? (
                        <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
                      ) : (
                        <Upload className="w-12 h-12 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">
                          {isUploading ? "Laster opp..." : "Klikk for å laste opp bilder"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          eller dra og slipp filer her
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {uploadedImages.length >= 5 ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : null}
                    <span className={`text-sm font-medium ${uploadedImages.length >= 5 ? "text-green-600" : "text-muted-foreground"}`}>
                      {uploadedImages.length} av minimum 5 bilder lastet opp
                    </span>
                  </div>

                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      {uploadedImages.map((path, index) => (
                        <div
                          key={index}
                          className="relative group rounded-lg overflow-visible bg-muted aspect-square flex items-center justify-center"
                        >
                          <Camera className="w-8 h-8 text-muted-foreground" />
                          <span className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                            Bilde {index + 1}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                            data-testid={`button-remove-image-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="logisticsComments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KOMMENTARER om Logistikk og Adkomst</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Noter adkomst for utstyr, lagringsplass, eventuelle hindringer..."
                          className="min-h-32"
                          data-testid="input-logistics-comments"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end pb-8">
              <Button
                type="submit"
                size="lg"
                className="w-full md:w-auto min-w-48"
                disabled={submitMutation.isPending}
                data-testid="button-submit-form"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sender...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Send Skjema
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
