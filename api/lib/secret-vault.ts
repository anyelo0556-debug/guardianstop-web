import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(): Buffer {
  const encoded = process.env.GUARDIAN_TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error("GUARDIAN_TOKEN_ENCRYPTION_KEY is not configured");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("GUARDIAN_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
  return key;
}

/**
 * Encrypts connector credentials using AES-256-GCM.
 * Store the returned versioned envelope; never log plaintext or envelope values.
 * The key must come from a secret manager and must be separate from the database.
 */
export function encryptConnectorSecret(plaintext: string): string {
  if (!plaintext) throw new Error("Cannot encrypt an empty connector secret");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(".");
}

/** Authenticated decryption; tampering or wrong keys fail closed. */
export function decryptConnectorSecret(envelope: string): string {
  const [version, ivText, tagText, ciphertextText, extra] = envelope.split(".");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText || extra !== undefined) {
    throw new Error("Invalid encrypted connector-secret envelope");
  }
  const iv = Buffer.from(ivText, "base64");
  const tag = Buffer.from(tagText, "base64");
  const ciphertext = Buffer.from(ciphertextText, "base64");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES || ciphertext.length === 0) {
    throw new Error("Invalid encrypted connector-secret envelope");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
