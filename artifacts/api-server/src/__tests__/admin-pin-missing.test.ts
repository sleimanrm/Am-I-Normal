/**
 * Test: Missing ADMIN_PIN environment variable fails closed
 * The admin router should throw at startup if ADMIN_PIN is not set
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("ADMIN_PIN missing fails closed", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // JWT_SECRET must be set BEFORE any module that imports auth.ts is loaded
    process.env.JWT_SECRET = "test-secret-key-at-least-32-chars-long";
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws when ADMIN_PIN is not set", async () => {
    delete process.env.ADMIN_PIN;

    await expect(import("../routes/admin")).rejects.toThrow("ADMIN_PIN environment variable is required but not set");
  });

  it("throws when ADMIN_PIN is too short (< 8 digits)", async () => {
    process.env.ADMIN_PIN = "1234567";

    await expect(import("../routes/admin")).rejects.toThrow("ADMIN_PIN must be at least 8 digits");
  });

  it("throws when ADMIN_PIN contains non-digits", async () => {
    process.env.ADMIN_PIN = "1234567a";

    await expect(import("../routes/admin")).rejects.toThrow("ADMIN_PIN must contain only digits");
  });

  it("throws when ADMIN_PIN is a repeating pattern", async () => {
    process.env.ADMIN_PIN = "11111111";

    await expect(import("../routes/admin")).rejects.toThrow("ADMIN_PIN must not be a repeating pattern");
  });

  it("throws when ADMIN_PIN is sequentially increasing", async () => {
    process.env.ADMIN_PIN = "12345678";

    await expect(import("../routes/admin")).rejects.toThrow("ADMIN_PIN must not be a sequentially increasing or decreasing pattern");
  });

  it("throws when ADMIN_PIN is sequentially decreasing", async () => {
    process.env.ADMIN_PIN = "87654321";

    await expect(import("../routes/admin")).rejects.toThrow("ADMIN_PIN must not be a sequentially increasing or decreasing pattern");
  });

  it("loads successfully when ADMIN_PIN is valid", async () => {
    process.env.ADMIN_PIN = "48290157";

    const adminRouter = await import("../routes/admin");
    expect(adminRouter).toBeDefined();
    expect(adminRouter.default).toBeDefined();
  });
});