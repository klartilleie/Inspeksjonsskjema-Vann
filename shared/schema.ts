import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const inspectionFormSchema = z.object({
  customerName: z.string().min(1, "Kundenavn er påkrevd"),
  customerAddress: z.string().min(1, "Adresse er påkrevd"),
  customerEmail: z.string().email("Ugyldig e-postadresse"),
  customerPhone: z.string().min(1, "Telefonnummer er påkrevd"),
  inspectionDateTime: z.string().min(1, "Dato og tid er påkrevd"),
  reportFilledBy: z.string().min(1, "Navn på den som fylte ut rapporten er påkrevd"),
  hasPublicOrder: z.enum(["ja", "nei"]),
  
  existingDrainageSolution: z.enum(["kommunalt", "tett_tank", "renseanlegg", "ikke_aktuelt"]),
  hasOwnWell: z.enum(["ja", "nei"]),
  plannedSolutionType: z.enum(["bekk", "infiltrasjon", "ikke_aktuelt"]),
  distanceToNeighborBorder: z.string().optional(),
  hasNeighborConflict: z.enum(["ja", "nei"]),
  
  plannedPlacement: z.string().min(1, "Planlagt plassering er påkrevd"),
  measuredClearance: z.string().optional(),
  isNaturallyFrostFree: z.enum(["ja", "nei"]),
  frostProtectionMeasure: z.enum(["ingen", "isolering", "varmekabel", "annet"]),
  frostProtectionOther: z.string().optional(),
  frostProtectionComments: z.string().optional(),
  
  needsElectrician: z.enum(["ja", "nei"]),
  hasNearbyPowerPoint: z.enum(["ja", "nei"]),
  powerPointDistance: z.string().optional(),
  needsNewCircuit: z.boolean().optional(),
  needsPlumber: z.enum(["ja", "nei"]),
  existingDrainPipe: z.string().optional(),
  outletPoint: z.string().optional(),
  otherProfessionals: z.string().optional(),
  technicalConnectionComments: z.string().optional(),
  
  imagePaths: z.array(z.string()).min(5, "Minimum 5 bilder er påkrevd"),
  logisticsComments: z.string().optional(),
}).transform((data) => ({
  ...data,
  imageCount: data.imagePaths.length,
  imagesUploaded: data.imagePaths.length >= 5,
}));

export type InspectionFormData = z.infer<typeof inspectionFormSchema>;

export const clientInspectionFormSchema = z.object({
  customerName: z.string().min(1, "Kundenavn er påkrevd"),
  customerAddress: z.string().min(1, "Adresse er påkrevd"),
  customerEmail: z.string().email("Ugyldig e-postadresse"),
  customerPhone: z.string().min(1, "Telefonnummer er påkrevd"),
  inspectionDateTime: z.string().min(1, "Dato og tid er påkrevd"),
  reportFilledBy: z.string().min(1, "Navn på den som fylte ut rapporten er påkrevd"),
  hasPublicOrder: z.enum(["ja", "nei"]),
  existingDrainageSolution: z.enum(["kommunalt", "tett_tank", "renseanlegg", "ikke_aktuelt"]),
  hasOwnWell: z.enum(["ja", "nei"]),
  plannedSolutionType: z.enum(["bekk", "infiltrasjon", "ikke_aktuelt"]),
  distanceToNeighborBorder: z.string().optional(),
  hasNeighborConflict: z.enum(["ja", "nei"]),
  plannedPlacement: z.string().min(1, "Planlagt plassering er påkrevd"),
  measuredClearance: z.string().optional(),
  isNaturallyFrostFree: z.enum(["ja", "nei"]),
  frostProtectionMeasure: z.enum(["ingen", "isolering", "varmekabel", "annet"]),
  frostProtectionOther: z.string().optional(),
  frostProtectionComments: z.string().optional(),
  needsElectrician: z.enum(["ja", "nei"]),
  hasNearbyPowerPoint: z.enum(["ja", "nei"]),
  powerPointDistance: z.string().optional(),
  needsNewCircuit: z.boolean().optional(),
  needsPlumber: z.enum(["ja", "nei"]),
  existingDrainPipe: z.string().optional(),
  outletPoint: z.string().optional(),
  otherProfessionals: z.string().optional(),
  technicalConnectionComments: z.string().optional(),
  imagePaths: z.array(z.string()).default([]),
  logisticsComments: z.string().optional(),
});

export type ClientInspectionFormData = z.infer<typeof clientInspectionFormSchema>;

export const insertInspectionFormSchema = inspectionFormSchema;
export type InsertInspectionForm = z.infer<typeof insertInspectionFormSchema>;
