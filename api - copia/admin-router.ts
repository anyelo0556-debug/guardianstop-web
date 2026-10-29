import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, accounts, subscriptions, disciplineScores } from "@db/schema";
import { count, desc, eq } from "drizzle-orm";

export const adminRouter = createRouter({
  stats: adminQuery.query(async () => {
    const db = getDb();
    const [userCount] = await db.select({ value: count() }).from(users);
    const [accountCount] = await db.select({ value: count() }).from(accounts);
    const [subscriptionCount] = await db.select({ value: count() }).from(subscriptions);
    const [activeCount] = await db
      .select({ value: count() })
      .from(accounts)
      .where(eq(accounts.isActive, true));

    return {
      totalUsers: userCount.value,
      totalAccounts: accountCount.value,
      totalSubscriptions: subscriptionCount.value,
      activeAccounts: activeCount.value,
    };
  }),

  users: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(users).orderBy(desc(users.createdAt));
  }),

  accounts: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(accounts).orderBy(desc(accounts.createdAt));
  }),

  subscriptions: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  }),

  topScores: adminQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(disciplineScores)
      .where(eq(disciplineScores.isPublic, true))
      .orderBy(desc(disciplineScores.scorePct))
      .limit(20);
  }),
});
