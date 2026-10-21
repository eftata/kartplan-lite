import { useState } from "react";
import { GoalBoard } from "../components/GoalBoard";
import { useCampaignFeed } from "../lib/useCampaignFeed";
import { planOpportunities } from "../lib/planOpportunities";
import { planWithReservations, type PlanReservation } from "../lib/planReservations";
import { PlanOpportunities } from "../components/PlanOpportunities";
import { PageHead } from "../components/Layout";
import { CardLabel } from "../components/MiniCard";
import { rewardText } from "../components/CampaignItem";
import { categoryIcon, categoryName } from "../lib/categories";
import { daysBetween, formatDay, monthName } from "../lib/dates";
import { formatKurus } from "../lib/money";
import { bestSingleCard, eligibleCards, isActiveThisMonth, optimize } from "../lib/optimizer";
import { Link } from "../lib/router";
import { useSession } from "../lib/store";
import type { CategorySlug } from "../lib/types";

export function Plan() {
  const { profile, myCards, planCampaigns: campaigns, today, catalog } = useSession();
  const { external, loading } = useCampaignFeed(today);
  const [reservations, setReservations] = useState<PlanReservation[]>(
    profile.planMonth === today.slice(0, 7) ? (profile.planChoices ?? []) : [],
  );
  const applicable = campaigns.filter(
    (c) => !c.demo && isActiveThisMonth(c, today) && eligibleCards(c, myCards).length > 0,
  );
  const uncovered = myCards.filter(
    (card) => !applicable.some((c) => eligibleCards(c, [card]).length > 0),
  );
  const input = {
    cards: myCards,
    spend: profile.spend,
    campaigns: campaigns.filter((c) => !c.demo),
    joined: profile.joined,
    today,
  };
  const baseline = optimize(input);
  const { plan, issues, accepted } = planWithReservations(input, reservations);
  const opportunities = planOpportunities(
    external,
    campaigns,
    myCards,
    profile.spend,
    today,
    new Set(plan.outcomes.map((o) => o.campaign.id)),
  );
  const reserve = (reservation: PlanReservation) =>
    setReservations((old) => [
      ...old.filter((r) => r.campaignId !== reservation.campaignId),
      reservation,
    ]);
  const single = bestSingleCard(input);
  const cardById = (id: string) => catalog.find((c) => c.id === id);

  const groups = new Map<CategorySlug, typeof plan.lines>();
  for (const l of plan.lines) groups.set(l.category, [...(groups.get(l.category) ?? []), l]);
  const byCategory = [...groups.entries()];

  const toJoin = plan.outcomes.filter((o) => o.campaign.requiresJoin && !o.joined);
  const comparison = accepted.length ? baseline.totalKurus : (single?.totalKurus ?? 0);
  const extra = plan.totalKurus - comparison;
  const unverified = myCards.some((c) => !c.verified);

  if (myCards.length === 0) {
    return (
      <>
        <PageHead kicker={monthName(today)} title="Bu ayın planı" />
        <div className="empty">
          <p>Henüz kart eklemedin.</p>
          <Link href="/kartlarim" className="btn btn-primary">
            Kart ekle
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead kicker={monthName(today)} title="Bu ayın planı">
        {formatKurus(plan.totalSpendKurus)} harcamayı{" "}
        {new Set(plan.lines.map((l) => l.cardId)).size} karta dağıttık.
      </PageHead>

      <div className="plan-input-summary">
        <span>
          <b>{myCards.length}</b> kayıtlı kart
        </span>
        <span>
          <b>{Object.values(profile.spend).filter((v) => v && v > 0).length}</b> harcama kategorisi
        </span>
        <span>
          <b>{applicable.filter((c) => !c.scenarioOnly).length}</b> otomatik hesaplama kuralı
        </span>
        <span>
          <b>{applicable.filter((c) => c.scenarioOnly).length}</b> koşula bağlı hesaplama
        </span>
        <a href="#plan-firsatlari">
          {loading ? "Fırsatlar yükleniyor…" : `${opportunities.length} güncel fırsatı incele ↓`}
        </a>
        <Link href="/kartlarim">Kartları düzenle ↗</Link>
        <Link href="/harcama">Harcamaları düzenle ↗</Link>
      </div>
      {plan.totalSpendKurus === 0 && (
        <div className="callout">
          <h2>Kaydedilmiş harcama bulunamadı</h2>
          <p>Harcama profilini girip Kaydet düğmesine bas. Plan kaydedilen tutarları kullanır.</p>
          <Link href="/harcama">Harcama ekle ↗</Link>
        </div>
      )}
      {issues.length > 0 && (
        <div className="callout" role="alert">
          <h2>Bu bütçe payları uygulanamadı</h2>
          <ul>
            {issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
          <button type="button" className="btn btn-ghost" onClick={() => setReservations(accepted)}>
            Uygulanamayan seçimleri temizle
          </button>
        </div>
      )}
      <section className="summary">
        <div className="summary-main">
          <span className="kicker">
            {accepted.length ? "Seçtiğin senaryonun net kazancı" : "Otomatik planın net kazancı"}
          </span>
          <strong className="big num">{formatKurus(plan.totalKurus)}</strong>
          <span className="muted small">
            Kampanyalardan {formatKurus(plan.campaignKurus)} · temel puandan{" "}
            {formatKurus(plan.baseKurus)}
          </span>
        </div>
        <div className="summary-side">
          <span className="kicker">
            {accepted.length ? "Mağaza seçmeden otomatik plan" : "En iyi tek kart senaryosu"}
          </span>
          <strong className="num">{formatKurus(comparison)}</strong>
          <span className="muted small">
            {!accepted.length && single && cardById(single.cardId)?.name}
            {extra > 0 && (
              <>
                {" "}
                · plan <b className="pos">+{formatKurus(extra)}</b> fazla
              </>
            )}
          </span>
        </div>
      </section>

      <GoalBoard reservations={reservations} onChange={setReservations} />
      <details className="plan-calculation-details">
        <summary>Dağılım, katılım adımları ve hesaplama dökümü</summary>
        <section className="callout callout-soft">
          <h2>Bu tutar nasıl hesaplandı?</h2>
          <p className="small">
            Aylık bütçenin kampanyadaki işlem tutarı ve ayrı gün koşullarına uygun alışverişlere
            bölündüğü varsayılır. Henüz yapılan işlemleri, mağazayı veya banka katılımını
            doğrulamıyoruz. Tutar, bu koşulları uygulayabilirsen elde edebileceğin net puan/iade
            tahminidir.
          </p>
          <p className="small">
            Katılım ücretleri düşülür; QR ve mobil ödeme ek ödülleri dahil edilmez. Birlikte
            kullanılabildiği doğrulanmayan aynı program ve sektör kampanyalarından yalnızca en
            yüksek kazanç sayılır. Bu yöntem tüm olası dağılımların en iyisini garanti etmez.
          </p>
          {uncovered.length > 0 && (
            <p className="small">
              <b>Hesaplama kapsamı dışında:</b> {uncovered.map((c) => c.name).join(", ")}. Bu
              kartlar için doğrulanmış hesaplama kuralı yok; sıfır görünmesi kampanyalarının
              olmadığı anlamına gelmez.
            </p>
          )}
        </section>

        {toJoin.length > 0 && (
          <section className="callout">
            <h2>Katılmayı unutma</h2>
            <p className="muted small">
              Bu kampanyalar planda var ama ödül için katılım gerekiyor.
            </p>
            <ul className="join-list">
              {toJoin.map((o) => (
                <li key={o.campaign.id}>
                  <div>
                    <strong>{o.campaign.title}</strong>
                    <small>
                      {cardById(o.cardId)?.name} ·{" "}
                      {o.campaign.joinHint || "Bankanın uygulamasından katıl."} ·{" "}
                      {formatDay(o.campaign.endsAt, today)}'e kadar
                    </small>
                  </div>
                  <Link className="btn btn-soft" href={`/kampanyalar?campaign=${o.campaign.id}`}>
                    Katılımı ve hedefi aç ↗
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="plan-table" aria-label="Kategori başına plan">
          {byCategory.map(([cat, lines]) => (
            <div className="plan-cat" key={cat}>
              <div className="plan-cat-head">
                <span className="cat-icon" aria-hidden="true">
                  {categoryIcon(cat)}
                </span>
                <h3>{categoryName(cat)}</h3>
                <span className="num muted">{formatKurus(profile.spend[cat] ?? 0)}</span>
              </div>
              {lines.map((l) => {
                const hits = plan.outcomes.filter(
                  (o) =>
                    o.cardId === l.cardId &&
                    (o.campaign.category === cat || o.campaign.category === "tumu"),
                );
                return (
                  <div className="plan-line" key={l.cardId}>
                    <CardLabel card={cardById(l.cardId)} />
                    <div className="plan-line-camps">
                      {hits.length === 0 ? (
                        <span className="muted small">Kazanç farkı doğrulanamadı</span>
                      ) : (
                        hits.map((o) => (
                          <span key={o.campaign.id} className="tag tag-plan">
                            {o.campaign.title.replace(/^Örnek:\s*/, "")}
                          </span>
                        ))
                      )}
                    </div>
                    <strong className="num plan-amount">{formatKurus(l.amountKurus)}</strong>
                  </div>
                );
              })}
            </div>
          ))}
        </section>

        {plan.nearMisses.length > 0 && (
          <section className="callout callout-soft">
            <h2>Alternatif kampanya eşikleri</h2>
            <p className="muted small">
              Bu alternatifler yukarıdaki kazanca eklenmez. Sırf ödül için bütçeni artırma; işlem ve
              katılım koşulları ayrıca geçerlidir.
            </p>
            <ul className="near-list">
              {plan.nearMisses.map((n) => (
                <li key={n.campaign.id}>
                  <span>
                    {cardById(n.cardId)?.name} için bütçe eksiği:{" "}
                    <b>{formatKurus(n.missingKurus)}</b> · koşullu net ödül:{" "}
                    <b className="pos">{formatKurus(n.rewardKurus)}</b>
                  </span>
                  <small className="muted">
                    {n.campaign.title} · {daysBetween(today, n.campaign.endsAt)} gün kaldı
                  </small>
                </li>
              ))}
            </ul>
          </section>
        )}

        {plan.outcomes.length > 0 && (
          <section>
            <h2 className="section-title">Plandaki kampanyalar</h2>
            <ul className="outcome-list">
              {plan.outcomes.map((o) => (
                <li key={o.campaign.id}>
                  <span>
                    <strong>{o.campaign.title}</strong>
                    <small className="muted">
                      {cardById(o.cardId)?.name} · {formatKurus(o.spentKurus)} harcama ·{" "}
                      {rewardText(o.campaign)}
                      {o.feeKurus > 0 && (
                        <>
                          {" "}
                          · {formatKurus(o.grossRewardKurus)} brüt − {formatKurus(o.feeKurus)}{" "}
                          katılım ücreti
                        </>
                      )}
                    </small>
                    <small className="muted">{o.campaign.summary}</small>
                    <small>
                      <a href={o.campaign.url} target="_blank" rel="noopener noreferrer">
                        Banka koşullarında teyit et ↗
                      </a>
                    </small>
                  </span>
                  <strong className="num pos">+{formatKurus(o.rewardKurus)}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}
      </details>
      <PlanOpportunities
        opportunities={opportunities}
        today={today}
        loading={loading}
        reservations={accepted}
        onReserve={reserve}
        onRemove={(id) => setReservations((old) => old.filter((r) => r.campaignId !== id))}
      />
      {plan.outcomes.length === 0 && (
        <p className="muted note">
          Kayıtlı tutarlarla hesaplanabilen bir kampanya kazancı bulunamadı. İşlem eşiği, kart
          uygunluğu veya hesaplama kapsamı nedeniyle sonuç sıfır olabilir. Keşfet bölümündeki tüm
          kampanyaların sayısal hesaplama kuralı henüz bulunmuyor.
        </p>
      )}
      {unverified && (
        <p className="muted note small">
          Bazı kartların temel puan oranı henüz banka kaynağından doğrulanmadı; bu kartlarda temel
          kazanç 0 sayılır.
        </p>
      )}
    </>
  );
}
