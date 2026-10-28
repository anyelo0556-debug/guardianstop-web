import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./connection";
import { payments, type InsertPayment } from "@db/schema";

export async function findPaymentsByUserId(userId: number) {
  const db = getDb();
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
}

export async function findPaymentByProviderId(provider: string, providerPaymentId: string) {
  const db = getDb();
  const results = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.provider, provider as any),
        eq(payments.providerPaymentId, providerPaymentId)
      )
    )
    .limit(1);
  return results[0] || null;
}

export async function findPendingPayment(userId: number, provider: string, providerPaymentId: string) {
  const db = getDb();
  const results = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        eq(payments.provider, provider as any),
        eq(payments.providerPaymentId, providerPaymentId),
        eq(payments.status, "pending")
      )
    )
    .limit(1);
  return results[0] || null;
}

export async function createPayment(data: InsertPayment) {
  const db = getDb();
  const [result] = await db.insert(payments).values(data);
  return { id: Number(result.insertId), ...data };
}

export async function updatePaymentStatus(
  id: number,
  status: "pending" | "completed" | "failed" | "refunded",
  extra?: { paidAt?: Date; subscriptionId?: number; metadata?: string }
) {
  const db = getDb();
  await db
    .update(payments)
    .set({
      status,
      ...(extra?.paidAt && { paidAt: extra.paidAt }),
      ...(extra?.subscriptionId && { subscriptionId: extra.subscriptionId }),
      ...(extra?.metadata && { metadata: extra.metadata }),
      updatedAt: new Date(),
    })
    .where(eq(payments.id, id));
}
