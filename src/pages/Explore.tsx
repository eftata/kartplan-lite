import { useEffect, useState } from "react";
import { ProgramIcon } from "../components/ProgramIcon";
import { EXTERNAL_CAMPAIGNS, type ExternalCampaign } from "../lib/externalCampaigns";
import { Link } from "../lib/router";
import { CAMPAIGN_SOURCES } from "../lib/sources";
import { useApp } from "../lib/store";

export function Explore() {
  const { user, catalog, campaigns, profile, today } = useApp();
  const [program, setProgram] = useState("");
  const [category, setCategory] = useState("Tümü");
  const [onlyMine, setOnlyMine] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [feed, setFeed] = useState<{ updatedAt: string; campaigns: ExternalCampaign[] } | null>(
    null,
  );
  useEffect(() => {
    let active = true;
    async function loadFeed() {
      const urls = [
        `/campaign-feed.json?v=${today}`,
        `https://raw.githubusercontent.com/eftata/kartplan-lite/main/public/campaign-feed.json?v=${today}`,
      ];
      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const data = await response.json();
          if (active && Array.isArray(data.campaigns) && data.campaigns.length > 20)
            setFeed((old) => (!old || data.updatedAt > old.updatedAt ? data : old));
        } catch {
          /* Yerel veri ve elle doğrulanan seçki kullanılabilir. */
        }
      }
    }
    void loadFeed();
    return () => {
      active = false;
    };
  }, [today]);
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
  const external = feed?.campaigns ?? EXTERNAL_CAMPAIGNS;
  const current = [
    ...external.filter((campaign) => !campaign.endsAt || campaign.endsAt >= today),
    ...curated,
  ];
  const categories = ["Tümü", ...new Set(current.map((campaign) => campaign.category))];
  const visible = current.filter(
    (campaign) =>
      (!program || campaign.program === program) &&
      (category === "Tümü" || campaign.category === category) &&
      (!onlyMine || owned.has(campaign.program)) &&
      (!query ||
        `${campaign.title} ${campaign.summary} ${campaign.category}`
          .toLocaleLowerCase("tr")
          .includes(query.toLocaleLowerCase("tr"))),
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
              <h2>Kart kampanyaları</h2>
            </div>
            <span>
              {visible.length} kampanya ·{" "}
              {feed?.updatedAt
                ? `${new Date(`${feed.updatedAt}T12:00:00`).toLocaleDateString("tr-TR")} güncellendi`
                : "Doğrulanan seçki"}
            </span>
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
              {visible.slice(0, page * 24).map((campaign) => {
                const source = CAMPAIGN_SOURCES.find((item) => item.program === campaign.program);
                return (
                  <article className={`offer-card offer-${campaign.program}`} key={campaign.id}>
                    <div className="offer-meta">
                      <span className="offer-bank-mark">
                        <ProgramIcon program={campaign.program} size={30} />
                      </span>
                      <span>{source?.name ?? campaign.program}</span>
                      <span className="offer-category">{campaign.category}</span>
                    </div>
                    <div className="offer-content">
                      {campaign.benefit && (
                        <span className="offer-benefit">{campaign.benefit}</span>
                      )}
                      <h3>{campaign.title}</h3>
                      {campaign.summary && <p>{campaign.summary}</p>}
                    </div>
                    <div className="offer-footer">
                      <span>
                        {campaign.endsAt ? (
                          <>
                            Son gün{" "}
                            <strong>
                              {new Date(`${campaign.endsAt}T12:00:00`).toLocaleDateString("tr-TR", {
                                day: "numeric",
                                month: "long",
                              })}
                            </strong>
                          </>
                        ) : (
                          "Resmi listede"
                        )}
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
