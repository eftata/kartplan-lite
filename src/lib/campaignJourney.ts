import { campaignFee, campaignReward, eligibleCards } from "./optimizer";
import { looksLikeCardNumber } from "./money";
import { campaignTargets } from "./campaignTargets";
import type {
  Campaign,
  CampaignEnrollment,
  CampaignEntry,
  CampaignProgress,
  CatalogCard,
} from "./types";

export function entryKey(c: Campaign, entry: CampaignEntry) {
  return c.separateDays
    ? entry.day
    : `${entry.day}|${(entry.merchant ?? "").trim().toLocaleLowerCase("tr")}`;
}
export function entryProblem(
  c: Campaign,
  enrollment: CampaignEnrollment,
  entry: CampaignEntry,
  old: CampaignProgress | undefined,
  today: string,
): string | null {
  if (!Number.isSafeInteger(entry.amountKurus) || entry.amountKurus <= 0)
    return "Pozitif bir işlem tutarı gir.";
  if (
    entry.day < c.startsAt ||
    entry.day > c.endsAt ||
    entry.day > today ||
    entry.day.slice(0, 7) !== enrollment.season
  )
    return "İşlem tarihi bu ay ve kampanya dönemi içinde olmalı; gelecekte olamaz.";
  if (c.requiresJoin && (!enrollment.bankJoined || entry.day < enrollment.joinDay))
    return "İşlem banka katılımından önce olamaz.";
  if (!entry.conditionsConfirmed || !entry.merchant?.trim() || entry.merchant.trim().length < 2)
    return "Mağaza adını ve kampanyanın mağaza/POS/ödeme koşullarını onayla.";
  if (looksLikeCardNumber(entry.merchant ?? ""))
    return "Mağaza alanına kart numarası girme; yalnızca işyeri adını yaz.";
  if (
    c.merchantPattern &&
    !new RegExp(c.merchantPattern, "u").test((entry.merchant ?? "").trim().toLocaleLowerCase("tr"))
  )
    return "Mağaza/kanal adı bu kampanyayla eşleşmiyor. Kampanyaya özel marka veya uygulama adını doğru yaz.";
  const minimum =
    c.transactionMinKurus ?? (c.repeatReward || c.rewardKind === "oran" ? c.minSpendKurus : 0);
  if (entry.amountKurus < minimum)
    return `İşlem tek alışveriş için gereken alt tutarı karşılamıyor.`;
  if (c.transactionMaxExclusiveKurus && entry.amountKurus >= c.transactionMaxExclusiveKurus)
    return "Bu kampanya yalnızca belirtilen üst işlem sınırının altındaki alışverişleri sayar.";
  if (old?.completed) return "Seçtiğin kampanya hedefi tamamlandı. Yeni işlem eklenmez.";
  if ((c.separateDays || c.sameDayMerchantOnce) && old?.qualificationKeys?.[entryKey(c, entry)])
    return c.separateDays
      ? "Bu kampanyada aynı gün yalnızca bir işlem sayılır."
      : "Aynı gün aynı mağazada ikinci işlem bu kampanyaya sayılmaz.";
  return null;
}
export function nextJourneyProgress(
  c: Campaign,
  card: CatalogCard,
  enrollment: CampaignEnrollment,
  old: CampaignProgress | undefined,
  entry: CampaignEntry,
): CampaignProgress {
  const count = (old?.qualifiedCount ?? 0) + 1;
  const qualifiedTotal = (old?.qualifiedTotalKurus ?? 0) + entry.amountKurus;
  const effective = c.repeatReward
    ? count * c.minSpendKurus
    : c.requiredTransactions
      ? Math.min(count, c.requiredTransactions) * (c.transactionMinKurus ?? 0)
      : qualifiedTotal;
  const completed = effective >= enrollment.targetKurus;
  const reward = Math.max(
    0,
    campaignReward(c, Math.min(effective, enrollment.targetKurus)) - campaignFee(c, card),
  );
  return {
    id: `${enrollment.season}_${c.id}`,
    season: enrollment.season,
    campaignId: c.id,
    cardId: card.id,
    category: enrollment.category,
    entries: [...(old?.entries ?? []), entry],
    totalKurus: (old?.totalKurus ?? 0) + entry.amountKurus,
    qualifiedTotalKurus: qualifiedTotal,
    qualifiedCount: count,
    qualificationKeys: { ...old?.qualificationKeys, [entryKey(c, entry)]: true },
    effectiveKurus: effective,
    earnedKurus: completed ? reward : 0,
    completed,
  };
}
export type JourneyRow = {
  campaign: Campaign;
  cards: CatalogCard[];
  enrollment?: CampaignEnrollment;
  progress?: CampaignProgress;
  potentialKurus: number;
  earnedKurus: number;
  ratio: number;
  state: "eligible" | "joined" | "active" | "completed" | "expired";
};
export function journeyRows(
  campaigns: Campaign[],
  cards: CatalogCard[],
  enrollments: CampaignEnrollment[],
  progress: CampaignProgress[],
  today: string,
  catalog: CatalogCard[] = cards,
): JourneyRow[] {
  return campaigns
    .filter(
      (c) =>
        !c.demo &&
        c.status === "yayinda" &&
        c.category !== "tumu" &&
        ((c.startsAt <= today && c.endsAt >= today) ||
          enrollments.some((e) => e.campaignId === c.id)),
    )
    .map((c): JourneyRow => {
      const own = eligibleCards(c, cards);
      const enrollment = enrollments.find((e) => e.campaignId === c.id);
      const p = progress.find((p) => p.campaignId === c.id);
      const card = catalog.find((k) => k.id === enrollment?.cardId);
      const potential =
        enrollment && card
          ? Math.max(0, campaignReward(c, enrollment.targetKurus) - campaignFee(c, card))
          : 0;
      // Banked money is not implied: these are completed targets based on accepted self-reported transactions.
      const earned =
        p?.completed && enrollment
          ? Math.min(p.earnedKurus ?? 0, potential || (p.earnedKurus ?? 0))
          : 0;
      return {
        campaign: c,
        cards: enrollment && card && !own.some((k) => k.id === card.id) ? [...own, card] : own,
        enrollment,
        progress: p,
        potentialKurus: potential,
        earnedKurus: earned,
        ratio: enrollment ? Math.min(1, (p?.effectiveKurus ?? 0) / enrollment.targetKurus) : 0,
        state:
          earned > 0
            ? "completed"
            : c.endsAt < today
              ? "expired"
              : !enrollment
                ? "eligible"
                : (p?.qualifiedCount ?? 0) > 0
                  ? "active"
                  : "joined",
      };
    })
    .filter((r) => r.cards.length > 0 || !!r.enrollment);
}
export function journeyTotals(rows: JourneyRow[]) {
  const pools = new Map<string, { potential: number; earned: number }>();
  for (const r of rows.filter((r) => r.enrollment)) {
    const key = r.campaign.calculationGroup ?? r.campaign.id;
    const old = pools.get(key) ?? { potential: 0, earned: 0 };
    pools.set(key, {
      potential: Math.max(old.potential, r.potentialKurus),
      earned: Math.max(old.earned, r.earnedKurus),
    });
  }
  const ratios = new Map<string, number>();
  for (const row of rows.filter((r) => r.enrollment)) {
    const key = row.campaign.calculationGroup ?? row.campaign.id;
    ratios.set(key, Math.max(ratios.get(key) ?? 0, row.ratio));
  }
  return {
    progressPercent: ratios.size
      ? Math.round(([...ratios.values()].reduce((s, r) => s + r, 0) * 100) / ratios.size)
      : 0,
    potentialKurus: [...pools.values()].reduce((s, p) => s + p.potential, 0),
    earnedKurus: [...pools.values()].reduce((s, p) => s + p.earned, 0),
    enrolled: rows.filter((r) => r.enrollment).length,
    completed: rows.filter((r) => r.state === "completed").length,
    active: rows.filter((r) => r.state === "active" || r.state === "joined").length,
  };
}
export function ruleModel(c: Campaign, catalog: CatalogCard[]) {
  return {
    ...c,
    poolKey: c.calculationGroup ?? c.id,
    merchantPattern: c.merchantPattern ?? ".*",
    repeatReward: !!c.repeatReward,
    requiredTransactions: c.requiredTransactions ?? 0,
    transactionMinKurus:
      c.transactionMinKurus ?? (c.repeatReward || c.rewardKind === "oran" ? c.minSpendKurus : 0),
    transactionMaxExclusiveKurus: c.transactionMaxExclusiveKurus ?? 0,
    separateDays: !!c.separateDays,
    sameDayMerchantOnce: !!c.sameDayMerchantOnce,
    skipTransactions: c.skipTransactions ?? 0,
    feeCardIds: catalog.filter((k) => k.name === "Bonus Genç").map((k) => k.id),
    participationFeeKurus: c.participationFeeKurus ?? 0,
  };
}
export function availableTarget(row: JourneyRow, budget: number) {
  const card = row.cards.find((c) => c.id === row.enrollment?.cardId) ?? row.cards[0];
  return card ? campaignTargets(row.campaign, card, budget) : null;
}
