/** Resmi banka sayfalarından doğrulanan kampanya özetleri. Süresi dolanlar arayüzde gizlenir. */
export type ExternalCampaign = {
  id: string;
  program: string;
  category: string;
  title: string;
  summary: string;
  benefit: string;
  endsAt: string;
  sourceUrl: string;
};

export const EXTERNAL_CAMPAIGNS: ExternalCampaign[] = [
  {
    id: "bonus-market-ekim-2026",
    program: "bonus",
    category: "Market",
    benefit: "1.100 TL'ye varan bonus",
    title: "Market alışverişlerine bonus",
    summary:
      "Market alışverişlerinde 1.000 TL, BonusFlaş ile ödemelerde 1.100 TL'ye varan bonus fırsatı.",
    endsAt: "2026-10-31",
    sourceUrl: "https://www.bonus.com.tr/kampanyalar/bonus-alisveris-market-kampanya",
  },
  {
    id: "bonus-giyim-ekim-2026",
    program: "bonus",
    category: "Giyim",
    benefit: "1.500 TL'ye varan bonus",
    title: "Giyim, ayakkabı ve çanta alışverişleri",
    summary:
      "Giyim, ayakkabı ve çanta harcamalarında toplam 1.500 TL'ye varan bonus. Katılım gerekiyor.",
    endsAt: "2026-10-31",
    sourceUrl: "https://www.bonus.com.tr/kampanyalar/bonus-giyim-canta-kampanyasi",
  },
  {
    id: "maximum-market-ekim-2026",
    program: "maximum",
    category: "Market",
    benefit: "750 TL MaxiPuan",
    title: "Birikimli market alışverişleri",
    summary:
      "Anlaşmalı marketlerde tek seferde 1.500 TL altındaki işlemlerle toplam 15.000 TL harcamaya 750 TL MaxiPuan. Kampanyaya katılım gerekiyor.",
    endsAt: "2026-10-31",
    sourceUrl:
      "https://www.maximum.com.tr/kampanyalar/maximumdan-birikimli-market-alisverislerinize-maxipuan-kampanyasi",
  },
  {
    id: "maximum-egitim-ekim-2026",
    program: "maximum",
    category: "Eğitim",
    benefit: "İlave 3 taksit",
    title: "Eğitim ödemelerinde ilave taksit",
    summary: "Seçili Maximum anlaşmalı eğitim kurumlarında 2–9 taksitli işlemlere ilave 3 taksit.",
    endsAt: "2026-10-31",
    sourceUrl: "https://www.maximum.com.tr/kampanyalar/egitim-odemelerinize-ilave-taksit-firsati",
  },
  {
    id: "world-market-ekim-2026",
    program: "world",
    category: "Market",
    benefit: "1.500 TL'ye varan Worldpuan",
    title: "Gıda marketi alışverişleri",
    summary:
      "2.000 TL ve üzeri tekrarlanan alışverişlerde Worldpuan; World Pay ödemelerinde ek puan fırsatı.",
    endsAt: "2026-10-31",
    sourceUrl:
      "https://www.worldcard.com.tr/kampanyalar/gida-marketi-alisverislerinize-1200-tl-world-pay-ile-ek-300-tl-toplamda-1500-tlye-varan-worldpuan",
  },
  {
    id: "world-restoran-ekim-2026",
    program: "world",
    category: "Restoran",
    benefit: "600 TL'ye varan Worldpuan",
    title: "Restoran harcamalarına Worldpuan",
    summary:
      "2.000 TL ve üzeri restoran harcamalarında Worldpuan; World Pay ile ödemelerde ek puan fırsatı.",
    endsAt: "2026-10-31",
    sourceUrl:
      "https://www.worldcard.com.tr/kampanyalar/restoran-harcamalariniza-toplamda-600-tlye-varan-worldpuan-hediye",
  },
  {
    id: "axess-flo-ekim-2026",
    program: "axess",
    category: "Giyim",
    benefit: "300 TL chip-para",
    title: "FLO'da ilk alışveriş fırsatı",
    summary:
      "FLO mağazaları ve flo.com.tr'de tek seferde 2.500 TL ve üzeri ilk alışverişe 300 TL chip-para.",
    endsAt: "2026-10-31",
    sourceUrl: "https://www.axess.com.tr/axess/kampanyalar/axesse-ozel-floda-300-tl-chip-para",
  },
  {
    id: "axess-obilet-ekim-2026",
    program: "axess",
    category: "Seyahat",
    benefit: "150 TL chip-para",
    title: "obilet.com'da seyahat fırsatı",
    summary:
      "Kampanyaya dahil ilk 2.000 TL ve üzeri bilet, araç kiralama veya otel harcamasına 150 TL chip-para.",
    endsAt: "2026-10-31",
    sourceUrl:
      "https://www.axess.com.tr/axess/kampanyalar/axesse-ozel-obiletcomda-150-tlye-varan-chip-para",
  },
  {
    id: "paraf-market-ekim-2026",
    program: "paraf",
    category: "Market",
    benefit: "1.000 TL ParafPara",
    title: "Market harcamalarına ParafPara",
    summary:
      "Yurt içi market harcamalarında toplam 30.000 TL ve üzeri harcamaya 1.000 TL ParafPara. Harcamadan önce katılım gerekiyor.",
    endsAt: "2026-10-31",
    sourceUrl:
      "https://www.paraf.com.tr/tr/kampanyalar/market/market-harcamalariniza-1000tl-parafpara1.html",
  },
  {
    id: "paraf-akaryakit-ekim-2026",
    program: "paraf",
    category: "Akaryakıt",
    benefit: "400 TL ParafPara",
    title: "Akaryakıt harcamalarına ParafPara",
    summary:
      "Farklı günlerde, tek seferde 1.500 TL ve üzeri yapılan üçüncü akaryakıt harcamasına 400 TL ParafPara.",
    endsAt: "2026-10-31",
    sourceUrl:
      "https://www.paraf.com.tr/tr/kampanyalar/akaryakit/akaryakit-harcamalariniza-400tl-parafpara.html",
  },
];
