import type { Campaign, CampaignProgress } from "./types";
/** Self-reported transactions never certify merchant/POS eligibility. Large purchases count once. */
export function recordedProgress(c: Campaign, entries: CampaignProgress["entries"]) {
  const minimum =
    c.transactionMinKurus ?? (c.repeatReward || c.rewardKind === "oran" ? c.minSpendKurus : 0);
  let qualified = entries.filter(
    (e) =>
      e.amountKurus >= minimum &&
      (!c.transactionMaxExclusiveKurus || e.amountKurus < c.transactionMaxExclusiveKurus),
  );
  if (c.separateDays) {
    const seen = new Set<string>();
    qualified = qualified.filter((e) => {
      if (seen.has(e.day)) return false;
      seen.add(e.day);
      return true;
    });
  }
  if (c.requiredTransactions)
    return {
      effectiveKurus: Math.min(qualified.length, c.requiredTransactions) * minimum,
      qualifyingTransactions: qualified.length,
    };
  if (c.repeatReward)
    return {
      effectiveKurus: qualified.length * c.minSpendKurus,
      qualifyingTransactions: qualified.length,
    };
  return {
    effectiveKurus: qualified.reduce((s, e) => s + e.amountKurus, 0),
    qualifyingTransactions: null,
  };
}
