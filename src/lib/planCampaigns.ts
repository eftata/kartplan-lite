import rules from "./plan-rules.json";
import { SEED_CARDS } from "./seed";
import type { Campaign } from "./types";

/** Explicit card eligibility for the reviewed planning rules; never infer eligibility by logo alone. */
export const PLAN_CAMPAIGNS: Campaign[] = rules.map((rule) => {
  const cardIds = rule.cardIds.length
    ? rule.cardIds
    : SEED_CARDS.filter((card) => {
        if (card.cardType === "banka" || /Business|İşletme|Üretici/i.test(card.name)) return false;
        if (rule.program === "bonus")
          return (
            card.bank === "Garanti BBVA" && card.program === "bonus" && !/Flexi/i.test(card.name)
          );
        if (rule.program === "maximum")
          return (
            card.bank === "Türkiye İş Bankası" && ["maximum", "maximiles"].includes(card.program)
          );
        return card.program === rule.program;
      }).map((card) => card.id);
  return {
    ...rule,
    cardIds,
    category: rule.category as Campaign["category"],
    benefit: "puan",
    rewardKind: rule.rewardKind as Campaign["rewardKind"],
    status: "yayinda",
  };
});

export function mergePlanCampaigns(managed: Campaign[]): Campaign[] {
  // A managed rule for the same official page replaces the bundled one, including draft/expiry.
  const urls = new Set(managed.map((c) => c.url).filter(Boolean));
  const ids = new Set(managed.map((c) => c.id));
  return [...PLAN_CAMPAIGNS.filter((c) => !ids.has(c.id) && !urls.has(c.url)), ...managed];
}
