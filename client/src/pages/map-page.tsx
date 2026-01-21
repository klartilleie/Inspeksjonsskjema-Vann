import { useState, useRef, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Droplets,
  Trash2,
  Download,
  ArrowLeft,
  MapPin,
  CircleDot,
  Settings,
  LogOut,
  Search,
  Loader2,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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

interface PriceEstimate {
  biocleaner: number;
  slamavskiller: number;
  installation: number;
  other: number;
}

function MapClickHandler({
  activeMarkerType,
  onAddMarker,
}: {
  activeMarkerType: string | null;
  onAddMarker: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (activeMarkerType) {
        onAddMarker(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function MapPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const searchString = useSearch();
  const mapRef = useRef<HTMLDivElement>(null);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [activeMarkerType, setActiveMarkerType] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [addressSearch, setAddressSearch] = useState("");
  const [technicalNotes, setTechnicalNotes] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const name = params.get("name");
    const address = params.get("address");
    if (name) setCustomerName(decodeURIComponent(name));
    if (address) {
      const decodedAddress = decodeURIComponent(address);
      setCustomerAddress(decodedAddress);
      setAddressSearch(decodedAddress);
    }
  }, [searchString]);
  const [prices, setPrices] = useState<PriceEstimate>({
    biocleaner: 45000,
    slamavskiller: 25000,
    installation: 15000,
    other: 0,
  });

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

  const getMarkerLabel = (type: string) => {
    switch (type) {
      case "biocleaner":
        return "Biocleaner";
      case "slamavskiller":
        return "Slamavskiller";
      case "utslippspunkt":
        return "Utslippspunkt";
      default:
        return type;
    }
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case "biocleaner":
        return biocleanerIcon;
      case "slamavskiller":
        return slamavkillerIcon;
      case "utslippspunkt":
        return utslippspunktIcon;
      default:
        return biocleanerIcon;
    }
  };

  const totalPrice = prices.biocleaner + prices.slamavskiller + prices.installation + prices.other;

  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Tilbud - Avløpsanlegg", pageWidth / 2, 20, { align: "center" });
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      
      let y = 40;
      
      pdf.setFont("helvetica", "bold");
      pdf.text("Kundeinformasjon", 20, y);
      y += 8;
      pdf.setFont("helvetica", "normal");
      pdf.text(`Kunde: ${customerName || "Ikke angitt"}`, 20, y);
      y += 6;
      pdf.text(`Adresse: ${customerAddress || "Ikke angitt"}`, 20, y);
      y += 15;
      
      pdf.setFont("helvetica", "bold");
      pdf.text("Teknisk informasjon - Biocleaner", 20, y);
      y += 8;
      pdf.setFont("helvetica", "normal");
      const techInfo = [
        "Biocleaner er et kompakt biologisk renseanlegg designet for",
        "private husholdninger og hytter. Systemet bruker naturlige",
        "biologiske prosesser for å rense avløpsvann effektivt.",
        "",
        "Kapasitet: 1-5 PE (personekvivalenter)",
        "Rensegrad: >90% for organisk materiale",
        "Strømforbruk: Ca. 1-2 kWh/dag",
        "Vedlikehold: Årlig service anbefales",
        "Levetid: 20-30 år med riktig vedlikehold",
      ];
      
      techInfo.forEach((line) => {
        pdf.text(line, 20, y);
        y += 5;
      });
      
      y += 10;
      
      pdf.setFont("helvetica", "bold");
      pdf.text("Prisoverslag", 20, y);
      y += 8;
      pdf.setFont("helvetica", "normal");
      
      pdf.text(`Biocleaner:`, 20, y);
      pdf.text(`kr ${prices.biocleaner.toLocaleString("nb-NO")},-`, 120, y);
      y += 6;
      
      pdf.text(`Slamavskiller:`, 20, y);
      pdf.text(`kr ${prices.slamavskiller.toLocaleString("nb-NO")},-`, 120, y);
      y += 6;
      
      pdf.text(`Installasjon:`, 20, y);
      pdf.text(`kr ${prices.installation.toLocaleString("nb-NO")},-`, 120, y);
      y += 6;
      
      if (prices.other > 0) {
        pdf.text(`Andre kostnader:`, 20, y);
        pdf.text(`kr ${prices.other.toLocaleString("nb-NO")},-`, 120, y);
        y += 6;
      }
      
      y += 4;
      pdf.setLineWidth(0.5);
      pdf.line(20, y, 160, y);
      y += 6;
      
      pdf.setFont("helvetica", "bold");
      pdf.text(`Total:`, 20, y);
      pdf.text(`kr ${totalPrice.toLocaleString("nb-NO")},-`, 120, y);
      y += 15;
      
      if (technicalNotes) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Notater", 20, y);
        y += 8;
        pdf.setFont("helvetica", "normal");
        const splitNotes = pdf.splitTextToSize(technicalNotes, 170);
        pdf.text(splitNotes, 20, y);
        y += splitNotes.length * 5 + 10;
      }
      
      if (mapRef.current) {
        const mapElement = mapRef.current.querySelector(".leaflet-container") as HTMLElement;
        if (mapElement) {
          const canvas = await html2canvas(mapElement, {
            useCORS: true,
            allowTaint: true,
            scale: 2,
          });
          
          const imgData = canvas.toDataURL("image/png");
          const imgWidth = 170;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          if (y + imgHeight > 280) {
            pdf.addPage();
            y = 20;
          }
          
          pdf.setFont("helvetica", "bold");
          pdf.text("Kartutsnitt med plassering", 20, y);
          y += 8;
          
          pdf.addImage(imgData, "PNG", 20, y, imgWidth, imgHeight);
          y += imgHeight + 10;
          
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          pdf.text("Tegnforklaring:", 20, y);
          y += 5;
          pdf.setFillColor(34, 197, 94);
          pdf.circle(25, y + 2, 3, "F");
          pdf.text("BC = Biocleaner", 32, y + 3);
          
          pdf.setFillColor(59, 130, 246);
          pdf.circle(80, y + 2, 3, "F");
          pdf.text("SA = Slamavskiller", 87, y + 3);
          
          pdf.setFillColor(239, 68, 68);
          pdf.circle(145, y + 2, 3, "F");
          pdf.text("UP = Utslippspunkt", 152, y + 3);
        }
      }
      
      const pdfBlob = pdf.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tilbud-${customerName || "avlopsanlegg"}-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "PDF generert",
        description: "Tilbudet er lastet ned som PDF.",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke generere PDF. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = "/"}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tilbake til skjema
            </Button>
            <img src={logoUrl} alt="Klar til Leie AS" className="h-12 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{user?.fullName}</span>
            {user?.role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = "/admin"}
                data-testid="button-admin"
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

        <h1 className="text-2xl font-semibold mb-6">Kartplanlegging og Tilbud</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Kart - Klikk for å plassere markører
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    variant={activeMarkerType === "biocleaner" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveMarkerType(activeMarkerType === "biocleaner" ? null : "biocleaner")}
                    data-testid="button-biocleaner"
                  >
                    <CircleDot className="w-4 h-4 mr-2 text-green-500" />
                    Biocleaner
                  </Button>
                  <Button
                    variant={activeMarkerType === "slamavskiller" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveMarkerType(activeMarkerType === "slamavskiller" ? null : "slamavskiller")}
                    data-testid="button-slamavskiller"
                  >
                    <CircleDot className="w-4 h-4 mr-2 text-blue-500" />
                    Slamavskiller
                  </Button>
                  <Button
                    variant={activeMarkerType === "utslippspunkt" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveMarkerType(activeMarkerType === "utslippspunkt" ? null : "utslippspunkt")}
                    data-testid="button-utslippspunkt"
                  >
                    <CircleDot className="w-4 h-4 mr-2 text-red-500" />
                    Utslippspunkt
                  </Button>
                </div>
                
                {activeMarkerType && (
                  <div className="mb-4 p-2 bg-muted rounded-md text-sm">
                    Klikk på kartet for å plassere: <strong>{getMarkerLabel(activeMarkerType)}</strong>
                  </div>
                )}
                
                <div className="flex gap-2 mb-4">
                  <div className="flex-1">
                    <Input
                      value={addressSearch}
                      onChange={(e) => setAddressSearch(e.target.value)}
                      placeholder="Søk etter adresse..."
                      data-testid="input-address-search"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "Adressesøk",
                        description: "Adresse-API er ikke konfigurert ennå. Kontakt administrator.",
                      });
                    }}
                    disabled={isSearching || !addressSearch}
                    data-testid="button-search-address"
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <div ref={mapRef} className="h-[500px] rounded-lg overflow-hidden border">
                  <MapContainer
                    center={[59.9139, 10.7522]}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler
                      activeMarkerType={activeMarkerType}
                      onAddMarker={handleAddMarker}
                    />
                    {markers.map((marker) => (
                      <Marker
                        key={marker.id}
                        position={marker.position}
                        icon={getMarkerIcon(marker.type)}
                      >
                        <Popup>
                          <div className="text-center">
                            <strong>{getMarkerLabel(marker.type)}</strong>
                            <br />
                            <Button
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
                  </MapContainer>
                </div>
                
                {markers.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {markers.map((marker) => (
                      <Badge
                        key={marker.id}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {getMarkerLabel(marker.type)}
                        <button
                          onClick={() => removeMarker(marker.id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Kundeinformasjon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Kundenavn</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Skriv kundenavn"
                    data-testid="input-customer-name"
                  />
                </div>
                <div>
                  <Label htmlFor="customerAddress">Adresse</Label>
                  <Input
                    id="customerAddress"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Skriv adresse"
                    data-testid="input-customer-address"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Droplets className="w-5 h-5" />
                  Prisoverslag
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="priceBiocleaner">Biocleaner (kr)</Label>
                  <Input
                    id="priceBiocleaner"
                    type="number"
                    value={prices.biocleaner}
                    onChange={(e) => setPrices({ ...prices, biocleaner: Number(e.target.value) })}
                    data-testid="input-price-biocleaner"
                  />
                </div>
                <div>
                  <Label htmlFor="priceSlamavskiller">Slamavskiller (kr)</Label>
                  <Input
                    id="priceSlamavskiller"
                    type="number"
                    value={prices.slamavskiller}
                    onChange={(e) => setPrices({ ...prices, slamavskiller: Number(e.target.value) })}
                    data-testid="input-price-slamavskiller"
                  />
                </div>
                <div>
                  <Label htmlFor="priceInstallation">Installasjon (kr)</Label>
                  <Input
                    id="priceInstallation"
                    type="number"
                    value={prices.installation}
                    onChange={(e) => setPrices({ ...prices, installation: Number(e.target.value) })}
                    data-testid="input-price-installation"
                  />
                </div>
                <div>
                  <Label htmlFor="priceOther">Andre kostnader (kr)</Label>
                  <Input
                    id="priceOther"
                    type="number"
                    value={prices.other}
                    onChange={(e) => setPrices({ ...prices, other: Number(e.target.value) })}
                    data-testid="input-price-other"
                  />
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>kr {totalPrice.toLocaleString("nb-NO")},-</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Notater</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={technicalNotes}
                  onChange={(e) => setTechnicalNotes(e.target.value)}
                  placeholder="Skriv tekniske notater eller merknader..."
                  rows={4}
                  data-testid="textarea-notes"
                />
              </CardContent>
            </Card>

            <Button
              className="w-full"
              size="lg"
              onClick={generatePDF}
              disabled={isGeneratingPdf}
              data-testid="button-generate-pdf"
            >
              {isGeneratingPdf ? (
                <>Genererer PDF...</>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Last ned PDF-tilbud
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
