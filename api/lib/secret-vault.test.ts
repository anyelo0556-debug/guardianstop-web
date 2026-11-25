import { afterEach, describe, expect, it } from "vitest";
import { decryptConnectorSecret, encryptConnectorSecret } from "./secret-vault";

const originalKey = process.env.GUARDIAN_TOKEN_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.GUARDIAN_TOKEN_ENCRYPTION_KEY;
  else process.env.GUARDIAN_TOKEN_ENCRYPTION_KEY = originalKey;
});

function setTestKey() {
  process.env.GUARDIAN_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
}

describe("connector secret vault", () => {
  it("round-trips a secret without storing plaintext in the envelope", () => {
    setTestKey();
    const secret = "demo-only-token-value";
    const envelope = encryptConnectorSecret(secret);

    expect(envelope).toMatch(/^v1\./);
    expect(envelope).not.toContain(secret);
    expect(decryptConnectorSecret(envelope)).toBe(secret);
  });

  it("uses a fresh random IV for each encryption", () => {
    setTestKey();
    const first = encryptConnectorSecret("same-secret");
    const second = encryptConnectorSecret("same-secret");

    expect(first).not.toBe(second);
    expect(decryptConnectorSecret(first)).toBe("same-secret");
    expect(decryptConnectorSecret(second)).toBe("same-secret");
  });

  it("rejects tampered ciphertext", () => {
    setTestKey();
    const envelope = encryptConnectorSecret("secret");
    const parts = envelope.split(".");
    parts[3] = Buffer.from("tampered").toString("base64");

    expect(() => decryptConnectorSecret(parts.join("."))).toThrow();
  });

  it("rejects an invalid key length", () => {
    process.env.GUARDIAN_TOKEN_ENCRYPTION_KEY = Buffer.alloc(16).toString("base64");
    expect(() => encryptConnectorSecret("secret")).toThrow(/32 bytes/);
  });

  it("rejects empty secrets and malformed envelopes", () => {
    setTestKey();
    expect(() => encryptConnectorSecret("")).toThrow(/empty/);
    expect(() => decryptConnectorSecret("v2.invalid")).toThrow(/envelope/);
  });
});
