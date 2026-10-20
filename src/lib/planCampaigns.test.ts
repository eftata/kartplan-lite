import { describe, expect, it } from "vitest";
import { PLAN_CAMPAIGNS, mergePlanCampaigns } from "./planCampaigns";
import { SEED_CARDS } from "./seed";
import { campaignReward, eligibleCards, optimize } from "./optimizer";

const today = "2026-10-21";
const findCard = (id: string) => SEED_CARDS.find((c) => c.id === id)!;
const rule = (id: string) => PLAN_CAMPAIGNS.find((c) => c.id === id)!;

describe("official campaign planning integration", () => {
  it("calculates rewards with an empty managed collection and deducts the young card entry fee", () => {
    const campaigns = mergePlanCampaigns([]);
    const plan = optimize({
      cards: [findCard("axess"), findCard("bonus-genc")],
      spend: { market: 600_000, giyim: 100_000 },
      campaigns,
      today,
      joined: {},
    });
    const outcome = plan.outcomes.find((o) => o.cardId === "bonus-genc")!;
    expect(outcome.grossRewardKurus).toBe(30_000);
    expect(outcome.feeKurus).toBe(9_999);
    expect(plan.totalKurus).toBe(20_001);
    expect(plan.lines.reduce((s, l) => s + l.amountKurus, 0)).toBe(700_000);
    expect(outcome.joined).toBe(false);
  });
  it("respects first unpaid transaction, repeat thresholds and caps", () => {
    const axess = rule("46550a6409a56052");
    expect(campaignReward(axess, 275_000)).toBe(0);
    expect(campaignReward(axess, 549_999)).toBe(0);
    expect(campaignReward(axess, 550_000)).toBe(7_500);
    expect(campaignReward(axess, 100_000_000)).toBe(75_000);
    expect(campaignReward(rule("4727aacfa67795f7"), 200_000)).toBe(0);
  });
  it("does not match commercial cards or other Bonus issuers", () => {
    expect(
      eligibleCards(rule("4908fbf5b1c62963"), [
        findCard("garanti-bbva-bonus-business-kart"),
        findCard("ing-ing-bonus-card"),
        findCard("garanti-bbva-bonus-flexi"),
      ]),
    ).toEqual([]);
    expect(eligibleCards(rule("46550a6409a56052"), [findCard("akbank-axess-business")])).toEqual(
      [],
    );
  });
  it("does not count demo, expired rules or unverified base rates in the production input", () => {
    const plan = optimize({
      cards: [{ ...findCard("axess"), baseRateBps: 1000, verified: false }],
      spend: { market: 700_000 },
      campaigns: PLAN_CAMPAIGNS,
      today: "2026-12-01",
      joined: {},
    });
    expect(plan.totalKurus).toBe(0);
  });
  it("counts overlapping rules once and permits a managed rule to replace its source", () => {
    const c = rule("eab890e422df4edb");
    const plan = optimize({
      cards: [findCard("paraf")],
      spend: { market: 3_000_000 },
      campaigns: PLAN_CAMPAIGNS,
      today,
      joined: {},
    });
    expect(
      plan.outcomes.filter((o) => o.campaign.calculationGroup === "paraf-market"),
    ).toHaveLength(1);
    expect(plan.campaignKurus).toBe(150_000);
    const merged = mergePlanCampaigns([{ ...c, id: "managed", status: "taslak" }]);
    expect(merged.filter((x) => x.url === c.url)).toHaveLength(1);
    expect(merged.find((x) => x.url === c.url)?.status).toBe("taslak");
  });
});
