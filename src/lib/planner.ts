import { campaignTargets } from "./campaignTargets";
import { eligibleCards, isActiveThisMonth, netCampaignReward } from "./optimizer";
import { planWithReservations, type PlanReservation } from "./planReservations";
import type { Campaign, CatalogCard, SpendProfile } from "./types";
export function selectCampaign(
  c: Campaign,
  cards: CatalogCard[],
  spend: SpendProfile,
  campaigns: Campaign[],
  choices: PlanReservation[],
  today: string,
  preferredCardId?: string,
  allocation: "first" | "budget" = "first",
) {
  if (c.category === "tumu" || !isActiveThisMonth(c, today) || c.startsAt > today)
    throw new Error("Bu kampanya şu anda planlanamıyor.");
  const eligible = eligibleCards(c, cards);
  const card =
    eligible.find((k) => k.id === preferredCardId) ??
    eligible.sort(
      (a, b) =>
        netCampaignReward(c, spend[c.category as keyof SpendProfile] ?? 0, b) -
        netCampaignReward(c, spend[c.category as keyof SpendProfile] ?? 0, a),
    )[0];
  if (!card) throw new Error("Önce bu kampanyaya uygun, sahip olduğun kartı cüzdanına ekle.");
  const existing = choices.filter((r) => r.campaignId !== c.id);
  const allocated = existing
    .filter((r) => campaigns.find((x) => x.id === r.campaignId)?.category === c.category)
    .reduce((s, r) => s + r.amountKurus, 0);
  const remaining = (spend[c.category] ?? 0) - allocated;
  const target = campaignTargets(c, card, Math.max(0, remaining));
  if (remaining < target.firstKurus)
    throw new Error(
      "Bu kampanya için kalan sektör bütçesi yetersiz. Önce bütçeni veya diğer seçimlerini düzenle.",
    );
  const next = [
    ...existing,
    {
      campaignId: c.id,
      cardId: card.id,
      amountKurus: allocation === "first" ? target.firstKurus : target.suggestedKurus,
    },
  ];
  const check = planWithReservations({ cards, spend, campaigns, joined: {}, today }, next);
  if (check.issues.some((issue) => issue.includes("ödül havuzundan")))
    throw new Error(
      "Bu bankanın aynı sektördeki kampanyaları birlikte hesaplanamıyor. Önce mevcut alternatifini kaldır veya farklı bir bankanın kampanyasını seç.",
    );
  if (check.issues.length) throw new Error(check.issues.join(" "));
  return check.accepted;
}
export function selectedReward(
  choices: PlanReservation[],
  campaigns: Campaign[],
  cards: CatalogCard[],
) {
  return choices.reduce((sum, r) => {
    const c = campaigns.find((c) => c.id === r.campaignId);
    const card = cards.find((k) => k.id === r.cardId);
    return sum + (c && card ? netCampaignReward(c, r.amountKurus, card) : 0);
  }, 0);
}
