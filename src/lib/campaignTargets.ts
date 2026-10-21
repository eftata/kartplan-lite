import { campaignFee, campaignReward, netCampaignReward } from "./optimizer";
import type { Campaign, CatalogCard } from "./types";
/** Thresholds are a spending plan; they never certify the merchant or bank participation. */
export function campaignTargets(c: Campaign, card: CatalogCard, budget: number, spent = 0) {
  const fee = campaignFee(c, card);
  const first = c.repeatReward
    ? ((c.skipTransactions ?? 0) + Math.floor(fee / c.rewardKurus) + 1) * c.minSpendKurus
    : c.rewardKind === "oran"
      ? Math.max(c.minSpendKurus, Math.ceil(((fee + 1) * 10000) / Math.max(c.rateBps, 1)))
      : Math.max(c.minSpendKurus, 1);
  const full = c.repeatReward
    ? (Math.ceil(c.capKurus / c.rewardKurus) + (c.skipTransactions ?? 0)) * c.minSpendKurus
    : c.rewardKind === "oran" && c.capKurus > 0
      ? Math.max(c.minSpendKurus, Math.ceil((c.capKurus * 10000) / Math.max(c.rateBps, 1)))
      : c.rewardKind === "sabit"
        ? first
        : budget;
  const feasible = c.repeatReward
    ? Math.max(0, Math.floor(Math.min(budget, full) / c.minSpendKurus) * c.minSpendKurus)
    : Math.min(budget, full);
  return {
    firstKurus: first,
    fullKurus: full,
    suggestedKurus: feasible >= first ? feasible : first,
    missingFirstKurus: Math.max(0, first - spent),
    missingFullKurus: Math.max(0, full - spent),
    budgetGapKurus: Math.max(0, first - budget),
    rewardKurus: netCampaignReward(c, Math.max(0, feasible), card),
    grossKurus: campaignReward(c, Math.max(0, feasible)),
    transactions: c.repeatReward ? Math.floor(Math.max(0, feasible) / c.minSpendKurus) : null,
  };
}
