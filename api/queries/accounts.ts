import { eq, desc } from "drizzle-orm";
import { getDb } from "./connection";
import { accounts, type InsertAccount, type Account } from "@db/schema";

export async function findAccountsByUserId(userId: number): Promise<Account[]> {
  const db = getDb();
  return db.select().from(accounts).where(eq(accounts.userId, userId));
}

export async function findAccountById(id: number): Promise<Account | undefined> {
  const db = getDb();
  const rows = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return rows[0];
}

export async function createAccount(data: InsertAccount): Promise<Account> {
  const db = getDb();
  await db.insert(accounts).values(data);
  const rows = await db.select().from(accounts).where(eq(accounts.userId, data.userId)).orderBy(desc(accounts.createdAt)).limit(1);
  return rows[0];
}

export async function updateAccount(id: number, data: Partial<InsertAccount>): Promise<Account> {
  const db = getDb();
  await db.update(accounts).set(data).where(eq(accounts.id, id));
  const rows = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return rows[0];
}

export async function deleteAccount(id: number): Promise<void> {
  const db = getDb();
  await db.delete(accounts).where(eq(accounts.id, id));
}
