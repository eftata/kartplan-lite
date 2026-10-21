import { describe, it, expect } from "vitest";
import { campaignTargets } from "./campaignTargets";
import { leagueScore, scoreRank } from "./league";
import { mergePlanCampaigns } from "./planCampaigns";
import { SEED_CARDS } from "./seed";
import { planWithReservations } from "./planReservations";
const rules = mergePlanCampaigns([]);
describe("campaign targets", () => {
  it("includes skipped transactions before the first fuel reward", () => {
    const c = rules.find((x) => x.id === "1de094369c858fad")!;
    const card = SEED_CARDS.find((c) => c.id === "bonus-genc")!;
    const t = campaignTargets(c, card, 500000, 160000);
    expect(t.firstKurus).toBe(640000);
    expect(t.budgetGapKurus).toBe(140000);
    expect(t.missingFirstKurus).toBe(480000);
    expect(t.rewardKurus).toBe(0);
  });
  it("accepts two different card programs in the same category without duplicating spend", () => {
    const cards = SEED_CARDS;
    const byCat = rules.filter((c) => !c.scenarioOnly && c.category === "market");
    const a = byCat.find((c) => c.program === "bonus")!;
    const b = byCat.find((c) => c.program !== "bonus")!;
    const ra = {
      campaignId: a.id,
      cardId: a.cardIds[0]!,
      amountKurus: campaignTargets(
        a,
        cards.find((x) => x.id === a.cardIds[0])!,
        10000000,
      ).firstKurus,
    };
    const rb = {
      campaignId: b.id,
      cardId: b.cardIds[0]!,
      amountKurus: campaignTargets(
        b,
        cards.find((x) => x.id === b.cardIds[0])!,
        10000000,
      ).firstKurus,
    };
    const result = planWithReservations(
      { cards, campaigns: rules, spend: { market: 10000000 }, joined: {}, today: "2026-10-21" },
      [ra, rb],
    );
    expect(result.accepted).toHaveLength(2);
    expect(result.issues).toEqual([]);
    expect(result.plan.lines.reduce((s, l) => s + l.amountKurus, 0)).toBe(10000000);
  });
});
describe("monthly task points", () => {
  it("awards fixed tasks once regardless of spending", () => {
    expect(leagueScore({ wallet: true, budget: true }, { "2026-10-21": true })).toBe(135);
    expect(leagueScore({ wallet: true, budget: true }, { "2026-10-21": true })).toBe(135);
  });
  it("gives tied leaders the same rank", () => {
    expect(
      scoreRank(
        [
          { id: "a", nickname: "A", score: 200 },
          { id: "b", nickname: "B", score: 200 },
        ],
        "b",
      ),
    ).toBe(1);
  });
});

describe("recorded transaction progress", () => {
  it("does not turn one oversized transaction into four separate fuel purchases", async () => {
    const { recordedProgress } = await import("./campaignProgress");
    const c = rules.find((x) => x.id === "1de094369c858fad")!;
    expect(recordedProgress(c, [{ amountKurus: 640000, day: "2026-10-21" }]).effectiveKurus).toBe(
      160000,
    );
    expect(
      recordedProgress(c, [
        { amountKurus: 160000, day: "2026-10-21" },
        { amountKurus: 160000, day: "2026-10-21" },
      ]).effectiveKurus,
    ).toBe(160000);
    expect(
      recordedProgress(
        c,
        [1, 2, 3, 4].map((n) => ({ amountKurus: 160000, day: `2026-10-0${n}` })),
      ).effectiveKurus,
    ).toBe(640000);
  });
  it("sums eligible small Maximum purchases and excludes a large transaction", async () => {
    const { recordedProgress } = await import("./campaignProgress");
    const c = rules.find((x) => x.id === "af362bb454219328")!;
    expect(
      recordedProgress(c, [
        { amountKurus: 140000, day: "2026-10-21" },
        { amountKurus: 160000, day: "2026-10-21" },
      ]).effectiveKurus,
    ).toBe(140000);
  });
});
