import { describe, expect, it } from "vitest";
import imported from "./imported-cards.json";
import { SEED_CARDS } from "./seed";

describe("expanded card catalog", () => {
  it("includes every source card once with unique IDs", () => {
    expect(imported).toHaveLength(62);
    expect(new Set(SEED_CARDS.map((c) => c.id)).size).toBe(SEED_CARDS.length);
    for (const card of imported)
      expect(SEED_CARDS.filter((c) => c.sourceUrl === card.sourceUrl)).toHaveLength(1);
  });
  it("preserves saved wallet IDs and separates issuers", () => {
    expect(SEED_CARDS.find((c) => c.id === "bonus-card")?.bank).toBe("Garanti BBVA");
    expect(SEED_CARDS.find((c) => c.id === "maximum-kart")?.sourceUrl).toBeTruthy();
    const bonus = SEED_CARDS.filter((c) => c.name === "Bonus Card");
    expect(bonus).toHaveLength(2);
    expect(new Set(bonus.map((c) => c.program)).size).toBe(2);
    expect(SEED_CARDS.find((c) => c.name === "Wings")?.program).toBe("wings");
  });
  it("distinguishes debit cards and does not invent reward rates", () => {
    expect(SEED_CARDS.filter((c) => c.cardType === "banka")).toHaveLength(3);
    expect(SEED_CARDS.every((c) => c.baseRateBps === 0 && !c.verified)).toBe(true);
  });
});
