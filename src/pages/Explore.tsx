import { useCampaignFeed } from "../lib/useCampaignFeed";
import { CardCatalog } from "../components/CardCatalog";
import { useState } from "react";
import { ProgramIcon } from "../components/ProgramIcon";
import { Brand } from "../components/Brand";
import { CampaignCard } from "../components/CampaignCard";
import { SectorIcon } from "../components/SectorIcon";
import { type ExternalCampaign } from "../lib/externalCampaigns";
import { Link } from "../lib/router";
import { CAMPAIGN_SOURCES } from "../lib/sources";
import { useApp } from "../lib/store";

export function Explore() {
  const { user, catalog, campaigns, profile, today } = useApp();
  const [program, setProgram] = useState("");
  const [category, setCategory] = useState("Tümü");
  const [kind, setKind] = useState("Tümü");
  const [order, setOrder] = useState("karisik");
  const [onlyMine, setOnlyMine] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const { feed, external } = useCampaignFeed(today);
  const owned = new Set(
    catalog.filter((card) => profile?.cardIds.includes(card.id)).map((card) => card.program),
  );
  const curated: ExternalCampaign[] = campaigns
    .filter(
      (campaign) =>
        campaign.status === "yayinda" &&
        !campaign.demo &&
        !campaign.planningOnly &&
        campaign.startsAt <= today &&
        campaign.endsAt >= today,
    )
    .map((campaign) => ({
      id: campaign.id,
      program: campaign.program,
      category: campaign.category === "tumu" ? "Genel" : campaign.category,
      title: campaign.title,
      summary: campaign.summary,
      benefit: "KartPlan seçkisi",
      endsAt: campaign.endsAt,
      sourceUrl: campaign.url,
    }));
  const current = [
    ...external.filter((campaign) => !campaign.endsAt || campaign.endsAt >= today),
    ...curated,
  ];
  const categories = ["Tümü", ...new Set(current.map((campaign) => campaign.category))];
  const filtered = current.filter(
    (campaign) =>
      (!program || campaign.program === program) &&
      (category === "Tümü" || campaign.category === category) &&
      (kind === "Tümü" ||
        (
          {
            Puan: /puan|bonus|chip-para|mil/i,
            İndirim: /indirim/i,
            Taksit: /taksit/i,
            Nakit: /nakit|avans/i,
          }[kind] as RegExp
        ).test(`${campaign.title} ${campaign.benefit}`)) &&
      (!onlyMine || owned.has(campaign.program)) &&
      (!query ||
        `${campaign.title} ${campaign.summary} ${campaign.category}`
          .toLocaleLowerCase("tr")
          .includes(query.toLocaleLowerCase("tr"))),
  );
  const visible =
    order === "bitis"
      ? [...filtered].sort((a, b) => (a.endsAt || "9999").localeCompare(b.endsAt || "9999"))
      : (() => {
          const groups = CAMPAIGN_SOURCES.map((source) =>
            filtered.filter((campaign) => campaign.program === source.program),
          );
          const other = filtered.filter(
            (campaign) => !CAMPAIGN_SOURCES.some((source) => source.program === campaign.program),
          );
          const mixed: ExternalCampaign[] = [];
          for (let i = 0; mixed.length < filtered.length; i++) {
            for (const group of groups) {
              const campaign = group[i];
              if (campaign) mixed.push(campaign);
            }
            const extra = other[i];
            if (extra) mixed.push(extra);
          }
          return mixed;
        })();

  return (
    <div className="discovery">
      <header className="discovery-topbar">
        <Link href="/kesfet" className="discovery-logo" aria-label="KartPlan ana sayfa">
          <Brand subtitle />
        </Link>
        <nav aria-label="Ana menü">
          <a href="#kampanyalar">Kampanyalar</a>
          <a href="#kartlar">Kartlar</a>
          <Link href={user ? "/plan" : "/giris"} className="discovery-login">
            {user ? "Panelime git" : "Giriş yap"} ↗
          </Link>
        </nav>
      </header>
      <main className="discovery-main">
        <section className="discovery-intro">
          <div>
            <p className="discovery-eyebrow">
              <span className="live-dot" /> KART KAMPANYALARI
            </p>
            <h1>
              Kartının fırsatları.
              <br />
              <em>Tek bir yerde.</em>
            </h1>
            <p className="discovery-lead">
              Bonus, Maximum, World, Axess ve Paraf kampanyalarını burada incele. Kartlarını
              ekleyerek sana uygun fırsatlara odaklan.
            </p>
            <div className="discovery-actions">
              <a href="#kampanyalar" className="discovery-primary">
                Kampanyaları incele ↗
              </a>
              <Link href={user ? "/kartlarim" : "/giris"} className="discovery-secondary">
                Kartlarımı ekle
              </Link>
            </div>
          </div>
          <div className="discovery-feature" aria-hidden="true">
            <div className="feature-top">
              <span>01 / 05</span>
              <span>FIRSAT RADARI</span>
            </div>
            <div className="feature-orbit">
              <span>₺</span>
            </div>
            <div className="feature-bottom">
              <span>
                Fırsatları gör.
                <br />
                Koşulları teyit et.
              </span>
              <span>↗</span>
            </div>
          </div>
        </section>
        <section className="discovery-section" id="kampanyalar">
          <div className="discovery-section-title">
            <div>
              <p className="discovery-eyebrow">KEŞFET</p>
              <h2>Kart kampanyaları</h2>
            </div>
            <span>
              {visible.length} kampanya ·{" "}
              {feed?.updatedAt
                ? `${new Date(feed.updatedAt).toLocaleDateString("tr-TR")} güncellendi`
                : "Doğrulanan seçki"}
            </span>
          </div>
          <div className="discovery-sectors" aria-label="Sektör filtresi">
            {categories.map((item) => (
              <button
                key={item}
                className={category === item ? "active" : ""}
                aria-pressed={category === item}
                onClick={() => {
                  setCategory(item);
                  setPage(1);
                }}
              >
                <SectorIcon category={item} />
                <span>
                  <strong>{item === "Tümü" ? "Tüm sektörler" : item}</strong>
                  <small>
                    {item === "Tümü"
                      ? current.length
                      : current.filter((c) => c.category === item).length}{" "}
                    kampanya
                  </small>
                </span>
              </button>
            ))}
          </div>
          <div className="discovery-programs" aria-label="Kart programı filtresi">
            <button
              className={!program ? "active" : ""}
              aria-pressed={!program}
              onClick={() => {
                setProgram("");
                setPage(1);
              }}
            >
              Tüm kartlar
            </button>
            {CAMPAIGN_SOURCES.map((source) => (
              <button
                key={source.program}
                className={program === source.program ? "active" : ""}
                aria-pressed={program === source.program}
                onClick={() => {
                  setProgram(source.program);
                  setPage(1);
                }}
              >
                <ProgramIcon program={source.program} size={22} />
                {source.name}
              </button>
            ))}
          </div>
          <div className="discovery-controls">
            <label>
              Kategori{" "}
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
              >
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Fırsat türü{" "}
              <select
                value={kind}
                onChange={(event) => {
                  setKind(event.target.value);
                  setPage(1);
                }}
              >
                <option>Tümü</option>
                <option>Puan</option>
                <option>İndirim</option>
                <option>Taksit</option>
                <option>Nakit</option>
              </select>
            </label>
            <label>
              Sıralama{" "}
              <select
                value={order}
                onChange={(event) => {
                  setOrder(event.target.value);
                  setPage(1);
                }}
              >
                <option value="karisik">Bankalara dengeli</option>
                <option value="bitis">Yakında bitecek</option>
              </select>
            </label>
            {user && (
              <label className="mine-control">
                <input
                  type="checkbox"
                  checked={onlyMine}
                  onChange={(event) => setOnlyMine(event.target.checked)}
                />{" "}
                Programlarıma göre
              </label>
            )}
            <input
              className="discovery-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Kampanya ara…"
              aria-label="Kampanya ara"
            />
            <span>Resmi kaynaklardaki herkese açık kampanyalar.</span>
          </div>
          {visible.length ? (
            <div className="discovery-grid">
              {visible.slice(0, page * 24).map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} today={today} />
              ))}
            </div>
          ) : (
            <div className="discovery-empty">
              Bu filtrede süresi devam eden kampanya bulunamadı. Başka bir kart veya kategori
              seçebilirsin.
            </div>
          )}
          {visible.length > page * 24 && (
            <button className="discovery-more" type="button" onClick={() => setPage(page + 1)}>
              Daha fazla kampanya göster{" "}
              <span>{Math.min(visible.length - page * 24, 24)} sonraki</span>
            </button>
          )}
          <p className="discovery-footnote">
            Kart uygunluğu ve katılım koşulları kampanyaya göre değişir; seçtiğin programdaki tüm
            kartların uygun olduğu anlamına gelmez. Axess için yalnızca açık sayfada listelenen
            kampanyalar görüntülenir. İşlemden önce bankada teyit edin.
          </p>
        </section>
        <section className="discovery-wallet" id="kartlar">
          <div>
            <p className="discovery-eyebrow">KİŞİSEL TAKİP</p>
            <h2>Hangi kartlar sende?</h2>
            <p>
              Kart numarası veya banka şifresi paylaşmadan kartlarını seç. Kampanyaları kendi
              kartlarına göre filtrele, katıldıklarını takip et.
            </p>
            <Link href={user ? "/kartlarim" : "/giris"} className="discovery-primary">
              Kartlarımı yönet ↗
            </Link>
          </div>
          <div className="wallet-programs">
            {CAMPAIGN_SOURCES.map((source) => (
              <div key={source.program}>
                <span className={`wallet-mark wallet-${source.program}`}>
                  <ProgramIcon program={source.program} size={38} />
                </span>
                <span>
                  <strong>{source.name}</strong>
                  <small>
                    {catalog.filter((card) => card.program === source.program).length} kart seçeneği
                  </small>
                </span>
                <a
                  className="wallet-apply"
                  href={source.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${source.bank} ${source.name} kredi kartına başvur`}
                >
                  Karta başvur ↗
                </a>
              </div>
            ))}
          </div>
        </section>
        <CardCatalog cards={catalog} signedIn={!!user} />
      </main>
      <footer className="discovery-footer">
        <span>
          <Brand /> <small>Bağımsız kampanya takip aracı</small>
        </span>
        <Link href="/aydinlatma">Aydınlatma metni</Link>
      </footer>
    </div>
  );
}
