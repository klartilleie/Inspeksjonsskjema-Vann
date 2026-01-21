import { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, useMapEvents, useMap, ScaleControl, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { clientInspectionFormSchema, type ClientInspectionFormData, BIOCLEANER_MODELS, BIOCLEANER_TYPES, STYRESKAP_OPTIONS, GRAVING_OPTIONS, DEFAULT_PRICES } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CircleDot,
  Trash2,
  Calculator,
  Printer,
  Info,
} from "lucide-react";
import logoUrl from "@assets/Lars_Logo-01_1765460766343.jpg";
import "leaflet/dist/leaflet.css";

const biocleanerIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="background-color: #22c55e; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"><span style="color: white; font-weight: bold; font-size: 12px;">BC</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const slamavkillerIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="background-color: #3b82f6; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"><span style="color: white; font-weight: bold; font-size: 12px;">SA</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const utslippspunktIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"><span style="color: white; font-weight: bold; font-size: 12px;">UP</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface MarkerData {
  id: string;
  type: "biocleaner" | "slamavskiller" | "utslippspunkt";
  position: [number, number];
}

interface PipeLineData {
  id: string;
  points: [number, number][];
  label: string;
  color: string;
}

function calculateDistance(point1: [number, number], point2: [number, number]): number {
  const R = 6371000;
  const lat1 = point1[0] * Math.PI / 180;
  const lat2 = point2[0] * Math.PI / 180;
  const deltaLat = (point2[0] - point1[0]) * Math.PI / 180;
  const deltaLon = (point2[1] - point1[1]) * Math.PI / 180;
  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getTotalPipeLength(points: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistance(points[i], points[i + 1]);
  }
  return total;
}

