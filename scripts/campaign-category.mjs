/** Classify the offer itself, not navigation text, historical URLs or unrelated page content. */
export function campaignCategory(title) {
  const s = String(title).toLocaleLowerCase("tr");
  for (const [name, pattern] of [
    [
      "Ev & Yaşam",
      /yapı market|ısıtma|soğutma|mobilya|dekorasyon|ev alet|ev tekstil|beyaz eşya|ikea|koçtaş|yatak/,
    ],
    ["Otomotiv", /otomotiv|lastik|yedek parça|araç bakım|oto bakım|ekspertiz|yetkili servis/],
    [
      "Seyahat",
      /kiralama|kiralamada|rent a car|otel|tatil|uçak|turizm|seyahat|bilet.*otobüs|havalimanı|duty free/,
    ],
    ["Restoran", /restoran|yemek|kahve|kafe|coffy|starbucks|fast food|dürüm|pasta/],
    ["Giyim", /giyim|ayakkabı|çanta|tekstil|kozmetik|penti|defacto|lacoste|beymen|moda/],
    [
      "E-ticaret",
      /e-ticaret|internet alışveriş|online alışveriş|trendyol|hepsiburada|amazon|n11|pazarama/,
    ],
    ["Akaryakıt", /akaryakıt|motorin|otogaz|petrol ofisi|shell|opet/],
    ["Market", /market|gıda|migros|carrefour|a101|bakkal|şarküteri/],
    ["Elektronik", /elektronik|telefon|bilgisayar|teknoloji|mediamarkt|teknosa/],
    ["Eğitim", /eğitim|okul|kırtasiye|üniversite|english/],
    ["Fatura", /fatura|otomatik ödeme|vergi|mtv|harç|icloud|abonelik/],
    ["Sağlık", /sağlık|hastane|eczane|sigorta|veteriner|petshop/],
    ["Eğlence", /sinema|oyun|konser|kültür|eğlence|müze|etkinlik/],
    ["Ulaşım", /ulaşım|otopark|taksi|hgs|havaş/],
    ["Spor", /spor|fitness/],
  ])
    if (pattern.test(s)) return name;
  return "Diğer";
}
