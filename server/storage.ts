import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { 
  type User, 
  type UpsertUser, 
  type InspectionFormData,
  type Inspection,
  users,
  inspections
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createInspection(data: InspectionFormData): Promise<Inspection>;
  getInspection(id: string): Promise<Inspection | undefined>;
  getAllInspections(): Promise<Inspection[]>;
  deleteInspection(id: string): Promise<boolean>;
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
}

export const storage = new DatabaseStorage();
