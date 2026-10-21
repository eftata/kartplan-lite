import { applyBps } from "./money";
import {
  baseRate,
  campaignFee,
  campaignReward,
  eligibleCards,
  isActiveThisMonth,
  optimize,
  type CampaignOutcome,
  type Plan,
  type PlanInput,
} from "./optimizer";
import type { CategorySlug } from "./types";

export type PlanReservation = { campaignId: string; cardId: string; amountKurus: number };
export function planWithReservations(
  input: PlanInput,
  reservations: PlanReservation[],
): { plan: Plan; issues: string[]; accepted: PlanReservation[] } {
  const spend = { ...input.spend };
  const outcomes: CampaignOutcome[] = [];
  const accepted: PlanReservation[] = [];
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const reservation of reservations) {
    const campaign = input.campaigns.find(
      (c) =>
        c.id === reservation.campaignId &&
        c.scenarioOnly &&
        !c.demo &&
        isActiveThisMonth(c, input.today),
    );
    const card =
      campaign && eligibleCards(campaign, input.cards).find((c) => c.id === reservation.cardId);
    if (!campaign || !card || campaign.category === "tumu" || ids.has(campaign.id)) {
      issues.push("Seçili kampanya veya kart uygun değil.");
      continue;
    }
    const cat = campaign.category;
    const amount = reservation.amountKurus;
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > (spend[cat] ?? 0)) {
      issues.push(`${campaign.title}: ayrılan tutar kalan sektör bütçesini aşıyor veya geçersiz.`);
      continue;
    }
    const gross = campaignReward(campaign, amount),
      fee = campaignFee(campaign, card);
    if (gross <= fee) {
      issues.push(
        `${campaign.title}: girilen tutar kampanya eşiğinde pozitif net kazanç sağlamıyor.`,
      );
      continue;
    }
    spend[cat] = (spend[cat] ?? 0) - amount;
    ids.add(campaign.id);
    accepted.push(reservation);
    outcomes.push({
      campaign,
      cardId: card.id,
      spentKurus: amount,
      rewardKurus: gross - fee,
      grossRewardKurus: gross,
      feeKurus: fee,
      joined: !!input.joined[campaign.id],
    });
  }
  const remaining = optimize({
    ...input,
    spend,
    campaigns: input.campaigns.filter((c) => !c.scenarioOnly),
  });
  const lines = [...remaining.lines];
  let baseKurus = remaining.baseKurus;
  for (const outcome of outcomes) {
    const cat = outcome.campaign.category as CategorySlug;
    const line = lines.find((l) => l.category === cat && l.cardId === outcome.cardId);
    if (line) line.amountKurus += outcome.spentKurus;
    else lines.push({ category: cat, cardId: outcome.cardId, amountKurus: outcome.spentKurus });
    baseKurus += applyBps(
      outcome.spentKurus,
      baseRate(input.cards.find((c) => c.id === outcome.cardId)!),
    );
  }
  const campaignKurus = remaining.campaignKurus + outcomes.reduce((s, o) => s + o.rewardKurus, 0);
  return {
    plan: {
      ...remaining,
      lines,
      outcomes: [...outcomes, ...remaining.outcomes],
      totalSpendKurus: Object.values(input.spend).reduce((s, v) => s + (v ?? 0), 0),
      baseKurus,
      campaignKurus,
      totalKurus: baseKurus + campaignKurus,
    },
    issues,
    accepted,
  };
}
