// Aylık plan: kullanıcının kartları × harcama profili × kampanyalar → "hangi harcama hangi kartla".
// Açgözlü ve durumsuz: önce kampanya eşiklerini net kazanç/TL sırasıyla doldurur, kalan harcamayı
// temel oranı en yüksek karta verir. Tüm tutarlar kuruş cinsinden tamsayı.

import { monthBounds } from "./dates";
import { applyBps } from "./money";
import type { Campaign, CatalogCard, CategorySlug, SpendProfile } from "./types";

export type PlanInput = {
  cards: CatalogCard[];
  spend: SpendProfile;
  campaigns: Campaign[];
  joined: Record<string, boolean>;
  today: string;
};

export type PlanLine = { category: CategorySlug; cardId: string; amountKurus: number };

export type CampaignOutcome = {
  campaign: Campaign;
  cardId: string;
  spentKurus: number;
  rewardKurus: number;
  joined: boolean;
  feeKurus: number;
  grossRewardKurus: number;
};

export type NearMiss = {
  campaign: Campaign;
  cardId: string;
  missingKurus: number;
  rewardKurus: number;
};

export type Plan = {
  lines: PlanLine[];
  outcomes: CampaignOutcome[];
  nearMisses: NearMiss[];
  totalSpendKurus: number;
  baseKurus: number;
  campaignKurus: number;
  totalKurus: number;
};

export function eligibleCards(c: Campaign, cards: CatalogCard[]): CatalogCard[] {
  return cards.filter(
    (k) => k.program === c.program && (c.cardIds.length === 0 || c.cardIds.includes(k.id)),
  );
}

export function matchesCategory(c: Campaign, cat: CategorySlug): boolean {
  return c.category === "tumu" || c.category === cat;
}

/** Kampanyanın bu ay planı etkileyip etkilemediği: yayında, bitmemiş, bu ay içinde başlıyor. */
export function isActiveThisMonth(c: Campaign, today: string): boolean {
  const { end } = monthBounds(today);
  return c.status === "yayinda" && c.endsAt >= today && c.startsAt <= end;
}

/** Kampanyanın bu harcamaya verdiği ödül (kuruş). */
export function campaignReward(c: Campaign, spentKurus: number): number {
  if (spentKurus <= 0 || spentKurus < c.minSpendKurus) return 0;
  if (c.repeatReward) {
    const count = Math.max(0, Math.floor(spentKurus / c.minSpendKurus) - (c.skipTransactions ?? 0));
    return Math.min(count * c.rewardKurus, c.capKurus);
  }
  if (c.rewardKind === "sabit") return c.rewardKurus;
  const r = applyBps(spentKurus, c.rateBps);
  return c.capKurus > 0 ? Math.min(r, c.capKurus) : r;
}

export function campaignFee(c: Campaign, card: CatalogCard): number {
  return card.name === "Bonus Genç" ? (c.participationFeeKurus ?? 0) : 0;
}

export function netCampaignReward(c: Campaign, spentKurus: number, card: CatalogCard): number {
  return Math.max(0, campaignReward(c, spentKurus) - campaignFee(c, card));
}

export function baseRate(card: CatalogCard): number {
  return card.verified ? card.baseRateBps : 0;
}

/** Ödülün tamamını almak için gereken harcama (oran + limitsiz → sonsuz). */
function targetSpend(c: Campaign): number {
  if (c.repeatReward)
    return (Math.ceil(c.capKurus / c.rewardKurus) + (c.skipTransactions ?? 0)) * c.minSpendKurus;
  if (c.rewardKind === "sabit") return Math.max(c.minSpendKurus, 1);
  if (c.capKurus <= 0 || c.rateBps <= 0) return Number.POSITIVE_INFINITY;
  return Math.max(c.minSpendKurus, Math.ceil((c.capKurus * 10000) / c.rateBps));
}

