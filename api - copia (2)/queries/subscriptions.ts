import { eq, desc } from "drizzle-orm";
import { getDb } from "./connection";
import { subscriptions, type InsertSubscription, type Subscription } from "@db/schema";

export async function findSubscriptionsByUserId(userId: number): Promise<Subscription[]> {
  const db = getDb();
  return db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt));
}

export async function findActiveSubscription(userId: number): Promise<Subscription | undefined> {
  const db = getDb();
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt)).limit(1);
  return rows[0];
}

export async function createSubscription(data: InsertSubscription): Promise<Subscription> {
  const db = getDb();
  await db.insert(subscriptions).values(data);
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.userId, data.userId)).orderBy(desc(subscriptions.createdAt)).limit(1);
  return rows[0];
}

export async function updateSubscription(id: number, data: Partial<InsertSubscription>): Promise<Subscription> {
  const db = getDb();
  await db.update(subscriptions).set(data).where(eq(subscriptions.id, id));
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
  return rows[0];
}
