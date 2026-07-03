import { describe, it, expect } from "vitest";
import { resolveCompromise } from "../../src/services/negotiation.js";

describe("resolveCompromise", () => {
  it("finds midpoint between proposed and counter", () => {
    const { price } = resolveCompromise(50, 70, 100);
    expect(price).toBe(60);
  });

  it("marks deal acceptable when midpoint is within budget", () => {
    const { acceptable } = resolveCompromise(80, 100, 100);
    expect(acceptable).toBe(true); // midpoint=90, budget=100 → 90 <= 105
  });

  it("marks deal unacceptable when midpoint exceeds budget+5%", () => {
    const { acceptable } = resolveCompromise(110, 130, 100);
    // midpoint=120, budget*1.05=105 → 120 > 105
    expect(acceptable).toBe(false);
  });

  it("handles equal proposed and counter", () => {
    const { price, acceptable } = resolveCompromise(60, 60, 100);
    expect(price).toBe(60);
    expect(acceptable).toBe(true);
  });
});
