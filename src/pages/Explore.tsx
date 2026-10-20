import { useState } from "react";
import { Link } from "../lib/router";
import { useApp } from "../lib/store";
import { CAMPAIGN_SOURCES } from "../lib/sources";

export function Explore() {
  const { user, catalog, campaigns, today } = useApp();
  const [program, setProgram] = useState("");
  const sources = CAMPAIGN_SOURCES.filter((source) => !program || source.program === program);
  const cards = catalog.filter((card) => !program || card.program === program);
  const active = campaigns
    .filter(
      (campaign) =>
        campaign.status === "yayinda" &&
        !campaign.demo &&
        campaign.startsAt <= today &&
        campaign.endsAt >= today &&
        (!program || campaign.program === program),
    )
    .sort((a, b) => a.endsAt.localeCompare(b.endsAt));

  return (
    <div className="explore">
      <header className="topbar topbar-plain">
        <Link href="/" className="wordmark" aria-label="KartPlan ana sayfa">
          Kart<em>Plan</em>
        </Link>
        <nav className="landing-nav" aria-label="Ana menü">
          <Link href="/kesfet">Keşfet</Link>
          <Link href={user ? "/kartlarim" : "/giris"} className="btn btn-primary">
            {user ? "Kartlarım" : "Kartlarımı ekle"}
          </Link>
        </nav>
      </header>

      <main className="explore-main">
        <div className="explore-hero">
          <p className="kicker">Kart kampanyaları</p>
          <h1>
            Fırsatları keşfet.
            <br />
            <em>Kartlarını takip et.</em>
          </h1>
          <p>
            Bankaların güncel kampanya sayfalarına ulaş, KartPlan'da yayınlanan kampanyaları gör ve
            kendi kartlarını ekleyerek sana uygun fırsatları ayır.
          </p>
        </div>

        <div className="explore-filters" aria-label="Kart programı filtresi">
          <button className={!program ? "selected" : ""} onClick={() => setProgram("")}>
            Tümü
          </button>
          {CAMPAIGN_SOURCES.map((source) => (
            <button
              key={source.program}
              className={program === source.program ? "selected" : ""}
              onClick={() => setProgram(source.program)}
            >
              {source.name}
            </button>
          ))}
        </div>

        <section className="explore-section" aria-labelledby="sources-title">
          <div className="explore-section-head">
            <div>
              <p className="kicker">Resmi kaynaklar</p>
              <h2 id="sources-title">Güncel kampanyalara git</h2>
            </div>
            <p>Kampanya koşulları ve geçerlilik tarihleri bankanın sayfasında yer alır.</p>
          </div>
          <div className="source-grid">
            {sources.map((source) => (
              <a
                className={`source-card prog-${source.program}`}
                key={source.program}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="source-icon">{source.name.slice(0, 1)}</span>
                <span className="source-bank">{source.bank}</span>
                <strong>{source.name} kampanyaları</strong>
                <span className="source-action">
                  Resmi sayfayı aç <span aria-hidden="true">↗</span>
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="explore-section" aria-labelledby="campaign-title">
          <div className="explore-section-head">
            <div>
              <p className="kicker">KartPlan seçkisi</p>
              <h2 id="campaign-title">Yayınlanan kampanyalar</h2>
            </div>
            <p>Yönetici tarafından eklenen, süresi devam eden kampanyalar.</p>
          </div>
          {active.length ? (
            <div className="explore-campaigns">
              {active.map((campaign) => (
                <article className="explore-campaign" key={campaign.id}>
                  <span className="pill">
                    {CAMPAIGN_SOURCES.find((source) => source.program === campaign.program)?.name ??
                      campaign.program}
                  </span>
                  <h3>{campaign.title}</h3>
                  <p>{campaign.summary}</p>
                  <div className="explore-campaign-foot">
                    <span>{campaign.endsAt} tarihine kadar</span>
                    {campaign.url && (
                      <a href={campaign.url} target="_blank" rel="noopener noreferrer">
                        Koşulları incele ↗
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="explore-note">
              Bu program için KartPlan'da yayınlanmış güncel kampanya yok. Yukarıdaki resmi
              kaynaklarda fırsatları inceleyebilirsin.
            </div>
          )}
        </section>

        <section className="explore-section" aria-labelledby="cards-title">
          <div className="explore-section-head">
            <div>
              <p className="kicker">Başlangıç kataloğu</p>
              <h2 id="cards-title">Kartlarını seçmeye başla</h2>
            </div>
            <p>Kart numarası gerekmez. Sahip olduğun kartların adını seçmen yeterli.</p>
          </div>
          <div className="explore-card-list">
            {cards.map((card) => (
              <span key={card.id} className="explore-card-name">
                <span className={`dot prog-${card.program}`} />
                {card.name}
                <small>{card.bank}</small>
              </span>
            ))}
          </div>
          <Link href={user ? "/kartlarim" : "/giris"} className="btn btn-primary">
            {user ? "Kartlarımı yönet" : "Kartlarımı ekle"} ↗
          </Link>
        </section>
      </main>
      <footer className="footer">
        <span>KartPlan · bağımsız bir araçtır, hiçbir bankayla bağlantılı değildir.</span>
        <Link href="/aydinlatma">Aydınlatma metni</Link>
      </footer>
    </div>
  );
}
