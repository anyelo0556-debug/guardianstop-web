import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  decimal,
  boolean,
} from "drizzle-orm/mysql-core";

// ─── USERS (managed by auth system) ───────────────────────────────
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── TRADING ACCOUNTS ─────────────────────────────────────────────
export const accounts = mysqlTable("accounts", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  brokerName: varchar("brokerName", { length: 100 }).notNull(),
  accountNumber: varchar("accountNumber", { length: 100 }).notNull(),
  accountType: mysqlEnum("accountType", ["demo", "live"]).default("live").notNull(),
  initialCapital: decimal("initialCapital", { precision: 15, scale: 2 }).notNull(),
  currentBalance: decimal("currentBalance", { precision: 15, scale: 2 }).notNull(),
  dailyLimitPct: decimal("dailyLimitPct", { precision: 5, scale: 2 }).default("1.00").notNull(),
  weeklyLimitPct: decimal("weeklyLimitPct", { precision: 5, scale: 2 }).default("10.00").notNull(),
  monthlyLimitPct: decimal("monthlyLimitPct", { precision: 5, scale: 2 }).default("30.00").notNull(),
  trailingEnabled: boolean("trailingEnabled").default(false).notNull(),
  trailingActivationPct: decimal("trailingActivationPct", { precision: 5, scale: 2 }).default("1.00").notNull(),
  trailingProtectionPct: decimal("trailingProtectionPct", { precision: 5, scale: 2 }).default("30.00").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────
export const subscriptions = mysqlTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planType: mysqlEnum("planType", ["basic", "trailing"]).notNull(),
  periodDays: int("periodDays").notNull(), // 30, 90, 180, 365
  pricePaid: decimal("pricePaid", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["active", "expired", "cancelled"]).default("active").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ─── PROTECTION LOGS ──────────────────────────────────────────────
export const protectionLogs = mysqlTable("protection_logs", {
  id: serial("id").primaryKey(),
  accountId: bigint("accountId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  triggerType: mysqlEnum("triggerType", [
    "daily_limit",
    "weekly_limit",
    "monthly_limit",
    "trailing_profit",
    "manual_block",
    "auto_unlock",
  ]).notNull(),
  profitLossAtTrigger: decimal("profitLossAtTrigger", { precision: 15, scale: 2 }),
  profitLossPctAtTrigger: decimal("profitLossPctAtTrigger", { precision: 5, scale: 2 }),
  protectedAmount: decimal("protectedAmount", { precision: 15, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProtectionLog = typeof protectionLogs.$inferSelect;
export type InsertProtectionLog = typeof protectionLogs.$inferInsert;

// ─── DISCIPLINE SCORES (monthly) ──────────────────────────────────
export const disciplineScores = mysqlTable("discipline_scores", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: bigint("accountId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  yearMonth: varchar("yearMonth", { length: 7 }).notNull(), // "2026-10"
  daysWithoutLimitBreach: int("daysWithoutLimitBreach").default(0).notNull(),
  totalTradingDays: int("totalTradingDays").default(0).notNull(),
  trailingActivations: int("trailingActivations").default(0).notNull(),
  totalProtectedAmount: decimal("totalProtectedAmount", { precision: 15, scale: 2 }).default("0.00").notNull(),
  scorePct: int("scorePct").default(0).notNull(), // 0-100
  isPublic: boolean("isPublic").default(false).notNull(),
  diplomaUrl: text("diplomaUrl"), // PDF diploma link
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type DisciplineScore = typeof disciplineScores.$inferSelect;
export type InsertDisciplineScore = typeof disciplineScores.$inferInsert;

// ─── NOTIFICATIONS ────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", [
    "limit_warning",
    "limit_breach",
    "trailing_activated",
    "trailing_executed",
    "weekly_reflection",
    "monthly_diploma",
    "subscription_expiring",
    "auto_unlock",
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

// ─── TRADES (operaciones en tiempo real del trader) ───────────────
export const trades = mysqlTable("trades", {
  id: serial("id").primaryKey(),
  accountId: bigint("accountId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  symbol: varchar("symbol", { length: 50 }).notNull(), // "EUR/USD", "BTC/USD", "ES1!"
  direction: mysqlEnum("direction", ["buy", "sell"]).notNull(),
  leverage: decimal("leverage", { precision: 5, scale: 2 }).default("1.00").notNull(), // Apalancamiento usado
  lotSize: decimal("lotSize", { precision: 12, scale: 4 }).notNull(), // Tamaño de la posicion
  entryPrice: decimal("entryPrice", { precision: 15, scale: 5 }).notNull(),
  exitPrice: decimal("exitPrice", { precision: 15, scale: 5 }), // Null si aun abierta
  profitLoss: decimal("profitLoss", { precision: 15, scale: 2 }).default("0.00").notNull(), // $ ganado/perdido
  profitLossPct: decimal("profitLossPct", { precision: 8, scale: 4 }).default("0.0000").notNull(), // % del capital
  resultType: mysqlEnum("resultType", [
    "open",           // Aun abierta
    "win",            // Cerrada en ganancia
    "loss",           // Cerrada en perdida
    "breakeven",      // Cerrada en 0
    "trailing_protection", // Cerrada por trailing stop
    "limit_protection",    // Cerrada por limite diario/semanal/mensual
    "manual_close",   // Cerrada manualmente por el trader
  ]).default("open").notNull(),
  status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"), // Null si aun abierta
  protectionTrigger: mysqlEnum("protectionTrigger", [
    "none",
    "daily_limit",
    "weekly_limit",
    "monthly_limit",
    "trailing_stop",
  ]).default("none").notNull(),
  brokerTradeId: varchar("brokerTradeId", { length: 255 }), // ID de la operacion en el broker
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
