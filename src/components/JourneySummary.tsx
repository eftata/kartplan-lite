import { useJourney } from "../lib/journeyStore";
import { formatKurus } from "../lib/money";
import { monthName } from "../lib/dates";
import { useApp } from "../lib/store";
import { Link } from "../lib/router";
export function JourneySummary() {
  const { totals, loading, error, game } = useJourney();
  const { today, profile } = useApp();
  if (!profile?.onboarded) return null;
  const percent = totals.progressPercent;
  return (
    <section className="journey-summary" aria-label="Aylık kazanım özeti">
      <div className="journey-summary-head">
        <span className="kicker">{monthName(today)} · Kampanya yolculuğun</span>
        <Link href="/kampanyalar">Kampanyalarıma git ↗</Link>
      </div>
      <div className="journey-summary-grid">
        <Link href="/kampanyalar?stage=joined">
          <small>Potansiyel kazanım</small>
          <strong>{loading ? "…" : formatKurus(totals.potentialKurus)}</strong>
          <span>Takibe aldığın hedeflerin toplamı</span>
        </Link>
        <Link href="/kampanyalar?stage=completed">
          <small>Tamamlanan kazanım</small>
          <strong className="pos">{loading ? "…" : formatKurus(totals.earnedKurus)}</strong>
          <span>{totals.completed} kampanya hedefi tamamlandı</span>
        </Link>
        <Link href="/kampanyalar?stage=active">
          <small>Devam eden</small>
          <strong>
            {totals.active}
            <em> kampanya</em>
          </strong>
          <span>Katılım ve uygun işlem takibi</span>
        </Link>
        <Link href="/lig">
          <small>Aylık ilerleme</small>
          <strong>%{percent}</strong>
          <span>Lig puanın: {game.score} · Görevlerine git ↗</span>
        </Link>
      </div>
      <progress value={percent} max={100} aria-label="Kazanım hedefi ilerlemesi" />
      <p className="small muted">
        {error
          ? "Takip bilgileri yüklenemedi. Bağlantını kontrol et."
          : "Tamamlanan kazanım, uygun olarak beyan ettiğin işlemlerden hesaplanır; bankanın hesabına yüklediği tutar değildir."}
      </p>
    </section>
  );
}
