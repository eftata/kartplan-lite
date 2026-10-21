import { JourneySummary } from "../components/JourneySummary";
import { useSession } from "../lib/store";
import { useJourney } from "../lib/journeyStore";
import { Link } from "../lib/router";
import { formatKurus } from "../lib/money";
import { monthName } from "../lib/dates";
import { selectedReward } from "../lib/planner";
export function Home() {
  const { profile, myCards, planCampaigns, today, user } = useSession();
  const { totals } = useJourney();
  const choices = profile.planMonth === today.slice(0, 7) ? (profile.planChoices ?? []) : [];
  const budget = Object.values(profile.spend).reduce((s, v) => s + (v ?? 0), 0);
  return (
    <>
      <section className="member-welcome">
        <div>
          <span className="kicker">{monthName(today)} · Kişisel kart asistanın</span>
          <h1>Kartlarından daha fazlasını kazan.</h1>
          <p>
            {user.displayName?.split(" ")[0] ? `${user.displayName.split(" ")[0]}, ` : ""}önce
            kullanmak istediğin kampanyaları seç. Bütçeni hangi kartla, nerede kullanacağını
            birlikte netleştirelim.
          </p>
          <div className="row-actions">
            <Link className="btn btn-primary" href="/plan">
              {choices.length ? "Planımı düzenle" : "Adım adım plan oluştur"} <span>→</span>
            </Link>
            <Link className="btn btn-ghost" href="/kampanyalar">
              Önce kampanyalara göz at ↗
            </Link>
          </div>
        </div>
        <div className="welcome-insight">
          <span>BU AYIN PLAN POTANSİYELİ</span>
          <strong>{formatKurus(selectedReward(choices, planCampaigns, myCards))}</strong>
          <p>
            {choices.length} seçili kampanya · {myCards.length} kayıtlı kart
          </p>
          <div>
            <span>Aylık bütçe</span>
            <b>{formatKurus(budget)}</b>
          </div>
          <small>Seçilen kampanyaların koşulları sağlandığında hesaplanan net ödül.</small>
        </div>
      </section>
      <JourneySummary />
      <section className="member-path">
        <div>
          <b>01</b>
          <h2>Planını oluştur</h2>
          <p>
            Bütçeni belirle, kart veya kampanya seç. Uygun kart ve harcama payı otomatik atansın.
          </p>
          <Link href="/plan">Plan oluşturmaya başla →</Link>
        </div>
        <div>
          <b>02</b>
          <h2>Kampanyanı keşfet</h2>
          <p>
            Bankaların güncel fırsatlarını karşılaştır. Hesaplanabilenleri tek seçimle planına ekle.
          </p>
          <Link href="/kampanyalar">Kampanyaları incele →</Link>
        </div>
        <div>
          <b>03</b>
          <h2>Harcamalarını takip et</h2>
          <p>
            Seçtiğin kampanyaya katılımını teyit et. Uygun işlemlerini kaydet, hedefini tamamla.
          </p>
          <Link href="/takip">Kampanya takibime git →</Link>
        </div>
      </section>
      <section className="home-bottom">
        <div>
          <span className="kicker">Kaldığın yerden devam et</span>
          <h2>
            {totals.active
              ? `${totals.active} kampanyan ilerlemeyi bekliyor.`
              : choices.length
                ? "Planın hazır. Sırada katılım ve takip var."
                : "İlk planın için her şey burada."}
          </h2>
          <p>
            Plan seçimi, bankanın kampanyasına katılım yerine geçmez. Takip ekranında katılımını
            ayrıca onaylayabilirsin.
          </p>
          <Link className="btn btn-soft" href={choices.length ? "/takip" : "/plan"}>
            {choices.length ? "Seçtiğim kampanyalara git" : "İlk kampanyalarımı seç"} ↗
          </Link>
        </div>
        <Link className="league-teaser" href="/lig">
          <span className="kicker">Çok yakında</span>
          <h3>Kampanya Ligi</h3>
          <p>Görevler, sezonlar ve başarılar için yeni bir deneyim hazırlıyoruz.</p>
          <span>Ön gösterime bak →</span>
        </Link>
      </section>
      <Link className="planner-home-link" href="/kesfet">
        Genel siteyi ve tüm banka kampanyalarını keşfet ↗
      </Link>
    </>
  );
}
