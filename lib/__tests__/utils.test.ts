import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("merges multiple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
    expect(cn("foo", true && "bar", "baz")).toBe("foo bar baz");
  });

  it("merges Tailwind classes correctly", () => {
    // tailwind-merge should resolve conflicting classes
    expect(cn("px-4 py-2", "px-6")).toBe("py-2 px-6");
  });

  it("handles undefined and null values", () => {
    expect(cn("foo", undefined, "bar", null)).toBe("foo bar");
  });

  it("handles empty strings", () => {
    expect(cn("foo", "", "bar")).toBe("foo bar");
  });

  it("handles arrays of classes", () => {
    expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
  });

  it("handles objects with boolean values", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("merges conflicting Tailwind width classes", () => {
    expect(cn("w-full", "w-1/2")).toBe("w-1/2");
  });

  it("merges conflicting Tailwind background classes", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("preserves non-conflicting classes", () => {
    expect(cn("text-sm font-bold", "text-lg")).toBe("font-bold text-lg");
  });

  it("handles complex combination", () => {
    const result = cn(
      "px-4 py-2",
      true && "bg-blue-500",
      false && "bg-red-500",
      { "text-white": true, "text-black": false },
      "hover:bg-blue-600"
    );
    expect(result).toBe("px-4 py-2 bg-blue-500 text-white hover:bg-blue-600");
  });

  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });

  it("returns empty string for all falsy values", () => {
    expect(cn(false, null, undefined, "")).toBe("");
  });
});
