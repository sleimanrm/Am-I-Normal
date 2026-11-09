/**
 * Test: Backend habit submission validation
 * The validateHabit function should reject invalid submissions
 */
import { describe, it, expect } from "vitest";
import { validateHabit } from "../lib/validation/habitValidator";

function assertInvalid(result: ReturnType<typeof validateHabit>, expectedErrorPart: string) {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toContain(expectedErrorPart);
  }
}

function assertValid(result: ReturnType<typeof validateHabit>) {
  expect(result.ok).toBe(true);
}

describe("Backend habit submission validation", () => {
  it("rejects habits shorter than 15 characters", () => {
    const result = validateHabit("I eat food");
    assertInvalid(result, "too short");
  });

  it("accepts habits 15+ characters", () => {
    const result = validateHabit("I always eat pizza with a fork and knife");
    assertValid(result);
  });

  it("rejects gibberish input", () => {
    const result = validateHabit("asdfghjkl qwertyuiop zxcvbnm");
    assertInvalid(result, "doesn't look like a real sentence");
  });

  it("rejects sexual content", () => {
    const result = validateHabit("I watch porn every night");
    assertInvalid(result, "community guidelines");
  });

  it("rejects drug promotion", () => {
    const result = validateHabit("I do cocaine every weekend");
    assertInvalid(result, "community guidelines");
  });

  it("rejects self-harm content", () => {
    const result = validateHabit("I want to kill myself");
    assertInvalid(result, "community guidelines");
  });

  it("rejects violence and threats", () => {
    const result = validateHabit("I want to murder someone");
    assertInvalid(result, "community guidelines");
  });

  it("rejects hate speech", () => {
    const result = validateHabit("I hate all niggers");
    assertInvalid(result, "community guidelines");
  });

  it("rejects harassment", () => {
    const result = validateHabit("I stalk my neighbor every day");
    assertInvalid(result, "community guidelines");
  });

  it("rejects child exploitation content", () => {
    const result = validateHabit("I watch child pornography");
    assertInvalid(result, "community guidelines");
  });

  it("rejects profanity", () => {
    const result = validateHabit("I fucking hate this shit");
    assertInvalid(result, "community guidelines");
  });

  it("rejects leet-speak obfuscation (caught by gibberish check on original text)", () => {
    const result = validateHabit("I w@tch p0rn 3v3ry n1ght");
    assertInvalid(result, "doesn't look like a real sentence");
  });

  it("rejects spaced characters obfuscation (normalised then caught by content filter)", () => {
    // The normaliser collapses spaced single-char sequences of 3-4 letters
    // "p o r n" (4 spaced letters) → "porn" → caught by SEXUAL filter
    // Need enough characters to pass length check (15+)
    const result = validateHabit("I do p o r n every night");
    assertInvalid(result, "community guidelines");
  });

  it("rejects generic habits (after passing length check)", () => {
    // GENERIC_RE matches: "^i (eat|drink|like|love|hate|watch|...)\s+\w{1,20}[.!?]?$"
    // Only matches single word after verb (e.g., "I eat pizza" - 12 chars, too short)
    // For 15+ chars: "I eat pepperoni" (14 chars), "I eat pepperonis" (15 chars)
    const result = validateHabit("I eat pepperonis");
    assertInvalid(result, "Too generic");
  });

  it("accepts specific, valid habits", () => {
    const result = validateHabit("I organize my bookshelf by color every Sunday evening");
    assertValid(result);
  });

  it("accepts habits with numbers and punctuation", () => {
    const result = validateHabit("I drink exactly 3 cups of coffee before 9 AM daily");
    assertValid(result);
  });
});