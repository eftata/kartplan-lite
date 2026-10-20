import { useState } from "react";
import { EXTERNAL_CAMPAIGNS, type ExternalCampaign } from "../lib/externalCampaigns";
import { Link } from "../lib/router";
import { CAMPAIGN_SOURCES } from "../lib/sources";
import { useApp } from "../lib/store";

export function Explore() {
  const { user, catalog, campaigns, profile, today } = useApp();
  const [program, setProgram] = useState("");
  const [category, setCategory] = useState("Tümü");
  const [onlyMine, setOnlyMine] = useState(false);
  const owned = new Set(
    catalog.filter((card) => profile?.cardIds.includes(card.id)).map((card) => card.program),
  );
  const curated: ExternalCampaign[] = campaigns
    .filter(
      (campaign) =>
        campaign.status === "yayinda" &&
        !campaign.demo &&
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
    ...EXTERNAL_CAMPAIGNS.filter((campaign) => campaign.endsAt >= today),
    ...curated,
  ];
  const categories = ["Tümü", ...new Set(current.map((campaign) => campaign.category))];
  const visible = current.filter(
    (campaign) =>
      (!program || campaign.program === program) &&
      (category === "Tümü" || campaign.category === category) &&
      (!onlyMine || owned.has(campaign.program)),
  );

  return (
    <div className="discovery">
      <header className="discovery-topbar">
        <Link href="/kesfet" className="discovery-logo" aria-label="KartPlan ana sayfa">
          K<span>·</span>PLAN <small>KART KAMPANYALARI</small>
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
              <h2>Güncel kampanyalar</h2>
            </div>
            <span>{visible.length} kampanya gösteriliyor</span>
          </div>
          <div className="discovery-programs" aria-label="Kart programı filtresi">
            <button className={!program ? "active" : ""} onClick={() => setProgram("")}>
              Tüm kartlar
            </button>
            {CAMPAIGN_SOURCES.map((source) => (
              <button
                key={source.program}
                className={program === source.program ? "active" : ""}
                onClick={() => setProgram(source.program)}
              >
                {source.name}
              </button>
            ))}
          </div>
          <div className="discovery-controls">
            <label>
              Kategori{" "}
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            {user && (
              <label className="mine-control">
                <input
                  type="checkbox"
                  checked={onlyMine}
                  onChange={(event) => setOnlyMine(event.target.checked)}
                />{" "}
                Yalnızca kartlarım
              </label>
            )}
            <span>Özetler bankaların resmi kampanya sayfalarından derlenmiştir.</span>
          </div>
          {visible.length ? (
            <div className="discovery-grid">
              {visible.map((campaign) => {
                const source = CAMPAIGN_SOURCES.find((item) => item.program === campaign.program);
                return (
                  <article className={`offer-card offer-${campaign.program}`} key={campaign.id}>
                    <div className="offer-meta">
                      <span className="offer-bank-mark">{source?.name.slice(0, 1) ?? "K"}</span>
                      <span>{source?.name ?? campaign.program}</span>
                      <span className="offer-category">{campaign.category}</span>
                    </div>
                    <div className="offer-content">
                      <span className="offer-benefit">{campaign.benefit}</span>
                      <h3>{campaign.title}</h3>
                      <p>{campaign.summary}</p>
                    </div>
                    <div className="offer-footer">
                      <span>
                        Son gün{" "}
                        <strong>
                          {new Date(`${campaign.endsAt}T12:00:00`).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "long",
                          })}
                        </strong>
                      </span>
                      {campaign.sourceUrl && (
                        <a
                          href={campaign.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${campaign.title} koşullarını bankada teyit et`}
                        >
                          Bankada teyit et ↗
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="discovery-empty">
              Bu filtrede süresi devam eden kampanya bulunamadı. Başka bir kart veya kategori
              seçebilirsin.
            </div>
          )}
          <p className="discovery-footnote">
            Kampanya şartları, kart uygunluğu ve katılım adımları değişebilir. İşlemden önce
            bankanın kendi sayfasından teyit edin.
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
                  {source.name.slice(0, 1)}
                </span>
                <span>
                  <strong>{source.name}</strong>
                  <small>
                    {catalog.filter((card) => card.program === source.program).length} kart seçeneği
                  </small>
                </span>
                <span aria-hidden="true">↗</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="discovery-footer">
        <span>
          K·PLAN <small>Bağımsız kampanya takip aracı</small>
        </span>
        <Link href="/aydinlatma">Aydınlatma metni</Link>
      </footer>
    </div>
  );
}
