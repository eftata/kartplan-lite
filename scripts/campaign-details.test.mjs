import { describe, expect, it } from "vitest";
import { campaignFacts, endDate, extractDetails } from "./campaign-details.mjs";

const campaign = {
  program: "bonus",
  sourceUrl: "https://www.bonus.com.tr/kampanyalar/test",
  endsAt: "",
};
describe("official campaign detail extraction", () => {
  it("does not mistake a participation fee or invoice collection count for a spending threshold", () => {
    const facts = campaignFacts([
      "Kampanyaya katılmak için ilk harcamadan önce 100 TL ücret ödenir ve en az 3 fatura tahsilatı gerekir.",
      "Market alışverişlerinde 2.000 TL ve üzeri her harcamaya 100 TL bonus verilir.",
      "Kampanyaya World Mobil üzerinden katılım sağlanması gerekmektedir.",
    ]);
    expect(facts.spendCondition).toContain("2.000 TL ve üzeri");
    expect(facts.participation).toContain("World Mobil");
  });
  it("uses campaign dates rather than the later reward expiry", () => {
    const html = `<h1>Market alışverişine bonus fırsatı</h1><div class="campaign-detail__info"><p>Market alışverişlerinde 500 TL bonus kazanabilirsiniz.</p></div><div class="campaign-detail__info--right"><h2>KATILMAK İÇİN</h2>Kampanyaya katılmak için BonusFlaş üzerinden katılım gerekmektedir.<br>Harcama öncesi katılın.<h2 class="campaign-date-title">KAMPANYA BAŞLANGIÇ VE BİTİŞ</h2><p>1 - 31 Ekim 2026</p><h2 class="campaign-date-title">BONUS GEÇERLİLİK TARİHİ</h2><p>1 - 30 Kasım 2026</p></div>`;
    const result = extractDetails(html, campaign);
    expect(result.endsAt).toBe("2026-10-31");
    expect(result.participation).toContain("BonusFlaş");
    expect(result.summary).toContain("500 TL bonus");
  });
  it("does not ingest navigation, scripts or unrelated offers", () => {
    const html = `<nav><p>Başka kampanyaya 9.000 TL ödül kazanabilirsiniz.</p></nav><div class="campaingDetailText"><script>privateData()</script><p>Tek seferde 2.000 TL ve üzeri market alışverişinize 200 TL chip-para kazanın.</p><ul><li>Kampanyaya Akbank Mobil üzerinden katılım gerekmektedir.</li></ul></div>`;
    const result = extractDetails(html, { ...campaign, program: "axess" });
    expect(result.conditions).toHaveLength(2);
    expect(result.summary).toContain("200 TL");
    expect(JSON.stringify(result)).not.toContain("privateData");
    expect(JSON.stringify(result)).not.toContain("9.000");
  });
  it("parses Turkish and numeric ranges while leaving ambiguous dates unknown", () => {
    expect(endDate("5 Ekim – 30 Kasım 2026 tarihleri arasında")).toBe("2026-11-30");
    expect(endDate("01.10.2026 - 31.10.2026")).toBe("2026-10-31");
    expect(endDate("Bonuslar 5 Kasım 2026 tarihinde yüklenecek")).toBe("");
  });
});

describe("campaign sector classification", () => {
  it("separates food markets from home improvement, clothing and car rental", async () => {
    const { campaignCategory } = await import("./campaign-category.mjs");
    expect(campaignCategory("Yapı market ve ısıtma-soğutmada 1.500 TL bonus!")).toBe("Ev & Yaşam");
    expect(
      campaignCategory("Giyim, ayakkabı ve çanta alışverişlerinize toplam 1.500 TL bonus!"),
    ).toBe("Giyim");
    expect(
      campaignCategory("Enterprise'da Hyundai Bayon benzinli otomatik 1.890 TL'den kiralama!"),
    ).toBe("Seyahat");
    expect(campaignCategory("Bonus Genç'le market alışverişlerine 400 TL bonus!")).toBe("Market");
  });
});

describe("Maximum rich text details", () => {
  it("reads div paragraphs when the source uses empty p elements", () => {
    const result = extractDetails(
      `<h1>Shell istasyonlarında MaxiPuan</h1><div class="campaign-detail-desc"><p>​</p><div>Farklı günlerde 1.500 TL ve üzeri dördüncü akaryakıt alışverişine 450 TL MaxiPuan verilecektir.</div><div>İşCep kampanyalar bölümünden KATIL butonuna tıklayarak katılım sağlanması gerekmektedir.</div></div>`,
      { ...campaign, program: "maximum" },
    );
    expect(result.conditions).toHaveLength(2);
    expect(result.summary).toContain("450 TL");
    expect(result.participation).toContain("İşCep");
  });
});
