import { describe, it, expect } from "vitest";
import { PLAN_CAMPAIGNS } from "./planCampaigns";
import { SEED_CARDS } from "./seed";
import { entryProblem, nextJourneyProgress, journeyRows, journeyTotals } from "./campaignJourney";
import type { CampaignEnrollment, CampaignEntry } from "./types";
const c = PLAN_CAMPAIGNS.find((c) => c.title.startsWith("Bonus Genç'le market"))!;
const card = SEED_CARDS.find((c) => c.id === "bonus-genc")!;
const e: CampaignEnrollment = {
  id: `2026-10_${c.id}`,
  season: "2026-10",
  campaignId: c.id,
  cardId: card.id,
  category: "market",
  targetKurus: 100000,
  joinDay: "2026-10-01",
  bankJoined: true,
  conditionsAccepted: true,
};
const entry = (merchant = "market-a", amountKurus = 50000): CampaignEntry => ({
  day: "2026-10-21",
  amountKurus,
  merchant,
  conditionsConfirmed: true,
});
describe("single campaign lifecycle", () => {
  it("does not book potential as earned before completion", () => {
    const p = nextJourneyProgress(c, card, e, undefined, entry());
    expect(p.completed).toBe(false);
    expect(p.earnedKurus).toBe(0);
    const done = nextJourneyProgress(c, card, e, p, entry("market-b"));
    expect(done.completed).toBe(true);
    expect(done.earnedKurus).toBe(16000);
    expect(entryProblem(c, e, entry("market-c"), done, "2026-10-21")).toContain("tamamlandı");
  });
  it("rejects wrong dates, subminimum purchases and duplicate merchant/day", () => {
    const p = nextJourneyProgress(c, card, e, undefined, entry());
    expect(entryProblem(c, e, entry(), p, "2026-10-21")).toContain("ikinci");
    expect(entryProblem(c, e, entry("market-b", 1000), undefined, "2026-10-21")).toContain(
      "alt tutarı",
    );
    expect(
      entryProblem(c, e, { ...entry(), day: "2026-11-01" }, undefined, "2026-10-21"),
    ).toContain("tarihi");
    expect(
      entryProblem(c, e, { ...entry(), conditionsConfirmed: false }, undefined, "2026-10-21"),
    ).toContain("onayla");
  });
  it("shares enrolled, active and completed states across all pages", () => {
    const p = nextJourneyProgress(c, card, e, undefined, entry());
    expect(journeyRows([c], [card], [e], [p], "2026-10-21")[0]?.state).toBe("active");
    expect(journeyTotals(journeyRows([c], [card], [e], [p], "2026-10-21")).progressPercent).toBe(
      50,
    );
    const done = nextJourneyProgress(c, card, e, p, entry("other"));
    const rows = journeyRows([c], [card], [e], [done], "2026-10-21");
    expect(journeyTotals(rows)).toMatchObject({
      potentialKurus: 16000,
      earnedKurus: 16000,
      completed: 1,
    });
    expect(journeyRows([c], [], [e], [done], "2026-10-21", [card])[0]?.earnedKurus).toBe(16000);
  });
  it("rejects another merchant for a brand-specific campaign", () => {
    const coffee = PLAN_CAMPAIGNS.find((c) => c.id === "96dc683fd2e5628c")!;
    expect(
      entryProblem(
        coffee,
        { ...e, campaignId: coffee.id },
        entry("migros", 30000),
        undefined,
        "2026-10-21",
      ),
    ).toContain("eşleşmiyor");
    expect(
      entryProblem(
        coffee,
        { ...e, campaignId: coffee.id },
        entry("coffy ataşehir", 30000),
        undefined,
        "2026-10-21",
      ),
    ).toBeNull();
  });
  it("does not count legacy unchecked progress as earned", () => {
    const old = {
      id: e.id,
      season: e.season,
      campaignId: c.id,
      cardId: card.id,
      category: e.category,
      totalKurus: 100000,
      entries: [{ amountKurus: 100000, day: "2026-10-21" }],
    };
    expect(journeyTotals(journeyRows([c], [card], [e], [old], "2026-10-21")).earnedKurus).toBe(0);
  });
});
