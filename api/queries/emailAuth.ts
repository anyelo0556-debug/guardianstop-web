import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "./connection";

export async function findCredentialByEmail(email: string) {
  const rows = await getDb()
    .select()
    .from(schema.emailCredentials)
    .where(eq(schema.emailCredentials.email, email))
    .limit(1);
  return rows.at(0);
}

export async function createEmailCredential(data: schema.InsertEmailCredential) {
  await getDb().insert(schema.emailCredentials).values(data);
}
