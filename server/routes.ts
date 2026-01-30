import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { inspectionFormSchema, loginSchema, registerUserSchema, type Inspection } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateInspectionPDF } from "./pdfGenerator";
import crypto from "crypto";
import { Resend } from "resend";

async function sendInspectionEmail(inspection: Inspection): Promise<boolean> {
  const resendApiKey = process.env.resend_API;

  if (!resendApiKey) {
    console.log("Resend API key not configured, skipping email notification");
    return false;
  }

  try {
    const resend = new Resend(resendApiKey);

    const mapMarkers = inspection.mapMarkers as Array<{id: string, type: string, position: [number, number]}> || [];
    const markersList = mapMarkers.map(m => {
      const label = m.type === "biocleaner" ? "Biocleaner" : m.type === "slamavskiller" ? "Slamavskiller" : "Utslippspunkt";
      return `- ${label}: ${m.position[0].toFixed(6)}, ${m.position[1].toFixed(6)}`;
    }).join("\n");

    const formatPrice = (price: number | null | undefined) => 
      price ? `kr ${price.toLocaleString("nb-NO")},-` : "kr 0,-";

    const emailContent = `
Nytt befaringsskjema mottatt!

KUNDEINFORMASJON:
- Kunde: ${inspection.customerName}
- Adresse: ${inspection.customerAddress}
- E-post: ${inspection.customerEmail}
- Telefon: ${inspection.customerPhone}
- Befaring: ${inspection.inspectionDateTime}
- Utfylt av: ${inspection.reportFilledBy}

AVLØPSLØSNING:
- Eksisterende løsning: ${inspection.existingDrainageSolution}
- Planlagt løsningstype: ${inspection.plannedSolutionType}
- Planlagt plassering: ${inspection.plannedPlacement}

FROSTBESKYTTELSE:
- Naturlig frostfritt: ${inspection.isNaturallyFrostFree}
- Frostsikringstiltak: ${inspection.frostProtectionMeasure}
${inspection.frostProtectionComments ? `- Kommentar: ${inspection.frostProtectionComments}` : ""}

TEKNISK TILKOBLING:
- Trenger elektriker: ${inspection.needsElectrician}
- Strømpunkt i nærheten: ${inspection.hasNearbyPowerPoint}
- Trenger rørlegger: ${inspection.needsPlumber}
${inspection.technicalConnectionComments ? `- Kommentar: ${inspection.technicalConnectionComments}` : ""}

PLASSERINGSMARKØRER:
${markersList || "Ingen markører plassert"}
${inspection.mapNotes ? `\nNotat til plasseringstegning: ${