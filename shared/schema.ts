import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const appUsers = pgTable("app_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AppUser = typeof appUsers.$inferSelect;
export type InsertAppUser = typeof appUsers.$inferInsert;

export const loginSchema = z.object({
  username: z.string().min(1, "Brukernavn er påkrevd"),
  password: z.string().min(1, "Passord er påkrevd"),
});

export const registerUserSchema = z.object({
  username: z.string().min(3, "Brukernavn må være minst 3 tegn"),
  password: z.string().min(6, "Passord må være minst 6 tegn"),
  fullName: z.string().min(1, "Fullt navn er påkrevd"),
  role: z.enum(["user", "admin"]).default("user"),
});

export const inspections = pgTable("inspections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: text("customer_name").notNull(),
  customerAddress: text("customer_address").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  inspectionDateTime: text("inspection_date_time").notNull(),
  reportFilledBy: text("report_filled_by").notNull(),
  hasPublicOrder: text("has_public_order").notNull(),
  existingDrainageSolution: text("existing_drainage_solution").notNull(),
  hasOwnWell: text("has_own_well").notNull(),
  plannedSolutionType: text("planned_solution_type").notNull(),
  distanceToNeighborBorder: text("distance_to_neighbor_border"),
  hasNeighborConflict: text("has_neighbor_conflict").notNull(),
  plannedPlacement: text("planned_placement").notNull(),
  measuredClearance: text("measured_clearance"),
  isNaturallyFrostFree: text("is_naturally_frost_free").notNull(),
  frostProtectionMeasure: text("frost_protection_measure").notNull(),
  frostProtectionOther: text("frost_protection_other"),
  frostProtectionComments: text("frost_protection_comments"),
  needsElectrician: text("needs_electrician").notNull(),
  hasNearbyPowerPoint: text("has_nearby_power_point").notNull(),
  powerPointDistance: text("power_point_distance"),
  needsNewCircuit: boolean("needs_new_circuit"),
  needsPlumber: text("needs_plumber").notNull(),
  existingDrainPipe: text("existing_drain_pipe"),
  outletPoint: text("outlet_point"),
  otherProfessionals: text("other_professionals"),
  technicalConnectionComments: text("technical_connection_comments"),
  imagePaths: text("image_paths").array().notNull(),
  imageCount: integer("image_count").notNull(),
  imagesUploaded: boolean("images_uploaded").notNull(),
  logisticsComments: text("logistics_comments"),
  mapMarkers: jsonb("map_markers"),
  mapNotes: text("map_notes"),
  biocleanerModel: text("biocleaner_model"),
  biocleanerType: text("biocleaner_type"),
  biocleanerPrice: integer("biocleaner_price"),
  numberOfHomes: text("number_of_homes"),
  styreskapSize: text("styreskap_size"),
  styreskapPrice: integer("styreskap_price"),
  soknadUtslippPrice: integer("soknad_utslipp_price"),
  soknadDispensasjonPrice: integer("soknad_dispensasjon_price"),
  innreguleringPrice: integer("innregulering_price"),
  gravingPrice: integer("graving_price"),
  fraktPrice: integer("frakt_price"),
  offerSum: integer("offer_sum"),
  offerMva: integer("offer_mva"),
  offerTotal: integer("offer_total"),
  offerComments: text("offer_comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Inspection = typeof inspections.$inferSelect;

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
  mapMarkers: z.array(z.object({
    id: z.string(),
    type: z.enum(["biocleaner", "slamavskiller", "utslippspunkt"]),
    position: z.tuple([z.number(), z.number()]),
  })).optional(),
  mapNotes: z.string().optional(),
  biocleanerModel: z.string().optional(),
  biocleanerType: z.string().optional(),
  biocleanerPrice: z.number().optional(),
  numberOfHomes: z.string().optional(),
  styreskapSize: z.string().optional(),
  styreskapPrice: z.number().optional(),
  soknadUtslippPrice: z.number().optional(),
  soknadDispensasjonPrice: z.number().optional(),
  innreguleringPrice: z.number().optional(),
  gravingPrice: z.number().optional(),
  fraktPrice: z.number().optional(),
  offerSum: z.number().optional(),
  offerMva: z.number().optional(),
  offerTotal: z.number().optional(),
  offerComments: z.string().optional(),
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
  mapMarkers: z.array(z.object({
    id: z.string(),
    type: z.enum(["biocleaner", "slamavskiller", "utslippspunkt"]),
    position: z.tuple([z.number(), z.number()]),
  })).optional(),
  mapNotes: z.string().optional(),
  biocleanerModel: z.string().optional(),
  biocleanerType: z.string().optional(),
  biocleanerPrice: z.number().optional(),
  numberOfHomes: z.string().optional(),
  styreskapSize: z.string().optional(),
  styreskapPrice: z.number().optional(),
  soknadUtslippPrice: z.number().optional(),
  soknadDispensasjonPrice: z.number().optional(),
  innreguleringPrice: z.number().optional(),
  gravingPrice: z.number().optional(),
  fraktPrice: z.number().optional(),
  offerSum: z.number().optional(),
  offerMva: z.number().optional(),
  offerTotal: z.number().optional(),
  offerComments: z.string().optional(),
});

export type ClientInspectionFormData = z.infer<typeof clientInspectionFormSchema>;

export const BIOCLEANER_MODELS = [
  { id: "bc4", name: "BC 4 (1-4 PE)", pe: 4, volume: "2,3 m³", defaultPrice: 0 },
  { id: "bc6", name: "BC 6 (1-6 PE)", pe: 6, volume: "3,0 m³", defaultPrice: 78349 },
  { id: "bc8", name: "BC 8 (1-8 PE)", pe: 8, volume: "4,0 m³", defaultPrice: 98792 },
  { id: "bc10", name: "BC 10 (1-10 PE)", pe: 10, volume: "5,0 m³", defaultPrice: 115385 },
  { id: "bc15", name: "BC 15 (1-15 PE)", pe: 15, volume: "7,5 m³", defaultPrice: 131671 },
  { id: "bc20", name: "BC 20 (1-20 PE)", pe: 20, volume: "10,0 m³", defaultPrice: 0 },
  { id: "bc25", name: "BC 25 (1-25 PE)", pe: 25, volume: "12,5 m³", defaultPrice: 0 },
  { id: "bc30", name: "BC 30 (1-30 PE)", pe: 30, volume: "15,0 m³", defaultPrice: 0 },
] as const;

export const BIOCLEANER_TYPES = [
  { id: "optima", name: "Optima", description: "Standard-løsning", priceAdjustment: 0 },
  { id: "comfort", name: "Comfort", description: "Med fjernstyring", priceAdjustment: 15000 },
  { id: "exclusive", name: "Exclusive", description: "Med tertiærfilter", priceAdjustment: 35000 },
] as const;

export const STYRESKAP_OPTIONS = [
  { id: "small", name: "Small", defaultPrice: 7200 },
] as const;

export const DEFAULT_PRICES = {
  soknadUtslipp: 12500,
  soknadDispensasjon: 7500,
  innregulering: 16900,
  graving: 46300,
  frakt: 6200,
} as const;
