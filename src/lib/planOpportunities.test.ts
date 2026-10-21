import { describe, expect, it } from "vitest";
import { planOpportunities, relatedCards } from "./planOpportunities";
import { planWithReservations } from "./planReservations";
import { eligibleCards, optimize } from "./optimizer";
import { mergePlanCampaigns } from "./planCampaigns";
import { SEED_CARDS } from "./seed";
import type { ExternalCampaign } from "./externalCampaigns";

const today = "2026-10-21";
const cards = SEED_CARDS.filter((c) =>
  [
    "bonus-genc",
    "axess",
    "ing-ing-bonus-card",
    "maximum-kart",
    "turkiye-is-bankasi-maximiles",
  ].includes(c.id),
);
const rules = mergePlanCampaigns([]);
const input = {
  cards,
  spend: { market: 600_000, restoran: 150_000, akaryakit: 800_000, fatura: 50_000 },
  campaigns: rules,
  joined: {},
  today,
};
const source = (id: string, extra: Partial<ExternalCampaign> = {}): ExternalCampaign => ({
  id,
  title: "Markaya özel ek kazanç fırsatı",
  program: "bonus",
  category: "Market",
  summary: "Mağazada alışverişe ödül",
  benefit: "500 TL bonus",
  endsAt: "2026-10-31",
  sourceUrl: `https://www.bonus.com.tr/kampanyalar/${id}`,
  ...extra,
});

describe("complete plan opportunity visibility", () => {
  it("shows unmodelled offers with a reason rather than silently hiding them", () => {
    const opportunities = planOpportunities(
      [source("unmodelled")],
      rules,
      cards,
      input.spend,
      today,
      new Set(),
    );
    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]?.status).toBe("review");
    expect(opportunities[0]?.reason).toContain("toplam kazanca eklenmez");
  });
  it("keeps no-budget offers visible and excludes expired ones", () => {
    const rows = planOpportunities(
      [source("a", { category: "Seyahat" }), source("b", { endsAt: "2026-10-20" })],
      rules,
      cards,
      input.spend,
      today,
      new Set(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("no-budget");
  });
  it("does not reject a Garanti card just because Miles&Smiles Garanti cards are excluded", () => {
    const c = source("petrol", {
      conditions: ["Miles&Smiles Garanti BBVA ve ING Bonus kartlar dahil değildir."],
    });
    expect(relatedCards(c, cards).some((c) => c.id === "bonus-genc")).toBe(true);
    expect(relatedCards(c, cards).some((c) => c.bank === "ING")).toBe(false);
  });
  it("matches short bank names as words rather than parts of unrelated Turkish words", () => {
    const campaign = source("only-garanti", {
      eligibility: "Kampanyaya sadece Garanti BBVA kredi kartları için geçerlidir.",
    });
    expect(relatedCards(campaign, cards).some((c) => c.bank === "ING")).toBe(false);
  });
  it("respects explicit eligible card IDs across program names", () => {
    const maximumRule = rules.find((c) => c.id === "af362bb454219328")!;
    const maximiles = cards.find((c) => c.program === "maximiles")!;
    expect(maximiles).toBeTruthy();
    expect(eligibleCards(maximumRule, [maximiles])).toHaveLength(1);
  });
});

describe("merchant budget reservations", () => {
  it("does not assume unknown merchant or age eligibility automatically", () => {
    expect(optimize(input).outcomes.some((o) => o.campaign.scenarioOnly)).toBe(false);
  });
  it("adds the verified Petrol Ofisi scenario and preserves the total budget", () => {
    const baseline = optimize(input);
    const { plan, issues } = planWithReservations(input, [
      { campaignId: "1de094369c858fad", cardId: "bonus-genc", amountKurus: 640_000 },
    ]);
    expect(issues).toEqual([]);
    expect(plan.totalKurus - baseline.totalKurus).toBe(45_000);
    expect(plan.lines.reduce((s, l) => s + l.amountKurus, 0)).toBe(plan.totalSpendKurus);
    expect(plan.outcomes.find((o) => o.campaign.id === "1de094369c858fad")?.spentKurus).toBe(
      640_000,
    );
  });
  it("deducts a coffee budget from the general restaurant campaign", () => {
    const { plan } = planWithReservations(input, [
      { campaignId: "96dc683fd2e5628c", cardId: "bonus-genc", amountKurus: 90_000 },
    ]);
    expect(plan.outcomes.find((o) => o.campaign.id === "96dc683fd2e5628c")?.rewardKurus).toBe(
      15_000,
    );
    expect(plan.outcomes.find((o) => o.campaign.id === "1bf42a025092a1c8")?.spentKurus).toBe(
      60_000,
    );
    expect(plan.outcomes.find((o) => o.campaign.id === "1bf42a025092a1c8")?.rewardKurus).toBe(
      8_000,
    );
  });
  it("rejects oversubscription, wrong issuer and sub-threshold reservations", () => {
    const over = planWithReservations(input, [
      { campaignId: "96dc683fd2e5628c", cardId: "bonus-genc", amountKurus: 90_000 },
      { campaignId: "1ae241b39cb5c59b", cardId: "bonus-genc", amountKurus: 90_000 },
    ]);
    expect(over.accepted).toHaveLength(1);
    expect(over.issues).toHaveLength(1);
    const invalid = planWithReservations(input, [
      { campaignId: "1de094369c858fad", cardId: "ing-ing-bonus-card", amountKurus: 640_000 },
      { campaignId: "1de094369c858fad", cardId: "bonus-genc", amountKurus: 300_000 },
    ]);
    expect(invalid.accepted).toHaveLength(0);
    expect(invalid.plan.totalKurus).toBe(optimize(input).totalKurus);
  });
});
