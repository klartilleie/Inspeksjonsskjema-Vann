import { type User, type InsertUser, type InspectionFormData } from "@shared/schema";
import { randomUUID } from "crypto";

export interface Inspection extends InspectionFormData {
  id: string;
  createdAt: string;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createInspection(data: InspectionFormData): Promise<Inspection>;
  getInspection(id: string): Promise<Inspection | undefined>;
  getAllInspections(): Promise<Inspection[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private inspections: Map<string, Inspection>;

  constructor() {
    this.users = new Map();
    this.inspections = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createInspection(data: InspectionFormData): Promise<Inspection> {
    const id = randomUUID();
    const inspection: Inspection = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    this.inspections.set(id, inspection);
    return inspection;
  }

  async getInspection(id: string): Promise<Inspection | undefined> {
    return this.inspections.get(id);
  }

  async getAllInspections(): Promise<Inspection[]> {
    return Array.from(this.inspections.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const storage = new MemStorage();
