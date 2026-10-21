import { load } from "cheerio";

const selectors = {
  bonus: ".campaign-detail__info",
  maximum: ".campaign-detail-desc",
  world: ".campaign-terms, .sub-content > p",
  axess: ".campaingDetailText",
  paraf: ".container--sub-page-content",
};
const clean = (value) =>
  String(value ?? "")
    .replace(/[\u200b-\u200f\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const months = [
  "ocak",
  "şubat",
  "mart",
  "nisan",
  "mayıs",
  "haziran",
  "temmuz",
  "ağustos",
  "eylül",
  "ekim",
  "kasım",
  "aralık",
];
export function endDate(text) {
  const numeric = text.match(/\d{1,2}\.\d{1,2}\.\d{4}\s*[-–]\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`;
  const range = text
    .toLocaleLowerCase("tr")
    .match(
      /\d{1,2}\s*(?:[a-zçğıöşü]+\s+)?(?:\d{4}\s*)?[-–]\s*(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)\s+(\d{4})/,
    );
  return range
    ? `${range[3]}-${String(months.indexOf(range[2]) + 1).padStart(2, "0")}-${range[1].padStart(2, "0")}`
    : "";
}
export function campaignFacts(lines = []) {
  const sentences = lines.flatMap((line) => line.split(/(?<=[.!?])\s*(?=[A-ZÇĞİÖŞÜ])/));
  const candidates = sentences.filter(
    (line) =>
      /katıl|kayıt|katılım/i.test(line) &&
      /gere[kğ]|zorunlu|katılın|tıklay|yazıp|HEMEN KATIL/i.test(line) &&
      !/ücret|1,99|kişisel/i.test(line),
  );
  const participation =
    candidates.find((line) =>
      /BonusFlaş|İşCep|World Mobil|Yapı Kredi Mobil|Paraf Mobil|Halkbank Mobil|SMS|Akbank Mobil|Juzdan/i.test(
        line,
      ),
    ) ||
    candidates[0] ||
    "";
  const spendCondition =
    sentences.find(
      (line) =>
        /\d[\d.,]*\s*(?:TL|₺)\s*(?:ve üzeri|ve üstü|üzeri|üstü|(?:[-–]|ve)\s*\d[\d.,]*\s*(?:TL|₺)\s*arası)/i.test(
          line,
        ) &&
        /harcama|alışveriş|rezervasyon|ödeme/i.test(line) &&
        !/^Kampanyaya katılmak için/i.test(line),
    ) || "";
  return { participation, spendCondition };
}
export function extractDetails(html, campaign) {
  const $ = load(html);
  const content = $(selectors[campaign.program]);
  content.find("script,style,nav").remove();
  content.find("br").replaceWith("\n");
  let lines = [
    ...new Set(
      content
        .find("p,li,div")
        .filter((_, el) => !$(el).find("p,li,div").length)
        .map((_, el) => clean($(el).text()))
        .get(),
    ),
  ].filter(
    (line) =>
      line.length >= 40 &&
      line.length <= 1300 &&
      !/çerez|cookie|kişisel veriler|tüm hakları/i.test(line),
  );
  if (!lines.length) {
    lines = [
      ...new Set(
        content
          .text()
          .split(/\n+/)
          .map(clean)
          .flatMap((line) =>
            line.length > 1300 ? line.split(/(?<=[.!?])\s+/).map(clean) : [line],
          ),
      ),
    ].filter(
      (line) =>
        line.length >= 20 &&
        line.length <= 1300 &&
        !/çerez|cookie|kişisel veriler|tüm hakları/i.test(line),
    );
  }
  if (campaign.program === "bonus") {
    const right = $(".campaign-detail__info--right").clone();
    right.find(".campaign-detail__online-shopping").remove();
    const joinText = clean(right.text())
      .split("KAMPANYA BAŞLANGIÇ")[0]
      .replace(/^KATILMAK İÇİN/, "");
    if (joinText.length > 40) lines.unshift(joinText);
  }
  if (!lines.length) return {};
  const { participation, spendCondition: spending } = campaignFacts(lines);
  const sentences = lines.flatMap((line) => line.split(/(?<=[.!?])\s*(?=[A-ZÇĞİÖŞÜ])/));
  const eligibility =
    sentences.find(
      (line) =>
        /(?:kartlar|kartı|kartınız)/i.test(line) &&
        /(?:dahil|dâhil|faydalan|yararlan|geçerli)/i.test(line) &&
        !/borç|kanuni|gecikme/i.test(line),
    ) || "";
  const lead = campaign.program === "world" ? clean($(".sub-content > h2").first().text()) : "";
  const summary =
    lead ||
    lines.find(
      (line) =>
        /bonus|puan|parafpara|chip|indirim|taksit|hediye|bilet|çekiliş/i.test(line) &&
        !/dahil değildir|saklı tutar|iptal|geri alın|sms.*ücret|katılmak için|ilk harcamadan|kampanyaya katıl|katılım için/i.test(
          line,
        ),
    ) ||
    lines[0];
  const dateText =
    campaign.program === "bonus"
      ? $(".campaign-date-title").first().next().text()
      : campaign.program === "maximum"
        ? $(".campaign-detail .date").text()
        : content.text().slice(0, 1500);
  let image = $("meta[property='og:image']").attr("content") || "";
  if (campaign.program === "world")
    image = $(".sub-content img,.sub-page-content img").first().attr("src") || "";
  if (campaign.program === "bonus")
    image =
      $("img")
        .map((_, el) => $(el).attr("src"))
        .get()
        .find((src) => src.includes("/imported/") && /\.(jpg|png|webp)/i.test(src)) || "";
  try {
    image = new URL(image, campaign.sourceUrl).href;
  } catch {
    image = "";
  }
  if (!/\.(jpg|jpeg|png|webp)(?:\?|$)/i.test(image)) image = "";
  const title = clean(
    $(campaign.program === "axess" ? ".campaingDetailText h2,.campaingDetailText h3" : "h1")
      .first()
      .text(),
  );
  return {
    ...(title.length >= 15 && title.length <= 280 ? { title } : {}),
    summary: clean(summary),
    conditions: lines.slice(0, 18),
    participation,
    spendCondition: spending,
    eligibility,
    imageUrl: image,
    endsAt: campaign.endsAt || endDate(clean(dateText)),
    checkedAt: new Date().toISOString(),
    detailsVersion: 3,
  };
}

export async function enrichCampaigns(campaigns, previous = []) {
  const old = new Map(previous.map((c) => [c.id, c]));
  let next = 0,
    enriched = 0,
    failed = 0;
  const result = new Array(campaigns.length);
  async function worker() {
    while (next < campaigns.length) {
      const index = next++;
      const campaign = campaigns[index],
        cached = old.get(campaign.id);
      if (
        !process.argv.includes("--refresh-details") &&
        cached?.detailsVersion === 3 &&
        !(campaign.program === "maximum" && (cached.conditions?.length ?? 0) < 4) &&
        cached?.checkedAt &&
        Date.now() - Date.parse(cached.checkedAt) < 20 * 3600000
      ) {
        result[index] = {
          ...cached,
          ...campaign,
          title: cached.title,
          summary: cached.summary,
          endsAt: campaign.endsAt || cached.endsAt,
        };
        enriched++;
        continue;
      }
      try {
        const response = await fetch(campaign.sourceUrl, {
          headers: { "User-Agent": "KartPlan/1.0 (+https://kartindirim.web.app)" },
          signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) throw new Error(String(response.status));
        const details = extractDetails(await response.text(), campaign);
        if (!details.checkedAt) throw new Error("No campaign details");
        result[index] = { ...campaign, ...details };
        enriched++;
      } catch {
        result[index] = cached?.conditions?.length
          ? {
              ...cached,
              ...campaign,
              summary: cached.summary,
              endsAt: campaign.endsAt || cached.endsAt,
            }
          : campaign;
        failed++;
      }
      if ((enriched + failed) % 100 === 0)
        console.log(`Campaign details ${enriched + failed}/${campaigns.length}`);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  console.log(`Campaign details: ${enriched} available, ${failed} not refreshed`);
  return result;
}
