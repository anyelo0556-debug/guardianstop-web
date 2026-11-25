import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ENCRYPTED_PREFIX = "enc:v1:";

function getEncryptionKey(): Buffer {
  const rawKey = process.env.CREDENTIALS_ENCRYPTION_KEY ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    throw new Error("Broker credential encryption is not configured");
  }
  return Buffer.from(rawKey, "hex");
}

/** Encrypt a broker secret with AES-256-GCM and a fresh 96-bit IV. */
export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/**
 * Decrypt a versioned AES-GCM secret. Legacy plaintext values are returned
 * unchanged only to support the documented migration window; new writes must
 * always use encryptSecret.
 */
export function decryptSecret(value: string): string {
  if (!value.startsWith("enc:")) return value;
  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    throw new Error("Unsupported broker credential encryption version");
  }

  const parts = value.split(":");
  if (parts.length !== 5) {
    throw new Error("Malformed encrypted broker credential");
  }

  const [, , ivHex, tagHex, ciphertextHex] = parts;
  if (
    !/^[0-9a-fA-F]{24}$/.test(ivHex) ||
    !/^[0-9a-fA-F]{32}$/.test(tagHex) ||
    !/^(?:[0-9a-fA-F]{2})+$/.test(ciphertextHex)
  ) {
    throw new Error("Malformed encrypted broker credential");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