function optimizeGreedy(input: PlanInput): Plan {
  const { cards, spend, joined, today } = input;
  const cats = (Object.keys(spend) as CategorySlug[]).filter((k) => (spend[k] ?? 0) > 0);
  const totalSpendKurus = cats.reduce((s, k) => s + (spend[k] ?? 0), 0);
  const empty: Plan = {
    lines: [],
    outcomes: [],
    nearMisses: [],
    totalSpendKurus,
    baseKurus: 0,
    campaignKurus: 0,
    totalKurus: 0,
  };
  if (cards.length === 0 || cats.length === 0) return empty;

  const rate = new Map(cards.map((k) => [k.id, baseRate(k)]));
  const bestBase = Math.max(...cards.map(baseRate));
  const alloc = new Map<CategorySlug, Map<string, number>>(cats.map((k) => [k, new Map()]));
  const allocated = (cat: CategorySlug, cardId: string) => alloc.get(cat)?.get(cardId) ?? 0;
  const available = (cat: CategorySlug) => {
    let used = 0;
    for (const v of alloc.get(cat)?.values() ?? []) used += v;
    return (spend[cat] ?? 0) - used;
  };
  const add = (cat: CategorySlug, cardId: string, amount: number) => {
    const m = alloc.get(cat);
    if (m && amount > 0) m.set(cardId, (m.get(cardId) ?? 0) + amount);
  };

  const campaigns = input.campaigns
    .filter((c) => isActiveThisMonth(c, today))
    .sort((a, b) => a.id.localeCompare(b.id));

  // Her kampanya için uygun kartlardan temel oranı en yüksek olanı.
  let options = campaigns.flatMap((c) => {
    const card = eligibleCards(c, cards).sort(
      (a, b) => baseRate(b) - baseRate(a) || campaignFee(c, a) - campaignFee(c, b),
    )[0];
    return card ? [{ c, cardId: card.id, card }] : [];
  });

  for (;;) {
    let best: { i: number; extra: number; gain: number; score: number } | null = null;
    for (const [i, { c, cardId, card }] of options.entries()) {
      const matching = cats.filter((k) => matchesCategory(c, k));
      const spentNow = matching.reduce((s, k) => s + allocated(k, cardId), 0);
      const pool = matching.reduce((s, k) => s + available(k), 0);
      let extra = Math.min(Math.max(0, targetSpend(c) - spentNow), pool);
      if (c.repeatReward)
        extra = Math.max(
          0,
          Math.floor((spentNow + extra) / c.minSpendKurus) * c.minSpendKurus - spentNow,
        );
      const after = spentNow + extra;
      const loss = applyBps(extra, bestBase - (rate.get(cardId) ?? 0));
      const gain = netCampaignReward(c, after, card) - netCampaignReward(c, spentNow, card) - loss;
      if (gain <= 0) continue;
      const score = extra === 0 ? Number.POSITIVE_INFINITY : gain / extra;
      if (!best || score > best.score) best = { i, extra, gain, score };
    }
    if (!best) break;
    const { i, extra } = best;
    const opt = options[i];
    if (!opt) break;
    let left = extra;
    const matching = cats
      .filter((k) => matchesCategory(opt.c, k))
      .sort((a, b) => available(b) - available(a));
    for (const k of matching) {
      const take = Math.min(left, available(k));
      add(k, opt.cardId, take);
      left -= take;
      if (left <= 0) break;
    }
    options = options.filter(
      (o, j) =>
        j !== i && (!opt.c.calculationGroup || o.c.calculationGroup !== opt.c.calculationGroup),
    );
  }

  // Kalan harcama: temel oranı en yüksek kart; eşitlikte o kategoride zaten kullanılan kart.
  for (const cat of cats) {
    const rest = available(cat);
    if (rest <= 0) continue;
    const pick = [...cards].sort(
      (a, b) => baseRate(b) - baseRate(a) || allocated(cat, b.id) - allocated(cat, a.id),
    )[0];
    if (pick) add(cat, pick.id, rest);
  }

  const lines: PlanLine[] = [];
  let baseKurus = 0;
  for (const cat of cats) {
    for (const [cardId, amountKurus] of alloc.get(cat) ?? []) {
      if (amountKurus <= 0) continue;
      lines.push({ category: cat, cardId, amountKurus });
      baseKurus += applyBps(amountKurus, rate.get(cardId) ?? 0);
    }
  }

  const outcomes: CampaignOutcome[] = [];
  const nearMisses: NearMiss[] = [];
  for (const c of campaigns) {
    const matching = cats.filter((k) => matchesCategory(c, k));
    let top: CampaignOutcome | null = null;
    for (const card of eligibleCards(c, cards)) {
      const spent = matching.reduce((s, k) => s + allocated(k, card.id), 0);
      const reward = netCampaignReward(c, spent, card);
      if (reward > 0 && (!top || reward > top.rewardKurus)) {
        top = {
          campaign: c,
          cardId: card.id,
          spentKurus: spent,
          rewardKurus: reward,
          joined: !!joined[c.id],
          feeKurus: campaignFee(c, card),
          grossRewardKurus: campaignReward(c, spent),
        };
      }
    }
    if (top) {
      outcomes.push(top);
      continue;
    }
    const card = eligibleCards(c, cards)[0];
    const potential = matching.reduce((s, k) => s + (spend[k] ?? 0), 0);
    const threshold =
      c.repeatReward && card
        ? ((c.skipTransactions ?? 0) + Math.floor(campaignFee(c, card) / c.rewardKurus) + 1) *
          c.minSpendKurus
        : c.minSpendKurus;
    if (card && threshold > potential && potential * 2 >= threshold) {
      const reward = netCampaignReward(c, threshold, card);
      if (reward > 0) {
        nearMisses.push({
          campaign: c,
          cardId: card.id,
          missingKurus: threshold - potential,
          rewardKurus: reward,
        });
      }
    }
  }

  // Rules sharing a group have unverified stacking; count only the best net result once.
  const grouped = new Map<string, CampaignOutcome>();
  for (const outcome of outcomes) {
    const key = outcome.campaign.calculationGroup || outcome.campaign.id;
    if (!grouped.has(key) || grouped.get(key)!.rewardKurus < outcome.rewardKurus)
      grouped.set(key, outcome);
  }
  const selectedOutcomes = [...grouped.values()];
  const campaignKurus = selectedOutcomes.reduce((s, o) => s + o.rewardKurus, 0);
  lines.sort(
    (a, b) => cats.indexOf(a.category) - cats.indexOf(b.category) || b.amountKurus - a.amountKurus,
  );
  return {
    lines,
    outcomes: selectedOutcomes,
    nearMisses,
    totalSpendKurus,
    baseKurus,
    campaignKurus,
    totalKurus: baseKurus + campaignKurus,
  };
}

/** Keep the best single-card allocation as a lower bound for the greedy multi-card plan. */
export function optimize(input: PlanInput): Plan {
  let best = optimizeGreedy(input);
  if (input.cards.length > 1)
    for (const card of input.cards) {
      const single = optimizeGreedy({ ...input, cards: [card] });
      if (single.totalKurus > best.totalKurus) best = single;
    }
  return best;
}

/** "Her şeyi tek kartla ödeseydin": en iyi tek kartın kazancı. */
export function bestSingleCard(input: PlanInput): { cardId: string; totalKurus: number } | null {
  let best: { cardId: string; totalKurus: number } | null = null;
  for (const card of input.cards) {
    const total = optimize({ ...input, cards: [card] }).totalKurus;
    if (!best || total > best.totalKurus) best = { cardId: card.id, totalKurus: total };
  }
  return best;
}

/** Kampanya listesinde gösterilen kaba tahmin: profildeki ilgili harcamanın tamamıyla. */
export function estimateForProfile(c: Campaign, spend: SpendProfile): number {
  const pool = (Object.keys(spend) as CategorySlug[])
    .filter((k) => matchesCategory(c, k))
    .reduce((s, k) => s + (spend[k] ?? 0), 0);
  return campaignReward(c, pool);
}
