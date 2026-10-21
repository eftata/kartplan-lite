import { CampaignJourneyBoard } from "../components/CampaignJourneyBoard";
import { useSession } from "../lib/store";
import { useJourney } from "../lib/journeyStore";
import { Link } from "../lib/router";
import { formatKurus } from "../lib/money";
import { CardLabel } from "../components/MiniCard";
export function Tracking() {
  const { profile, today, planCampaigns, catalog } = useSession();
  const { enrollments } = useJourney();
  const planned =
    profile.planMonth === today.slice(0, 7)
      ? (profile.planChoices ?? []).filter(
          (r) => !enrollments.some((e) => e.campaignId === r.campaignId),
        )
      : [];
  return (
    <>
      <div className="planner-heading">
        <span className="kicker">Katılım ve gerçek harcama kaydı</span>
        <h1>Kampanya takibim</h1>
        <p>
          Planında seçtiğin hedefleri burada uygula: banka katılımını onayla, koşullara uygun
          işlemlerini kaydet ve ilerlemeni gör.
        </p>
        <Link href="/plan">Plan seçimlerimi düzenle ↗</Link>
      </div>
      {!!planned.length && (
        <section className="tracking-planned">
          <h2>Planında seçili · katılım bekliyor</h2>
          <p>
            Planın hazır. Harcama kaydetmeden önce bu kampanyaların katılım koşullarını teyit et.
          </p>
          {planned.map((r) => {
            const c = planCampaigns.find((c) => c.id === r.campaignId);
            return c ? (
              <article key={r.campaignId}>
                <CardLabel card={catalog.find((k) => k.id === r.cardId)} />
                <div>
                  <h3>{c.title}</h3>
                  <small>{formatKurus(r.amountKurus)} harcama hedefi</small>
                </div>
                <Link className="btn btn-soft" href={`/takip?campaign=${c.id}`}>
                  Katılımı tamamla →
                </Link>
              </article>
            ) : null;
          })}
        </section>
      )}
      <CampaignJourneyBoard trackingOnly />
    </>
  );
}
