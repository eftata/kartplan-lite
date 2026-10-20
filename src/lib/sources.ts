/** Bankaların kendi kampanya listeleri. Ayrıntılar ve uygunluk kaynakta kontrol edilir. */
export const CAMPAIGN_SOURCES = [
  {
    program: "bonus",
    name: "Bonus",
    bank: "Garanti BBVA",
    url: "https://www.bonus.com.tr/kampanyalar",
  },
  {
    program: "maximum",
    name: "Maximum",
    bank: "Türkiye İş Bankası",
    url: "https://www.maximum.com.tr/kampanyalar",
  },
  {
    program: "world",
    name: "World",
    bank: "Yapı Kredi",
    url: "https://www.worldcard.com.tr/kampanyalar",
  },
  {
    program: "axess",
    name: "Axess",
    bank: "Akbank",
    url: "https://www.axess.com.tr/axess/kampanyalar",
  },
  {
    program: "paraf",
    name: "Paraf",
    bank: "Halkbank",
    url: "https://www.paraf.com.tr/content/parafcard/tr/kampanyalar.html",
  },
] as const;
