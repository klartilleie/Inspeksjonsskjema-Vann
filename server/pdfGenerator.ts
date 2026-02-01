import PDFDocument from "pdfkit";
import type { Inspection } from "@shared/schema";

const translateValue = (value: string | null | undefined | boolean): string => {
  if (value === null || value === undefined) return "Ikke spesifisert";
  if (typeof value === "boolean") return value ? "Ja" : "Nei";
  
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

export function generateInspectionPDF(inspection: Inspection): PDFKit.PDFDocument {
  const doc = new PDFDocument({ 
    margin: 50,
    size: 'A4',
    bufferPages: true
  });

  const primaryColor = "#1e3a5f";
  const textColor = "#333333";
  const labelColor = "#666666";

  doc.fontSize(24).fillColor(primaryColor).text("Befaringsskjema", { align: "center" });
  doc.fontSize(12).fillColor(labelColor).text("Lett Avløps-/Gråvannsystem", { align: "center" });
  doc.moveDown(2);

  const addSection = (title: string) => {
    doc.moveDown(1);
    doc.fontSize(14).fillColor(primaryColor).text(title);
    doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).strokeColor(primaryColor).stroke();
    doc.moveDown(0.5);
  };

  const addField = (label: string, value: string | null | undefined | boolean) => {
    const displayValue = translateValue(value);
    doc.fontSize(10).fillColor(labelColor).text(label);
    doc.fontSize(11).fillColor(textColor).text(displayValue);
    doc.moveDown(0.5);
  };

  const checkPageBreak = (requiredSpace: number = 100) => {
    if (doc.y + requiredSpace > doc.page.height - 80) {
      doc.addPage();
    }
  };

  addSection("1. Kundeinformasjon");
  addField("Kundenavn", inspection.customerName);
  addField("Adresse", inspection.customerAddress);
  addField("E-post", inspection.customerEmail);
  addField("Telefon", inspection.customerPhone);
  addField("Befaringsdato", inspection.inspectionDateTime);
  addField("Rapport fylt ut av", inspection.reportFilledBy);
  addField("Offentlig ordre", inspection.hasPublicOrder);

  checkPageBreak();
  addSection("2. Avløpsløsning");
  addField("Eksisterende avløpsløsning", inspection.existingDrainageSolution);
  addField("Egen brønn", inspection.hasOwnWell);
  addField("Planlagt løsning for gråvann", inspection.plannedSolutionType);
  addField("Avstand til nabogrense", inspection.distanceToNeighborBorder);
  addField("Nabokonflikt", inspection.hasNeighborConflict);

  checkPageBreak();
  addSection("3. Plassering og frostsikring");
  addField("Planlagt plassering", inspection.plannedPlacement);
  addField("Målt klaring", inspection.measuredClearance);
  addField("Naturlig frostfritt", inspection.isNaturallyFrostFree);
  addField("Frostsikringstiltak", inspection.frostProtectionMeasure);
  if (inspection.frostProtectionOther) {
    addField("Annet frostsikringstiltak", inspection.frostProtectionOther);
  }
  if (inspection.frostProtectionComments) {
    addField("Kommentarer til frostsikring", inspection.frostProtectionComments);
  }

  checkPageBreak();
  addSection("4. Tekniske tilkoblinger");
  addField("Trenger elektriker", inspection.needsElectrician);
  addField("Strømpunkt i nærheten", inspection.hasNearbyPowerPoint);
  if (inspection.powerPointDistance) {
    addField("Avstand til strømpunkt", inspection.powerPointDistance);
  }
  addField("Ny kurs nødvendig", inspection.needsNewCircuit);
  addField("Trenger rørlegger", inspection.needsPlumber);
  if (inspection.existingDrainPipe) {
    addField("Eksisterende avløpsrør", inspection.existingDrainPipe);
  }
  if (inspection.outletPoint) {
    addField("Utløpspunkt", inspection.outletPoint);
  }
  if (inspection.otherProfessionals) {
    addField("Andre fagfolk", inspection.otherProfessionals);
  }
  if (inspection.technicalConnectionComments) {
    addField("Kommentarer til tekniske tilkoblinger", inspection.technicalConnectionComments);
  }

  checkPageBreak();
  addSection("5. Dokumentasjon og bilder");
  addField("Antall bilder lastet opp", `${inspection.imageCount} bilder`);
  addField("Bilder lastet opp", inspection.imagesUploaded);
  
  if (inspection.imagePaths && inspection.imagePaths.length > 0) {
    doc.fontSize(10).fillColor(labelColor).text("Bilde-URLer:");
    inspection.imagePaths.forEach((path, index) => {
      doc.fontSize(9).fillColor(textColor).text(`  ${index + 1}. ${path}`, { width: 495 });
    });
    doc.moveDown(0.5);
  }
  
  if (inspection.logisticsComments) {
    addField("Logistikkkommentarer", inspection.logisticsComments);
  }

  // Tilbud/pris-seksjon
  if (inspection.offerTotal || inspection.biocleanerPrice) {
    checkPageBreak();
    addSection("6. Tilbud");
    
    if (inspection.biocleanerModel) {
      addField("Biocleaner modell", `${inspection.biocleanerModel} - ${inspection.biocleanerType || ''}`);
      if (inspection.biocleanerPrice) {
        addField("Biocleaner pris", `kr ${inspection.biocleanerPrice.toLocaleString('nb-NO')},-`);
      }
    }
    if (inspection.styreskapSize) {
      addField("Styreskap", inspection.styreskapSize);
      if (inspection.styreskapPrice) {
        addField("Styreskap pris", `kr ${inspection.styreskapPrice.toLocaleString('nb-NO')},-`);
      }
    }
    if (inspection.soknadUtslippPrice) {
      addField("Søknad om utslippstillatelse", `kr ${inspection.soknadUtslippPrice.toLocaleString('nb-NO')},-`);
    }
    if (inspection.soknadDispensasjonPrice) {
      addField("Søknad om dispensasjon", `kr ${inspection.soknadDispensasjonPrice.toLocaleString('nb-NO')},-`);
    }
    if (inspection.innreguleringPrice) {
      addField("Innregulering/oppstart/montering", `kr ${inspection.innreguleringPrice.toLocaleString('nb-NO')},-`);
    }
    if (inspection.gravingPrice) {
      addField("Graving med singel", `kr ${inspection.gravingPrice.toLocaleString('nb-NO')},-`);
    }
    if (inspection.fraktPrice) {
      addField("Frakt", `kr ${inspection.fraktPrice.toLocaleString('nb-NO')},-`);
    }
    
    doc.moveDown(0.5);
    if (inspection.offerSum) {
      addField("Sum", `kr ${inspection.offerSum.toLocaleString('nb-NO')},-`);
    }
    if (inspection.offerMva) {
      addField("Mva (25%)", `kr ${inspection.offerMva.toLocaleString('nb-NO')},-`);
    }
    if (inspection.offerTotal) {
      doc.fontSize(12).fillColor(primaryColor).text(`FRA - Totalpris: kr ${inspection.offerTotal.toLocaleString('nb-NO')},-`);
      doc.moveDown(0.5);
    }
    
    if (inspection.offerComments) {
      addField("Kommentarer til tilbudet", inspection.offerComments);
    }
  }

  doc.moveDown(1);
  doc.fontSize(9).fillColor(labelColor).text(
    `Opprettet: ${inspection.createdAt ? new Date(inspection.createdAt).toLocaleString("nb-NO") : "Ukjent"}`,
    { align: "center" }
  );
  doc.fontSize(9).fillColor(labelColor).text(
    `Skjema-ID: ${inspection.id}`,
    { align: "center" }
  );

  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor(labelColor).text(
      `Klar til Leie AS - Befaringsskjema  |  Side ${i + 1} av ${pages.count}`,
      50,
      doc.page.height - 40,
      { align: "center", width: 495 }
    );
  }

  return doc;
}
