import { relations } from "drizzle-orm";
import {
  users,
  accounts,
  subscriptions,
  protectionLogs,
  disciplineScores,
  notifications,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  subscriptions: many(subscriptions),
  protectionLogs: many(protectionLogs),
  disciplineScores: many(disciplineScores),
  notifications: many(notifications),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  protectionLogs: many(protectionLogs),
  disciplineScores: many(disciplineScores),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const protectionLogsRelations = relations(protectionLogs, ({ one }) => ({
  user: one(users, {
    fields: [protectionLogs.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [protectionLogs.accountId],
    references: [accounts.id],
  }),
}));

export const disciplineScoresRelations = relations(disciplineScores, ({ one }) => ({
  user: one(users, {
    fields: [disciplineScores.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [disciplineScores.accountId],
    references: [accounts.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
