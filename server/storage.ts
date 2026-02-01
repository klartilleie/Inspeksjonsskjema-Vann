import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { 
  type User, 
  type UpsertUser, 
  type InspectionFormData,
  type Inspection,
  type AppUser,
  type InsertAppUser,
  users,
  inspections,
  appUsers
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createInspection(data: InspectionFormData): Promise<Inspection>;
  getInspection(id: string): Promise<Inspection | undefined>;
  getAllInspections(): Promise<Inspection[]>;
  deleteInspection(id: string): Promise<boolean>;
  getAppUserByUsername(username: string): Promise<AppUser | undefined>;
  getAppUserById(id: string): Promise<AppUser | undefined>;
  createAppUser(user: InsertAppUser): Promise<AppUser>;
  getAllAppUsers(): Promise<AppUser[]>;
  deleteAppUser(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createInspection(data: InspectionFormData): Promise<Inspection> {
    const [inspection] = await db.insert(inspections).values({
      customerName: data.customerName,
      customerAddress: data.customerAddress,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      inspectionDateTime: data.inspectionDateTime,
      reportFilledBy: data.reportFilledBy,
      hasPublicOrder: data.hasPublicOrder,
      existingDrainageSolution: data.existingDrainageSolution,
      hasOwnWell: data.hasOwnWell,
      plannedSolutionType: data.plannedSolutionType,
      distanceToNeighborBorder: data.distanceToNeighborBorder,
      hasNeighborConflict: data.hasNeighborConflict,
      plannedPlacement: data.plannedPlacement,
      measuredClearance: data.measuredClearance,
      isNaturallyFrostFree: data.isNaturallyFrostFree,
      frostProtectionMeasure: data.frostProtectionMeasure,
      frostProtectionOther: data.frostProtectionOther,
      frostProtectionComments: data.frostProtectionComments,
      needsElectrician: data.needsElectrician,
      hasNearbyPowerPoint: data.hasNearbyPowerPoint,
      powerPointDistance: data.powerPointDistance,
      needsNewCircuit: data.needsNewCircuit,
      needsPlumber: data.needsPlumber,
      existingDrainPipe: data.existingDrainPipe,
      outletPoint: data.outletPoint,
      otherProfessionals: data.otherProfessionals,
      technicalConnectionComments: data.technicalConnectionComments,
      imagePaths: data.imagePaths,
      imageCount: data.imageCount,
      imagesUploaded: data.imagesUploaded,
      logisticsComments: data.logisticsComments,
      mapMarkers: data.mapMarkers,
      mapNotes: data.mapNotes,
      biocleanerModel: data.biocleanerModel,
      biocleanerType: data.biocleanerType,
      biocleanerPrice: data.biocleanerPrice,
      numberOfHomes: data.numberOfHomes,
      styreskapSize: data.styreskapSize,
      styreskapPrice: data.styreskapPrice,
      soknadUtslippPrice: data.soknadUtslippPrice,
      soknadDispensasjonPrice: data.soknadDispensasjonPrice,
      innreguleringPrice: data.innreguleringPrice,
      gravingPrice: data.gravingPrice,
      fraktPrice: data.fraktPrice,
      offerSum: data.offerSum,
      offerMva: data.offerMva,
      offerTotal: data.offerTotal,
      offerComments: data.offerComments,
    }).returning();
    return inspection;
  }

  async getInspection(id: string): Promise<Inspection | undefined> {
    const [inspection] = await db.select().from(inspections).where(eq(inspections.id, id));
    return inspection;
  }

  async getAllInspections(): Promise<Inspection[]> {
    return db.select().from(inspections).orderBy(desc(inspections.createdAt));
  }

  async deleteInspection(id: string): Promise<boolean> {
    const result = await db.delete(inspections).where(eq(inspections.id, id)).returning();
    return result.length > 0;
  }

  async getAppUserByUsername(username: string): Promise<AppUser | undefined> {
    const [user] = await db.select().from(appUsers).where(eq(appUsers.username, username));
    return user;
  }

  async getAppUserById(id: string): Promise<AppUser | undefined> {
    const [user] = await db.select().from(appUsers).where(eq(appUsers.id, id));
    return user;
  }

  async createAppUser(userData: InsertAppUser): Promise<AppUser> {
    const [user] = await db.insert(appUsers).values(userData).returning();
    return user;
  }

  async getAllAppUsers(): Promise<AppUser[]> {
    return db.select().from(appUsers).orderBy(desc(appUsers.createdAt));
  }

  async deleteAppUser(id: string): Promise<boolean> {
    const result = await db.delete(appUsers).where(eq(appUsers.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