function MapClickHandler({
  activeMarkerType,
  onAddMarker,
  isDrawingPipe,
  onAddPipePoint,
}: {
  activeMarkerType: string | null;
  onAddMarker: (lat: number, lng: number) => void;
  isDrawingPipe: boolean;
  onAddPipePoint: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (isDrawingPipe) {
        onAddPipePoint(e.latlng.lat, e.latlng.lng);
      } else if (activeMarkerType) {
        onAddMarker(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

interface KartverketAddress {
  adressetekst: string;
  adressenavn: string;
  nummer: number;
  bokstav?: string;
  postnummer: string;
  poststed: string;
  kommunenavn: string;
  representasjonspunkt: {
    lat: number;
    lon: number;
  };
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 21);
  }, [center, map]);
  return null;
}

function MapInfoControl() {
  const map = useMap();
  
  useEffect(() => {
    const InfoControl = L.Control.extend({
      onAdd: function() {
        const div = L.DomUtil.create("div", "map-info-control");
        const today = new Date().toLocaleDateString("nb-NO", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        div.innerHTML = `
          <div style="background: white; padding: 10px 15px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-family: system-ui, sans-serif;">
            <div style="font-weight: bold; font-size: 14px; color: #1a1a1a; margin-bottom: 4px;">Situasjonsplan for Biocleaner</div>
            <div style="font-size: 12px; color: #666;">${today}</div>
          </div>
        `;
        return div;
      }
    });
    
    const infoControl = new InfoControl({ position: "topright" });
    infoControl.addTo(map);
    
    return () => {
      infoControl.remove();
    };
  }, [map]);
  
  return null;
}

function PrintMapControl({ onPrint }: { onPrint: () => void }) {
  const map = useMap();
  
  useEffect(() => {
    const PrintControl = L.Control.extend({
      onAdd: function() {
        const div = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        const button = L.DomUtil.create("a", "", div);
        button.href = "#";
        button.title = "Skriv ut kart (1:500)";
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 5px;"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>`;
        button.style.display = "flex";
        button.style.alignItems = "center";
        button.style.justifyContent = "center";
        button.style.width = "30px";
        button.style.height = "30px";
        button.style.cursor = "pointer";
        
        L.DomEvent.on(button, "click", (e: Event) => {
          e.preventDefault();
          onPrint();
        });
        
        return div;
      }
    });
    
    const printControl = new PrintControl({ position: "topleft" });
    printControl.addTo(map);
    
    return () => {
      printControl.remove();
    };
  }, [map, onPrint]);
  
  return null;
}

export default function InspectionForm() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [activeMarkerType, setActiveMarkerType] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([59.9139, 10.7522]);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<KartverketAddress[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [pipeLines, setPipeLines] = useState<PipeLineData[]>([]);
  const [isDrawingPipe, setIsDrawingPipe] = useState(false);
  const [currentPipePoints, setCurrentPipePoints] = useState<[number, number][]>([]);
  const [currentPipeLabel, setCurrentPipeLabel] = useState("");
  const [currentPipeColor, setCurrentPipeColor] = useState("#8B4513");
  const addressInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const handleMarkerDrag = useCallback((markerId: string, newPosition: L.LatLng) => {
    setMarkers(prev => prev.map(m => 
      m.id === markerId 
        ? { ...m, position: [newPosition.lat, newPosition.lng] as [number, number] }
        : m
    ));
  }, []);

  const handlePrintMap = useCallback(() => {
    if (!mapRef.current) return;
    
    const map = mapRef.current;
    const center = map.getCenter();
    const targetScale = 500;
    const dpi = 96;
    const metersPerPixelAtScale = targetScale / (dpi * 39.3701);
    const metersPerDegree = 111320 * Math.cos(center.lat * Math.PI / 180);
    const degreesPerPixel = metersPerPixelAtScale / metersPerDegree;
    const targetZoom = Math.log2((360 / 256) / degreesPerPixel);
    
    map.setZoom(Math.round(targetZoom));
    
    setTimeout(() => {
      toast({
        title: "Klar for utskrift",
        description: "Kartet er justert til målestokk 1:500. Bruk Ctrl+P for å skrive ut.",
      });
      window.print();
    }, 500);
  }, [toast]);

  const handleAddMarker = (lat: number, lng: number) => {
    if (!activeMarkerType) return;
    const newMarker: MarkerData = {
      id: `${Date.now()}`,
      type: activeMarkerType as MarkerData["type"],
      position: [lat, lng],
    };
    setMarkers((prev) => [...prev, newMarker]);
    toast({
      title: "Markør plassert",
      description: `${getMarkerLabel(activeMarkerType)} er lagt til på kartet.`,
    });
  };

  const removeMarker = (id: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddPipePoint = useCallback((lat: number, lng: number) => {
    setCurrentPipePoints(prev => [...prev, [lat, lng]]);
  }, []);

  const startDrawingPipe = (label: string, color: string) => {
    setActiveMarkerType(null);
    setIsDrawingPipe(true);
    setCurrentPipeLabel(label);
    setCurrentPipeColor(color);
    setCurrentPipePoints([]);
    toast({
      title: "Tegnemodus aktivert",
      description: `Klikk på kartet for å tegne ${label}. Dobbeltklikk for å avslutte.`,
    });
  };

  const finishDrawingPipe = useCallback(() => {
    if (currentPipePoints.length >= 2) {
      const newPipe: PipeLineData = {
        id: `pipe-${Date.now()}`,
        points: currentPipePoints,
        label: currentPipeLabel,
        color: currentPipeColor,
      };
      setPipeLines(prev => [...prev, newPipe]);
      toast({
        title: "Rør tegnet",
        description: `${currentPipeLabel}: ${getTotalPipeLength(currentPipePoints).toFixed(1)} meter`,
      });
    }
    setIsDrawingPipe(false);
    setCurrentPipePoints([]);
    setCurrentPipeLabel("");
  }, [currentPipePoints, currentPipeLabel, currentPipeColor, toast]);

  const removePipeLine = (id: string) => {
    setPipeLines(prev => prev.filter(p => p.id !== id));
  };

  const getMarkerLabel = (type: string) => {
    switch (type) {
      case "biocleaner": return "Biocleaner";
      case "slamavskiller": return "Slamavskiller";
      case "utslippspunkt": return "Utslippspunkt";
      default: return type;
    }
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case "biocleaner": return biocleanerIcon;
      case "slamavskiller": return slamavkillerIcon;
      case "utslippspunkt": return utslippspunktIcon;
      default: return biocleanerIcon;
    }
  };

  const form = useForm<ClientInspectionFormData>({
    resolver: zodResolver(clientInspectionFormSchema),
    defaultValues: {
      customerName: "",
      customerAddress: "",
      streetName: "",
      houseNumber: "",
      postalCode: "",
      city: "",
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
      mapMarkers: [],
      mapNotes: "",
      biocleanerModel: "",
      biocleanerType: "optima",
      biocleanerPrice: 0,
      numberOfHomes: "1",
      styreskapSize: "small",
      styreskapPrice: STYRESKAP_OPTIONS[0].defaultPrice,
      soknadUtslippPrice: DEFAULT_PRICES.soknadUtslipp,
      soknadDispensasjonPrice: DEFAULT_PRICES.soknadDispensasjon,
      innreguleringPrice: DEFAULT_PRICES.innregulering,
      gravingPrice: DEFAULT_PRICES.graving,
      fraktPrice: DEFAULT_PRICES.frakt,
      offerSum: 0,
      offerMva: 0,
      offerTotal: 0,
      offerComments: "",
    },
  });

  const watchBiocleanerModel = form.watch("biocleanerModel");
  const watchBiocleanerType = form.watch("biocleanerType");
  const watchBiocleanerPrice = form.watch("biocleanerPrice");
  const watchStyreskapPrice = form.watch("styreskapPrice");
  const watchSoknadUtslippPrice = form.watch("soknadUtslippPrice");
  const watchSoknadDispensasjonPrice = form.watch("soknadDispensasjonPrice");
  const watchInnreguleringPrice = form.watch("innreguleringPrice");
  const watchGravingPrice = form.watch("gravingPrice");
  const watchFraktPrice = form.watch("fraktPrice");

  const calculateOfferTotals = () => {
    const sum = (watchBiocleanerPrice || 0) + 
                (watchStyreskapPrice || 0) + 
                (watchSoknadUtslippPrice || 0) + 
                (watchSoknadDispensasjonPrice || 0) + 
                (watchInnreguleringPrice || 0) + 
                (watchGravingPrice || 0) + 
                (watchFraktPrice || 0);
    const mva = Math.round(sum * 0.25);
    const total = sum + mva;
    return { sum, mva, total };
  };

  const offerTotals = calculateOfferTotals();

  const calculateBiocleanerPrice = useCallback((modelId: string, typeId: string) => {
    const model = BIOCLEANER_MODELS.find(m => m.id === modelId);
    if (!model) return 0;
    
    if (typeId === "optima") {
      return model.optimaPrice || 0;
    } else if (typeId === "comfort") {
      return model.comfortPrice || 0;
    } else if (typeId === "exclusive") {
      return (model.comfortPrice || 0) + (model.exclusiveTillegg || 0);
    }
    return 0;
  }, []);

  const handleBiocleanerModelChange = (modelId: string) => {
    form.setValue("biocleanerModel", modelId);
    const model = BIOCLEANER_MODELS.find(m => m.id === modelId);
    let currentType = form.getValues("biocleanerType") || "optima";
    
    // If optima is selected but not available for this model, switch to comfort
    if (currentType === "optima" && model && model.optimaPrice === null) {
      currentType = "comfort";
      form.setValue("biocleanerType", currentType);
    }
    
    const price = calculateBiocleanerPrice(modelId, currentType);
    form.setValue("biocleanerPrice", price);
  };

  const handleBiocleanerTypeChange = (typeId: string) => {
    form.setValue("biocleanerType", typeId);
    const currentModel = form.getValues("biocleanerModel");
    if (currentModel) {
      const price = calculateBiocleanerPrice(currentModel, typeId);
      form.setValue("biocleanerPrice", price);
    }
  };

  const searchKartverketAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    
    setIsSearchingAddress(true);
    try {
      const response = await fetch(
        `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(query)}&treffPerSide=10`
      );
      const data = await response.json();
      if (data.adresser) {
        setAddressSuggestions(data.adresser);
        setShowAddressSuggestions(true);
      }
    } catch (error) {
      console.error("Feil ved adressesøk:", error);
    } finally {
      setIsSearchingAddress(false);
    }
  }, []);

  const handleAddressSelect = useCallback((address: KartverketAddress) => {
    const streetWithNumber = `${address.adressenavn} ${address.nummer}${address.bokstav || ""}`;
    const fullAddress = `${streetWithNumber}, ${address.postnummer} ${address.poststed}`;
    
    form.setValue("customerAddress", fullAddress);
    form.setValue("streetName", address.adressenavn);
    form.setValue("houseNumber", `${address.nummer}${address.bokstav || ""}`);
    form.setValue("postalCode", address.postnummer);
    form.setValue("city", address.poststed);
    
    setAddressQuery(fullAddress);
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
    
    if (address.representasjonspunkt) {
      const lat = address.representasjonspunkt.lat;
      const lng = address.representasjonspunkt.lon;
      setMapCenter([lat, lng]);
      toast({
        title: "Adresse funnet",
        description: `Kartet er oppdatert til ${fullAddress}`,
      });
    }
  }, [form, toast]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (addressQuery.length >= 3) {
        searchKartverketAddress(addressQuery);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [addressQuery, searchKartverketAddress]);

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
        streetName: "",
        houseNumber: "",
        postalCode: "",
        city: "",
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
        mapMarkers: [],
        mapNotes: "",
      });
      setUploadedImages([]);
      setMarkers([]);
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
    const totals = calculateOfferTotals();
    const formDataWithExtras = {
      ...data,
      mapMarkers: markers,
      offerSum: totals.sum,
      offerMva: totals.mva,
      offerTotal: totals.total,
    };
    submitMutation.mutate(formDataWithExtras);
  };

  const frostProtectionMeasure = form.watch("frostProtectionMeasure");
  const hasNearbyPowerPoint = form.watch("hasNearbyPowerPoint");

  const handleLogout = async () => {
    await logout();
  };

  
  const content = (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span data-testid="text-logged-in-user">{user?.fullName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
                    <FormItem className="relative">
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Søk etter adresse *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            ref={addressInputRef}
                            placeholder="Begynn å skrive adresse..."
                            data-testid="input-customer-address"
                            value={addressQuery}
                            onChange={(e) => {
                              setAddressQuery(e.target.value);
                              field.onChange(e.target.value);
                            }}
                            onFocus={() => {
                              if (addressSuggestions.length > 0) {
                                setShowAddressSuggestions(true);
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => setShowAddressSuggestions(false), 200);
                            }}
                          />
                          {isSearchingAddress && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </FormControl>
                      {showAddressSuggestions && addressSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                          {addressSuggestions.map((address, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full px-3 py-2 text-left hover:bg-accent text-sm border-b last:border-b-0"
                              onClick={() => handleAddressSelect(address)}
                              data-testid={`address-suggestion-${index}`}
                            >
                              <div className="font-medium">{address.adressetekst}</div>
                              <div className="text-xs text-muted-foreground">
                                {address.postnummer} {address.poststed}, {address.kommunenavn}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Velg fra listen for å fylle ut adressefelt og vise på kartet
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="streetName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vegnavn</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Vegnavn"
                            data-testid="input-street-name"
                            readOnly
                            className="bg-muted"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="houseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Husnummer</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nr."
                            data-testid="input-house-number"
                            readOnly
                            className="bg-muted"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postnummer</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0000"
                            data-testid="input-postal-code"
                            readOnly
                            className="bg-muted"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Poststed</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Poststed"
                            data-testid="input-city"
                            readOnly
                            className="bg-muted"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

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

            <Card>
              <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground text-sm font-semibold">
                  6
                </div>
                <CardTitle className="text-lg">Plasseringstegning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Marker plasseringen av Biocleaner, Slamavskiller og Utslippspunkt på kartet.
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    type="button"
                    variant={activeMarkerType === "biocleaner" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveMarkerType(activeMarkerType === "biocleaner" ? null : "biocleaner")}
                    data-testid="button-biocleaner"
                  >
                    <CircleDot className="w-4 h-4 mr-2 text-green-500" />
                    Biocleaner
                  </Button>
                  <Button
                    type="button"
                    variant={activeMarkerType === "slamavskiller" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveMarkerType(activeMarkerType === "slamavskiller" ? null : "slamavskiller")}
                    data-testid="button-slamavskiller"
                  >
                    <CircleDot className="w-4 h-4 mr-2 text-blue-500" />
                    Slamavskiller
                  </Button>
                  <Button
                    type="button"
                    variant={activeMarkerType === "utslippspunkt" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveMarkerType(activeMarkerType === "utslippspunkt" ? null : "utslippspunkt")}
                    data-testid="button-utslippspunkt"
                  >
                    <CircleDot className="w-4 h-4 mr-2 text-red-500" />
                    Utslippspunkt
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-sm text-muted-foreground self-center mr-2">Tegn rør:</span>
                  <Button
                    type="button"
                    variant={isDrawingPipe && currentPipeLabel === "Rørgate" ? "default" : "outline"}
                    size="sm"
                    onClick={() => startDrawingPipe("Rørgate", "#8B4513")}
                    data-testid="button-draw-pipe"
                  >
                    Rørgate (brun)
                  </Button>
                  <Button
                    type="button"
                    variant={isDrawingPipe && currentPipeLabel === "Avløp" ? "default" : "outline"}
                    size="sm"
                    onClick={() => startDrawingPipe("Avløp", "#666666")}
                    data-testid="button-draw-drain"
                  >
                    Avløp (grå)
                  </Button>
                  <Button
                    type="button"
                    variant={isDrawingPipe && currentPipeLabel === "Utslipp" ? "default" : "outline"}
                    size="sm"
                    onClick={() => startDrawingPipe("Utslipp", "#0066cc")}
                    data-testid="button-draw-outlet"
                  >
                    Utslipp (blå)
                  </Button>
                  {isDrawingPipe && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={finishDrawingPipe}
                      data-testid="button-finish-pipe"
                    >
                      Fullfør tegning ({currentPipePoints.length} punkter)
                    </Button>
                  )}
                </div>
                
                {activeMarkerType && (
                  <div className="mb-4 p-2 bg-muted rounded-md text-sm">
                    Klikk på kartet for å plassere: <strong>{getMarkerLabel(activeMarkerType)}</strong>
                  </div>
                )}

                {isDrawingPipe && (
                  <div className="mb-4 p-2 bg-amber-100 dark:bg-amber-900 rounded-md text-sm">
                    Tegner: <strong>{currentPipeLabel}</strong> - Klikk for å legge til punkter. Klikk "Fullfør tegning" når ferdig.
                    {currentPipePoints.length >= 2 && (
                      <span className="ml-2">Lengde: {getTotalPipeLength(currentPipePoints).toFixed(1)} m</span>
                    )}
                  </div>
                )}
                
                <div className="h-[600px] rounded-lg overflow-hidden border">
                  <MapContainer
                    center={mapCenter}
                    zoom={18}
                    maxZoom={21}
                    style={{ height: "100%", width: "100%" }}
                    ref={mapRef}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://kartverket.no">Kartverket</a>'
                      url="https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png"
                      maxNativeZoom={18}
                      maxZoom={21}
                    />
                    <WMSTileLayer
                      url="https://wms.geonorge.no/skwms1/wms.matrikkel.eiendomsgrenser?"
                      layers="eiendomsgrense"
                      format="image/png"
                      transparent={true}
                      opacity={0.7}
                      attribution='&copy; <a href="https://kartverket.no">Kartverket - Matrikkelen</a>'
                    />
                    <ScaleControl position="bottomleft" metric={true} imperial={false} />
                    <MapInfoControl />
                    <PrintMapControl onPrint={handlePrintMap} />
                    <MapUpdater center={mapCenter} />
                    <MapClickHandler
                      activeMarkerType={activeMarkerType}
                      onAddMarker={handleAddMarker}
                      isDrawingPipe={isDrawingPipe}
                      onAddPipePoint={handleAddPipePoint}
                    />
                    {markers.map((marker) => (
                      <Marker
                        key={marker.id}
                        position={marker.position}
                        icon={getMarkerIcon(marker.type)}
                        draggable={true}
                        eventHandlers={{
                          dragend: (e) => {
                            handleMarkerDrag(marker.id, e.target.getLatLng());
                          },
                        }}
                      >
                        <Popup>
                          <div className="text-center">
                            <strong>{getMarkerLabel(marker.type)}</strong>
                            <p className="text-xs text-gray-500 mt-1">Dra for å flytte</p>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="mt-2"
                              onClick={() => removeMarker(marker.id)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Fjern
                            </Button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    
                    {/* Completed pipe lines */}
                    {pipeLines.map((pipe) => (
                      <Polyline
                        key={pipe.id}
                        positions={pipe.points}
                        pathOptions={{ 
                          color: pipe.color, 
                          weight: 4,
                          dashArray: pipe.label === "Utslipp" ? "10, 10" : undefined
                        }}
                      >
                        <Tooltip permanent direction="center">
                          {pipe.label}: {getTotalPipeLength(pipe.points).toFixed(1)} m
                        </Tooltip>
                      </Polyline>
                    ))}
                    
                    {/* Current drawing line */}
                    {isDrawingPipe && currentPipePoints.length >= 1 && (
                      <Polyline
                        positions={currentPipePoints}
                        pathOptions={{ 
                          color: currentPipeColor, 
                          weight: 4,
                          opacity: 0.7,
                          dashArray: "5, 10"
                        }}
                      />
                    )}
                  </MapContainer>
                </div>
                
                {markers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="text-sm text-muted-foreground self-center">Markører:</span>
                    {markers.map((marker) => (
                      <Badge
                        key={marker.id}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            marker.type === "biocleaner"
                              ? "bg-green-500"
                              : marker.type === "slamavskiller"
                              ? "bg-blue-500"
                              : "bg-red-500"
                          }`}
                        />
                        {getMarkerLabel(marker.type)}
                        <button
                          type="button"
                          onClick={() => removeMarker(marker.id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {pipeLines.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-sm text-muted-foreground self-center">Rørlinjer:</span>
                    {pipeLines.map((pipe) => (
                      <Badge
                        key={pipe.id}
                        variant="secondary"
                        className="flex items-center gap-1"
                        style={{ borderLeft: `4px solid ${pipe.color}` }}
                      >
                        {pipe.label}: {getTotalPipeLength(pipe.points).toFixed(1)} m
                        <button
                          type="button"
                          onClick={() => removePipeLine(pipe.id)}
                          className="ml-1 hover:text-destructive"
                          data-testid={`button-remove-pipe-${pipe.id}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex justify-end mt-4 print:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePrintMap}
                    data-testid="button-print-map"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Skriv ut kart (1:500)
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name="mapNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notater til plasseringstegning</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Beskriv plasseringen, avstander, terrenget..."
                          className="min-h-24"
                          data-testid="input-map-notes"
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
              <CardHeader className="bg-primary/5 rounded-t-lg">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Tilbud på Biocleaner renseanlegg
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Biocleaner-modell</Label>
                    <Select
                      value={watchBiocleanerModel || ""}
                      onValueChange={handleBiocleanerModelChange}
                      data-testid="select-biocleaner-model"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg modell" />
                      </SelectTrigger>
                      <SelectContent>
                        {BIOCLEANER_MODELS.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <FormField
                    control={form.control}
                    name="biocleanerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={handleBiocleanerTypeChange}
                          data-testid="select-biocleaner-type"
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Velg type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BIOCLEANER_TYPES.map((type) => {
                              const selectedModelId = form.getValues("biocleanerModel");
                              const selectedModel = BIOCLEANER_MODELS.find(m => m.id === selectedModelId);
                              const isDisabled = type.id === "optima" && selectedModel && selectedModel.optimaPrice === null;
                              return (
                                <SelectItem key={type.id} value={type.id} disabled={isDisabled}>
                                  {type.name} - {type.description} {isDisabled && "(utgår)"}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="numberOfHomes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Antall boliger/hytter</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="f.eks. 1 enebolig" 
                            data-testid="input-number-of-homes"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <h4 className="font-medium text-sm text-muted-foreground">Prisdetaljer</h4>
                  
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Biocleaner renseanlegg</span>
                      <FormField
                        control={form.control}
                        name="biocleanerPrice"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 mb-0">
                            <FormControl>
                              <Input 
                                type="number"
                                className="w-28 text-right"
                                data-testid="input-biocleaner-price"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <span className="text-sm text-muted-foreground">kr</span>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Styreskap</span>
                      <div className="flex items-center gap-2">
                        <FormField
                          control={form.control}
                          name="styreskapSize"
                          render={({ field }) => (
                            <FormItem className="mb-0">
                              <Select
                                value={field.value}
                                onValueChange={(val) => {
                                  field.onChange(val);
                                  const option = STYRESKAP_OPTIONS.find(o => o.id === val);
                                  if (option) {
                                    form.setValue("styreskapPrice", option.defaultPrice);
                                  }
                                }}
                                data-testid="select-styreskap-size"
                              >
                                <FormControl>
                                  <SelectTrigger className="w-28">
                                    <SelectValue placeholder="Velg" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {STYRESKAP_OPTIONS.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                      {option.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="styreskapPrice"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 mb-0">
                              <FormControl>
                                <Input 
                                  type="number"
                                  className="w-28 text-right bg-muted"
                                  data-testid="input-styreskap-price"
                                  readOnly
                                  {...field}
                                />
                              </FormControl>
                              <span className="text-sm text-muted-foreground">kr</span>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Søknad om utslipp</span>
                      <FormField
                        control={form.control}
                        name="soknadUtslippPrice"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 mb-0">
                            <FormControl>
                              <Input 
                                type="number"
                                className="w-28 text-right bg-muted"
                                data-testid="input-soknad-utslipp-price"
                                readOnly
                                {...field}
                              />
                            </FormControl>
                            <span className="text-sm text-muted-foreground">kr</span>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Søknad om dispensasjon</span>
                      <FormField
                        control={form.control}
                        name="soknadDispensasjonPrice"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 mb-0">
                            <FormControl>
                              <Input 
                                type="number"
                                className="w-28 text-right bg-muted"
                                data-testid="input-soknad-dispensasjon-price"
                                readOnly
                                {...field}
                              />
                            </FormControl>
                            <span className="text-sm text-muted-foreground">kr</span>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Innregulering/oppstart/montering</span>
                      <FormField
                        control={form.control}
                        name="innreguleringPrice"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 mb-0">
                            <FormControl>
                              <Input 
                                type="number"
                                className="w-28 text-right bg-muted"
                                data-testid="input-innregulering-price"
                                readOnly
                                {...field}
                              />
                            </FormControl>
                            <span className="text-sm text-muted-foreground">kr</span>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Graving med singel</span>
                      <FormField
                        control={form.control}
                        name="gravingPrice"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 mb-0">
                            <Select
                              value={String(field.value)}
                              onValueChange={(val) => field.onChange(parseInt(val))}
                              data-testid="select-graving-price"
                            >
                              <FormControl>
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Velg pris" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {GRAVING_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={String(option.value)}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Frakt</span>
                      <FormField
                        control={form.control}
                        name="fraktPrice"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 mb-0">
                            <FormControl>
                              <Input 
                                type="number"
                                className="w-28 text-right bg-muted"
                                data-testid="input-frakt-price"
                                readOnly
                                {...field}
                              />
                            </FormControl>
                            <span className="text-sm text-muted-foreground">kr</span>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="border-t pt-3 mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Sum</span>
                        <span className="text-sm font-medium" data-testid="text-offer-sum">
                          kr {offerTotals.sum.toLocaleString("nb-NO")},-
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Mva (25%)</span>
                        <span className="text-sm" data-testid="text-offer-mva">
                          kr {offerTotals.mva.toLocaleString("nb-NO")},-
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t pt-2">
                        <span className="font-semibold">FRA - Totalpris</span>
                        <span className="font-semibold text-lg" data-testid="text-offer-total">
                          kr {offerTotals.total.toLocaleString("nb-NO")},-
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="font-semibold">TIL - Totalpris inkl. avsetning</span>
                        <span className="font-semibold text-lg" data-testid="text-offer-total-alt2">
                          kr {(offerTotals.total + 20000).toLocaleString("nb-NO")},-
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Dette beløpet inkluderer en avsetning på inntil 20 000 kr for å dekke uforutsette utfordringer i arbeidet (f.eks. ved behov for sprengning, kiling av fjell, fjerning av uventede masser eller ekstra sikring). Dette beløpet faktureres kun dersom slike forhold oppstår, og etter nærmere avtale med kunden.
                      </p>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="offerComments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kommentarer til tilbudet</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Eventuelle tilleggsopplysninger eller kommentarer..."
                          className="min-h-24"
                          data-testid="input-offer-comments"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Vilkår for tilbud</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[9pt] text-muted-foreground space-y-2 leading-relaxed">
                  <p>Dette tilbudet er gyldig i 30 dager fra datering.</p>
                  <p><strong>Offentlige gebyrer:</strong> Alle oppgitte priser er eksklusive saksbehandlingsgebyrer fra kommunen. Slike gebyrer faktureres direkte fra kommunen til kunden.</p>
                  <p><strong>Forbehold:</strong> Tilbudet forutsetter godkjent utslippstillatelse fra kommunen basert på prosjektert plassering i kartet.</p>
                  <p><strong>Kontrakt:</strong> Endelige vilkår, garantier og fremdriftsplan fremkommer i den formelle utførelseskontrakten og ikke i dette tilbudet.</p>
                </div>
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

  return content;
}

