import { describe, it, expect } from "vitest";
import { containsProfanity, censorProfanity } from "../profanity";

describe("profanity module", () => {
  describe("containsProfanity", () => {
    describe("detects common profanity", () => {
      const profaneWords = ["shit", "fuck", "ass", "damn", "bitch", "crap"];

      profaneWords.forEach((word) => {
        it(`detects "${word}"`, () => {
          expect(containsProfanity(word)).toBe(true);
        });
      });
    });

    describe("case insensitivity", () => {
      it("detects uppercase profanity", () => {
        expect(containsProfanity("SHIT")).toBe(true);
        expect(containsProfanity("FUCK")).toBe(true);
      });

      it("detects mixed case profanity", () => {
        expect(containsProfanity("Shit")).toBe(true);
        expect(containsProfanity("FuCk")).toBe(true);
      });
    });

    describe("profanity in context", () => {
      it("detects profanity at start of sentence", () => {
        expect(containsProfanity("shit happens")).toBe(true);
      });

      it("detects profanity at end of sentence", () => {
        expect(containsProfanity("what the shit")).toBe(true);
      });

      it("detects profanity in middle of sentence", () => {
        expect(containsProfanity("this is fucking amazing")).toBe(true);
      });

      it("detects multiple profane words", () => {
        expect(containsProfanity("shit and fuck")).toBe(true);
      });
    });

    describe("clean text (should return false)", () => {
      it("returns false for empty string", () => {
        expect(containsProfanity("")).toBe(false);
      });

      it("returns false for normal words", () => {
        expect(containsProfanity("hello")).toBe(false);
        expect(containsProfanity("world")).toBe(false);
        expect(containsProfanity("game")).toBe(false);
      });

      it("returns false for sentences without profanity", () => {
        expect(containsProfanity("Good game everyone")).toBe(false);
        expect(containsProfanity("Nice play!")).toBe(false);
      });

      it("returns false for words that contain profane substrings but are valid", () => {
        // "class" contains "ass" but is a valid word
        expect(containsProfanity("class")).toBe(false);
        // "assume" contains "ass" but is a valid word
        expect(containsProfanity("assume")).toBe(false);
        // "scrap" contains "crap" but is a valid word
        expect(containsProfanity("scrap")).toBe(false);
      });

      it("returns false for player names", () => {
        expect(containsProfanity("Player1")).toBe(false);
        expect(containsProfanity("GameMaster")).toBe(false);
        expect(containsProfanity("CodeNinja")).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("handles whitespace-only strings", () => {
        expect(containsProfanity("   ")).toBe(false);
        expect(containsProfanity("\t\n")).toBe(false);
      });

      it("handles special characters", () => {
        expect(containsProfanity("!@#$%")).toBe(false);
      });

      it("handles numbers", () => {
        expect(containsProfanity("12345")).toBe(false);
        expect(containsProfanity("Player123")).toBe(false);
      });

      it("handles emojis", () => {
        expect(containsProfanity("🎮")).toBe(false);
        expect(containsProfanity("Good game! 🎉")).toBe(false);
      });

      it("detects profanity with emojis", () => {
        expect(containsProfanity("shit 💩")).toBe(true);
      });
    });
  });

  describe("censorProfanity", () => {
    describe("censors profane words", () => {
      it("replaces single profane word with asterisks", () => {
        const result = censorProfanity("shit");
        expect(result).not.toContain("shit");
        expect(result).toContain("*");
      });

      it("replaces profanity in sentence", () => {
        const result = censorProfanity("what the shit");
        expect(result).not.toContain("shit");
        expect(result.toLowerCase()).toContain("what the");
      });

      it("replaces multiple profane words", () => {
        const result = censorProfanity("shit and fuck");
        expect(result).not.toContain("shit");
        expect(result).not.toContain("fuck");
      });
    });

    describe("preserves clean text", () => {
      it("returns clean text unchanged", () => {
        expect(censorProfanity("hello world")).toBe("hello world");
        expect(censorProfanity("Good game!")).toBe("Good game!");
      });

      it("returns empty string unchanged", () => {
        expect(censorProfanity("")).toBe("");
      });

      it("preserves valid words with profane substrings", () => {
        expect(censorProfanity("class")).toBe("class");
        expect(censorProfanity("assume")).toBe("assume");
      });
    });

    describe("case handling", () => {
      it("censors uppercase profanity", () => {
        const result = censorProfanity("SHIT");
        expect(result).not.toMatch(/shit/i);
      });

      it("censors mixed case profanity", () => {
        const result = censorProfanity("Shit");
        expect(result).not.toMatch(/shit/i);
      });
    });

    describe("edge cases", () => {
      it("handles emojis in text", () => {
        const result = censorProfanity("Good job! 🎉");
        expect(result).toBe("Good job! 🎉");
      });

      it("censors profanity while preserving emojis", () => {
        const result = censorProfanity("shit 💩");
        expect(result).not.toContain("shit");
        expect(result).toContain("💩");
      });

      it("handles special characters", () => {
        expect(censorProfanity("hello!@#")).toBe("hello!@#");
      });

      it("handles numbers", () => {
        expect(censorProfanity("Player123")).toBe("Player123");
      });
    });
  });
});
