import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { load } from "cheerio";

const sources = {
  bonus: "https://www.bonus.com.tr/kampanyalar",
  maximum: "https://www.maximum.com.tr/kampanyalar",
  world: "https://www.worldcard.com.tr/kampanyalar",
  axess: "https://www.axess.com.tr/axess/kampanyalar",
  paraf: "https://www.paraf.com.tr/tr/kampanyalar.html",
};
const today = new Date().toISOString().slice(0, 10);
const clean = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
const idFor = (url) => createHash("sha1").update(url).digest("hex").slice(0, 16);

async function get(url, json = false) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "KartPlan/1.0 (+https://kartindirim.web.app)",
      Accept: json ? "application/json" : "text/html",
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return json ? response.json() : response.text();
}

function category(text) {
  const s = text.toLocaleLowerCase("tr");
  for (const [name, pattern] of [
    ["Market", /market|gıda|migros|carrefour|a101|şok|bakkal/],
    ["Akaryakıt", /akaryakıt|benzin|motorin|otogaz|petrol|shell|opet/],
    ["E-ticaret", /e-ticaret|internet alışveriş|online alışveriş|trendyol|hepsiburada|amazon|n11/],
    ["Restoran", /restoran|yemek|kahve|kafe|coffy/],
    ["Giyim", /giyim|ayakkabı|çanta|moda|tekstil|kozmetik/],
    ["Seyahat", /seyahat|otel|uçak|tatil|araç kiralama|turizm/],
    ["Elektronik", /elektronik|telefon|bilgisayar|teknoloji|beyaz eşya/],
    ["Eğitim", /eğitim|okul|kırtasiye|üniversite/],
    ["Fatura", /fatura|otomatik ödeme|vergi|mtv|harç/],
    ["Sağlık", /sağlık|hastane|eczane|sigorta/],
    ["Ev & Yaşam", /mobilya|ev dekorasyon|yapı market/],
    ["Eğlence", /sinema|oyun|konser|kültür|eğlence/],
  ])
    if (pattern.test(s)) return name;
  return "Diğer";
}

function item(program, url, title, extra = {}) {
  if (!url || !title) return null;
  const safe = new URL(url, sources[program]);
  if (safe.protocol !== "https:" || safe.hostname !== new URL(sources[program]).hostname)
    return null;
  if (!safe.pathname.includes("/kampanyalar/")) return null;
  const text = clean(title);
  if (text.length < 12 || text.length > 280) return null;
  const benefit = clean(
    extra.benefit || text.match(/(?:%\s?\d+|\d[\d.,]*\s?(?:TL|₺|taksit))/i)?.[0] || "",
  );
  return {
    id: idFor(safe.href),
    program,
    title: text,
    category: extra.category || category(`${text} ${safe.pathname}`),
    summary: clean(extra.summary || ""),
    benefit,
    endsAt: extra.endsAt || "",
    sourceUrl: safe.href,
  };
}

async function bonus() {
  const $ = load(await get(sources.bonus));
  return $("li.campaign-box")
    .map((_, el) => {
      const box = $(el);
      return item(
        "bonus",
        box.find("a.direct").attr("href"),
        box.find("h2.campaign-box__title").text(),
        {
          category: category(`${box.attr("data-sector")} ${box.find("h2").text()}`),
        },
      );
    })
    .get();
}

async function maximum() {
  const $ = load(await get(sources.maximum));
  return $(".camp_cardsAll [campid]")
    .map((_, el) => {
      const card = $(el);
      const anchor = card.find('a[href^="/kampanyalar/"]').first();
      const title = card.find("img[alt]").first().attr("alt") || card.find("h3").first().text();
      return item("maximum", anchor.attr("href"), title);
    })
    .get();
}

async function world() {
  const url =
    "https://www.worldcard.com.tr/api/campaigns?campaignSectorKey=tum-kampanyalar&campaignSectorId=6d897e71-1849-43a3-a64f-62840e8c0442";
  const result = [];
  for (let page = 1; page <= 100; page++) {
    const response = await fetch(url, {
      headers: { Page: String(page), "User-Agent": "KartPlan/1.0 (+https://kartindirim.web.app)" },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`World ${response.status}`);
    const data = await response.json();
    for (const offer of data.Items ?? []) {
      const slug = new URL(offer.Url || sources.world).pathname.split("/").pop() || "";
      const titleWords = clean(offer.PageTitle || offer.Title)
        .toLocaleLowerCase("tr")
        .replace(/ı/g, "i")
        .replace(/ş/g, "s")
        .replace(/ğ/g, "g")
        .replace(/ç/g, "c")
        .replace(/ö/g, "o")
        .replace(/ü/g, "u")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .split(" ")
        .filter(
          (word) =>
            word.length >= 5 &&
            ![
              "worldpuan",
              "worldun",
              "kampanya",
              "alisveris",
              "firsati",
              "ozel",
              "taksit",
              "kartin",
              "kredi",
              "hediye",
              "varan",
            ].includes(word),
        );
      // Kaynak API nadiren başlığı başka bir kampanyanın URL'siyle eşleştiriyor.
      if (titleWords.length && !titleWords.some((word) => slug.includes(word.slice(0, 5))))
        continue;
      const entry = item("world", offer.Url, offer.PageTitle || offer.Title, {
        summary: offer.SpotTitle && offer.SpotTitle !== offer.PageTitle ? offer.SpotTitle : "",
        endsAt: String(offer.EndDate ?? "").slice(0, 10),
      });
      if (entry) result.push(entry);
    }
    if (!data.Items?.length || result.length >= (data.TotalItems ?? Infinity)) break;
  }
  return result;
}

async function axess() {
  // Axess /ajax/ yolunu robots.txt ile kapatıyor. Yalnızca herkese açık sayfadaki kampanyalar alınır.
  const $ = load(await get(sources.axess));
  return $('.boutique a[href^="/axess/kampanyalar/"]')
    .map((_, el) => {
      const anchor = $(el);
      const path = anchor.attr("href") || "";
      if (path.split("/").length !== 4) return null;
      const imgTitle = anchor.find("img").attr("alt");
      const title = imgTitle || path.split("/").pop()?.replace(/-/g, " ");
      return item("axess", path, title);
    })
    .get();
}

async function paraf() {
  const url =
    "https://www.paraf.com.tr/content/parafcard/tr/kampanyalar/_jcr_content/root/responsivegrid/filter.filtercampaigns.all.json";
  const data = await get(url, true);
  return data
    .map((offer) =>
      item("paraf", offer.url, offer.title, {
        summary: offer.teaserDescription || offer.description || "",
        category: category(`${offer.url} ${offer.title}`),
      }),
    )
    .filter(Boolean);
}

const all = [];
const counts = {};
for (const [program, collect] of Object.entries({ bonus, maximum, world, axess, paraf })) {
  try {
    const found = collect ? await collect() : [];
    const unique = [...new Map(found.map((entry) => [entry.sourceUrl, entry])).values()];
    if (unique.length < 3) throw new Error(`only ${unique.length} offers`);
    all.push(...unique);
    counts[program] = unique.length;
  } catch (error) {
    throw new Error(`${program} sync failed: ${error.message}`);
  }
}
const feed = { updatedAt: today, counts, campaigns: all };
await writeFile(
  new URL("../public/campaign-feed.json", import.meta.url),
  `${JSON.stringify(feed, null, 2)}\n`,
);
console.log(`Synced ${all.length} campaigns: ${JSON.stringify(counts)}`);
