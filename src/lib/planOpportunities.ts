import { formatKurus } from "./money";
import type { ExternalCampaign } from "./externalCampaigns";
import { eligibleCards, isActiveThisMonth, netCampaignReward } from "./optimizer";
import type { Campaign, CatalogCard, CategorySlug, SpendProfile } from "./types";

const normalize = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "");
const words = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const mentionsIssuer = (text: string, bank: string) => {
  const aliases =
    bank === "Türk Ekonomi Bankası"
      ? [bank, "TEB"]
      : bank === "DenizBank"
        ? [bank, "Deniz Bonus"]
        : [bank];
  return aliases.some((alias) => ` ${words(text)} `.includes(` ${words(alias)} `));
};
const categories: Record<string, CategorySlug> = {
  Market: "market",
  Akaryakıt: "akaryakit",
  "E-ticaret": "e-ticaret",
  Restoran: "restoran",
  Giyim: "giyim",
  Seyahat: "seyahat",
  Elektronik: "elektronik",
  Fatura: "fatura",
};
const issuers: Record<string, string> = {
  bonus: "Garanti BBVA",
  maximum: "Türkiye İş Bankası",
  world: "Yapı Kredi",
  axess: "Akbank",
  paraf: "Halkbank",
};
export type PlanOpportunity = {
  campaign: ExternalCampaign;
  cards: CatalogCard[];
  rule?: Campaign;
  category?: CategorySlug;
  budgetKurus: number;
  reason: string;
  status: "planned" | "scenario" | "alternative" | "review" | "no-budget";
};

export function relatedCards(c: ExternalCampaign, cards: CatalogCard[]): CatalogCard[] {
  const exclusions = (c.conditions ?? [])
    .filter((line) => /dahil değildir|dahil de[gğ]il|hariç|yararlanamaz/i.test(line))
    .join(" ");
  return cards.filter((card) => {
    const issuer = normalize(card.bank);
    // An issuer explicitly excluded by the bank must never match by the Bonus logo alone.
    if (
      issuer &&
      issuer !== normalize(issuers[c.program] ?? "") &&
      mentionsIssuer(exclusions, card.bank)
    )
      return false;
    if (/business|işletme|üretici/i.test(card.name) && /ticari kartlar|business/i.test(exclusions))
      return false;
    if (/bonus genç/i.test(c.title) && !/bonus genç/i.test(card.name)) return false;
    if (/bonus platinum/i.test(c.title) && !/bonus platinum/i.test(card.name)) return false;
    if (/bonus flexi/i.test(card.name) && normalize(exclusions).includes("bonusflexi"))
      return false;
    if (
      card.cardType === "banka" &&
      /banka kartları/i.test(
        (c.conditions ?? []).filter((l) => /dahil değildir|hariç/.test(l)).join(" "),
      )
    )
      return false;
    if (card.program === c.program || issuer === normalize(issuers[c.program] ?? "")) return true;
    const inclusion =
      (c.eligibility ?? "") +
      " " +
      (c.conditions ?? [])
        .filter((l) => /dahildir|geçerlidir/i.test(l) && !/dahil değildir|hariç/i.test(l))
        .join(" ");
    return issuer.length > 2 && mentionsIssuer(inclusion, card.bank);
  });
}

/** Every related source offer stays visible, even when it cannot safely enter the numeric total. */
export function planOpportunities(
  external: ExternalCampaign[],
  rules: Campaign[],
  cards: CatalogCard[],
  spend: SpendProfile,
  today: string,
  plannedIds: Set<string>,
): PlanOpportunity[] {
  const rulesById = new Map(
    rules.filter((c) => !c.demo && isActiveThisMonth(c, today)).map((c) => [c.id, c]),
  );
  const rulesByUrl = new Map(
    rules.filter((c) => !c.demo && isActiveThisMonth(c, today)).map((c) => [c.url, c]),
  );
  return external
    .filter((c) => !c.endsAt || c.endsAt >= today)
    .flatMap((c) => {
      const rule = rulesById.get(c.id) ?? rulesByUrl.get(c.sourceUrl);
      const matches = rule ? eligibleCards(rule, cards) : relatedCards(c, cards);
      if (!matches.length) return [];
      const category =
        rule?.category && rule.category !== "tumu" ? rule.category : categories[c.category];
      const budgetKurus = category ? (spend[category] ?? 0) : 0;
      const status: PlanOpportunity["status"] = plannedIds.has(c.id)
        ? "planned"
        : rule?.scenarioOnly
          ? "scenario"
          : !budgetKurus
            ? "no-budget"
            : rule
              ? "alternative"
              : "review";
      const reason =
        status === "planned"
          ? "Kazanç plan toplamına dahil."
          : status === "scenario"
            ? "Mağaza/işlem koşulunu teyit edip bu kampanyaya bütçe ayırabilirsin."
            : status === "no-budget"
              ? "Bu sektör için kayıtlı bütçe yok veya kampanya sektörü aylık profille eşleşmiyor."
              : status === "alternative"
                ? rule &&
                  Math.max(...matches.map((card) => netCampaignReward(rule, budgetKurus, card))) > 0
                  ? `Sektör bütçesinin tamamı ayrılan bağımsız senaryoda ${formatKurus(Math.max(...matches.map((card) => netCampaignReward(rule, budgetKurus, card))))} net kazanç mümkün. Otomatik dağılımda başka kampanya seçildi; bu tutar ayrıca toplanmaz.`
                  : "Bu sektör bütçesi işlem adedi/tutarı eşiğini karşılamıyor veya katılım ücreti sonrası pozitif kazanç kalmıyor. Kampanya koşullarını aşağıdan inceleyebilirsin."
                : "Kartınla ilişkili fırsat. Mağaza, ödeme yöntemi, hedef müşteri veya hesaplama koşulu teyit edilmeden toplam kazanca eklenmez.";
      return [{ campaign: c, cards: matches, rule, category, budgetKurus, status, reason }];
    })
    .sort((a, b) => {
      const priority = { scenario: 0, review: 1, alternative: 2, planned: 3, "no-budget": 4 };
      return (
        priority[a.status] - priority[b.status] ||
        b.budgetKurus - a.budgetKurus ||
        a.campaign.title.localeCompare(b.campaign.title, "tr")
      );
    });
}
