import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret } from "./credential-vault";

const KEY_A = "11".repeat(32);
const KEY_B = "22".repeat(32);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("broker credential vault", () => {
  it("round-trips secrets with AES-256-GCM", () => {
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", KEY_A);
    const encrypted = encryptSecret("ig-password-123");
    expect(encrypted).toMatch(/^enc:v1:/);
    expect(decryptSecret(encrypted)).toBe("ig-password-123");
  });

  it("rejects decryption with a different key", () => {
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", KEY_A);
    const encrypted = encryptSecret("secret");
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", KEY_B);
    expect(() => decryptSecret(encrypted)).toThrow();
  });

  it("rejects tampered ciphertext", () => {
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", KEY_A);
    const encrypted = encryptSecret("secret");
    const tampered = encrypted.slice(0, -2) + "00";
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("keeps legacy plaintext readable during migration", () => {
    expect(decryptSecret("legacy-plaintext-secret")).toBe("legacy-plaintext-secret");
  });

  it("rejects unknown encrypted versions and malformed payloads", () => {
    expect(() => decryptSecret("enc:v2:abc")).toThrow("Unsupported");
    expect(() => decryptSecret("enc:v1:abc")).toThrow("Malformed");
  });

  it("requires a 32-byte encryption key for new encryption", () => {
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", "not-a-key");
    expect(() => encryptSecret("secret")).toThrow("not configured");
  });
});
