import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./connection";
import { disciplineScores, type InsertDisciplineScore, type DisciplineScore } from "@db/schema";

export async function findScoresByUserId(userId: number): Promise<DisciplineScore[]> {
  const db = getDb();
  return db.select().from(disciplineScores).where(eq(disciplineScores.userId, userId)).orderBy(desc(disciplineScores.yearMonth));
}

export async function findPublicScores(): Promise<DisciplineScore[]> {
  const db = getDb();
  return db.select().from(disciplineScores).where(eq(disciplineScores.isPublic, true)).orderBy(desc(disciplineScores.scorePct));
}

export async function createOrUpdateScore(data: InsertDisciplineScore): Promise<DisciplineScore> {
  const db = getDb();
  const existing = await db
    .select()
    .from(disciplineScores)
    .where(and(
      eq(disciplineScores.userId, data.userId),
      eq(disciplineScores.yearMonth, data.yearMonth)
    ))
    .limit(1);

  if (existing[0]) {
    await db.update(disciplineScores).set(data).where(eq(disciplineScores.id, existing[0].id));
    const rows = await db.select().from(disciplineScores).where(eq(disciplineScores.id, existing[0].id)).limit(1);
    return rows[0];
  }

  await db.insert(disciplineScores).values(data);
  const rows = await db.select().from(disciplineScores).where(eq(disciplineScores.userId, data.userId)).orderBy(desc(disciplineScores.createdAt)).limit(1);
  return rows[0];
}

export async function toggleScorePublic(id: number, isPublic: boolean): Promise<void> {
  const db = getDb();
  await db.update(disciplineScores).set({ isPublic }).where(eq(disciplineScores.id, id));
}
