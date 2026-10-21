import { describe, it, expect } from "vitest";
import { selectCampaign, selectedReward } from "./planner";
import { PLAN_CAMPAIGNS } from "./planCampaigns";
import { SEED_CARDS } from "./seed";
const campaigns = PLAN_CAMPAIGNS;
const young = campaigns.find((c) => c.id === "35aa5cbf680a8f6a")!;
const paraf = campaigns.find((c) => c.id === "ee0e43feb8a89106")!;
const cards = SEED_CARDS.filter((k) => ["bonus-genc", "paraf"].includes(k.id));
const today = "2026-10-22";
describe("guided campaign selection", () => {
  it("assigns an eligible owned card and first reward budget automatically", () => {
    const next = selectCampaign(young, cards, { market: 500000 }, campaigns, [], today);
    expect(next).toEqual([{ campaignId: young.id, cardId: "bonus-genc", amountKurus: 50000 }]);
    expect(selectedReward(next, campaigns, cards)).toBe(8000);
  });
  it("allows different cards in one category without exceeding its budget", () => {
    const first = selectCampaign(young, cards, { market: 500000 }, campaigns, [], today);
    const next = selectCampaign(paraf, cards, { market: 500000 }, campaigns, first, today);
    expect(next).toHaveLength(2);
    expect(next.reduce((s, r) => s + r.amountKurus, 0)).toBeLessThanOrEqual(500000);
    expect(new Set(next.map((r) => r.cardId)).size).toBe(2);
  });
  it("rejects an unowned card and insufficient remaining budget", () => {
    expect(() =>
      selectCampaign(
        young,
        cards.filter((c) => c.id === "paraf"),
        { market: 500000 },
        campaigns,
        [],
        today,
      ),
    ).toThrow("sahip olduğun");
    expect(() => selectCampaign(young, cards, { market: 10000 }, campaigns, [], today)).toThrow(
      "yetersiz",
    );
  });
  it("supports reaching the highest affordable reward when explicitly selected", () => {
    const next = selectCampaign(
      young,
      cards,
      { market: 500000 },
      campaigns,
      [],
      today,
      "bonus-genc",
      "budget",
    );
    expect(next[0]?.amountKurus).toBe(250000);
    expect(selectedReward(next, campaigns, cards)).toBe(40000);
  });
});
