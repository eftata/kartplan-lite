import { useState } from "react";
import { CATEGORIES } from "../lib/categories";
import { campaignTargets } from "../lib/campaignTargets";
import { saveUser } from "../lib/data";
import { formatKurus, parseTlInput } from "../lib/money";
import { eligibleCards, isActiveThisMonth } from "../lib/optimizer";
import { planWithReservations, type PlanReservation } from "../lib/planReservations";
import { useSession } from "../lib/store";
import type { Campaign, CampaignProgress } from "../lib/types";
import { CardLabel } from "./MiniCard";
import { useJourney } from "../lib/journeyStore";
import { Link } from "../lib/router";

export function GoalBoard({
  reservations,
  onChange,
}: {
  reservations: PlanReservation[];
  onChange: (r: PlanReservation[]) => void;
}) {
  const { user, profile, myCards, planCampaigns: campaigns, today } = useSession();
  const season = today.slice(0, 7);
  const { progress } = useJourney();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const input = { cards: myCards, spend: profile.spend, campaigns, joined: profile.joined, today };
  function choose(r: PlanReservation) {
    const next = [...reservations.filter((x) => x.campaignId !== r.campaignId), r];
    const result = planWithReservations(input, next);
    if (result.issues.length) {
      setMessage(result.issues.join(" "));
      return;
    }
    onChange(next);
    setMessage("Seçim plana eklendi. Kalıcı olması için planı kaydet.");
  }
  async function save() {
    const checked = planWithReservations(input, reservations);
    if (checked.issues.length) {
      setMessage(checked.issues.join(" "));
      return;
    }
    setBusy(true);
    try {
      await saveUser(user.uid, { planMonth: season, planChoices: reservations });
      setMessage("Bu ayın planı kaydedildi.");
    } catch {
      setMessage("Plan kaydedilemedi. Tekrar dene.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="goal-board" id="hedefler">
      <div className="goal-intro">
        <div>
          <span className="kicker">Bütçenden başlayarak planla</span>
          <h2>Aynı sektör, farklı kartlar. Seçim sende.</h2>
          <p>
            İlk ödül eşiğini ve bütçene sığan hedefi karşılaştır. Bir sektörde farklı kartlara pay
            ayırabilirsin; toplam seçim bütçeni aşamaz.
          </p>
        </div>
        <Link className="btn btn-soft" href="/lig">
          Aylık görevler ve lig ↗
        </Link>
      </div>
      {CATEGORIES.filter((cat) => (profile.spend[cat.slug] ?? 0) > 0).map((cat) => {
        const budget = profile.spend[cat.slug] ?? 0;
        const rules = campaigns.filter(
          (c) =>
            !c.demo &&
            c.category === cat.slug &&
            isActiveThisMonth(c, today) &&
            eligibleCards(c, myCards).length,
        );
        rules.sort((a, b) => {
          const chosen =
            Number(reservations.some((r) => r.campaignId === b.id)) -
            Number(reservations.some((r) => r.campaignId === a.id));
          if (chosen) return chosen;
          return (
            campaignTargets(b, eligibleCards(b, myCards)[0]!, budget).rewardKurus -
            campaignTargets(a, eligibleCards(a, myCards)[0]!, budget).rewardKurus
          );
        });
        const allocated = reservations
          .filter((r) => rules.some((c) => c.id === r.campaignId))
          .reduce((s, r) => s + r.amountKurus, 0);
        return (
          <details className="goal-category" key={cat.slug} open>
            <summary>
              <b>
                {cat.icon} {cat.name}
              </b>
              <span>
                {formatKurus(budget)} sınır · {formatKurus(Math.max(0, budget - allocated))}{" "}
                ayrılmamış
              </span>
              <span>{rules.length} hesaplanabilir kampanya</span>
            </summary>
            <div className="goal-options">
              {rules.map((c) => {
                const selected = reservations.find((r) => r.campaignId === c.id);
                const cards = eligibleCards(c, myCards);
                const recorded = progress.find((p) => p.campaignId === c.id);
                return (
                  <GoalOption
                    key={c.id}
                    campaign={c}
                    cards={cards}
                    budget={budget - allocated + (selected?.amountKurus ?? 0)}
                    selected={selected}
                    spent={recorded?.totalKurus ?? 0}
                    entries={recorded?.entries ?? []}
                    effectiveKurus={recorded?.effectiveKurus ?? 0}
                    qualifiedCount={recorded?.qualifiedCount ?? 0}
                    choose={choose}
                    remove={() => onChange(reservations.filter((r) => r.campaignId !== c.id))}
                  />
                );
              })}
            </div>
            <p className="small muted">
              {myCards
                .filter((card) => !rules.some((c) => eligibleCards(c, [card]).length))
                .map((c) => c.name)
                .join(", ") || "Tüm kartların için hesaplanabilir alternatifler yukarıda."}
              {myCards.some((card) => !rules.some((c) => eligibleCards(c, [card]).length)) &&
                ": bu sektörde doğrulanmış tutar kuralı yok. Diğer fırsatları aşağıda koşullarıyla inceleyebilirsin."}
            </p>
          </details>
        );
      })}
      <div className="goal-save">
        <span>{reservations.length} seçili kampanya · Bu ay için kaydedilir.</span>
        <button className="btn btn-primary" disabled={busy} onClick={save}>
          {busy ? "Kaydediliyor…" : "Planımı kaydet"}
        </button>
      </div>
      <p role="status">{message}</p>
      <p className="small muted">
        Hedefler alışveriş zorunluluğu değildir. Bütçeyi sırf puan için artırma. İlerleme kendi
        beyanındır; bankadan işlem doğrulaması yapılmaz. Tekrarlı kampanyalarda toplam tutar yeterli
        değildir: işlem sayısı, ayrı gün, mağaza ve katılım koşulları da sağlanmalı.
      </p>
    </section>
  );
}
function GoalOption({
  campaign: c,
  cards,
  budget,
  selected,
  spent,
  entries,
  effectiveKurus,
  qualifiedCount,
  choose,
  remove,
}: {
  campaign: Campaign;
  cards: ReturnType<typeof eligibleCards>;
  budget: number;
  selected?: PlanReservation;
  spent: number;
  entries: CampaignProgress["entries"];
  effectiveKurus: number;
  qualifiedCount: number;
  choose: (r: PlanReservation) => void;
  remove: () => void;
}) {
  const [cardId, setCardId] = useState(selected?.cardId ?? cards[0]!.id);
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const card = cards.find((x) => x.id === cardId) ?? cards[0]!;
  const tracked = { effectiveKurus, qualifyingTransactions: qualifiedCount };
  void entries;
  const t = campaignTargets(c, card, Math.max(0, budget), tracked.effectiveKurus);
  const target = selected?.amountKurus ?? t.suggestedKurus;
  return (
    <article className={`goal-option ${selected ? "is-selected" : ""}`}>
      <div className="goal-option-top">
        <CardLabel card={card} />
        <span className="pill">
          {selected ? "Planında" : c.scenarioOnly ? "Koşula bağlı" : "Alternatif"}
        </span>
      </div>
      <h3>{c.title}</h3>
      {cards.length > 1 && (
        <label>
          Kullanacağın kart
          <select value={cardId} onChange={(e) => setCardId(e.target.value)}>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="goal-metrics">
        <div>
          <small>İlk net ödül için</small>
          <b>{formatKurus(t.firstKurus)}</b>
        </div>
        <div>
          <small>Kalan bütçeyle net kazanç</small>
          <b className="pos">{formatKurus(t.rewardKurus)}</b>
        </div>
        <div>
          <small>Üst ödül harcama hedefi</small>
          <b>{formatKurus(t.fullKurus)}</b>
        </div>
      </div>
      <p className="small">
        {c.requiredTransactions
          ? `En az ${c.requiredTransactions} ayrı işlem × ${formatKurus(c.transactionMinKurus ?? 0)}${c.separateDays ? ", farklı günlerde" : ""}. `
          : ""}
        {t.transactions !== null
          ? `Bütçeye sığan ${t.transactions} işlem; her biri en az ${formatKurus(c.minSpendKurus)}. `
          : ""}
        {t.budgetGapKurus > 0
          ? `İlk eşik kalan bütçeyi ${formatKurus(t.budgetGapKurus)} aşıyor.`
          : "Bütçeni artırmadan seçim yapabilirsin."}
      </p>
      <details>
        <summary>Kampanya koşullarını incele</summary>
        <p>{c.summary}</p>
        {c.scenarioHint && <p>{c.scenarioHint}</p>}
        <p>{c.joinHint}</p>
        <p>
          {c.requiresJoin
            ? "Banka üzerinden katılım gerekir."
            : "Katılım koşulunu kaynaktan kontrol et."}{" "}
          Bitiş: {c.endsAt}. Katılım ücreti net tutardan düşülür.
        </p>
        <a href={c.url} target="_blank" rel="noreferrer">
          Banka kaynağından teyit et ↗
        </a>
      </details>
      {c.scenarioOnly && (
        <label className="small">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />{" "}
          Mağaza, yaş ve müşteri koşullarının bana uyduğunu kontrol ettim.
        </label>
      )}
      <div className="row-actions">
        <button
          className="btn btn-soft"
          disabled={!!c.scenarioOnly && !confirmed}
          onClick={() => choose({ campaignId: c.id, cardId, amountKurus: t.firstKurus })}
        >
          İlk ödülü hedefle
        </button>
        <button
          className="btn btn-primary"
          disabled={t.budgetGapKurus > 0 || (!!c.scenarioOnly && !confirmed)}
          onClick={() => choose({ campaignId: c.id, cardId, amountKurus: t.suggestedKurus })}
        >
          Bütçeme göre seç
        </button>
      </div>
      <details>
        <summary>Kendi bütçe payımı belirle</summary>
        <label>
          Ayrılacak tutar (₺)
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <button
          className="btn btn-soft"
          onClick={() => {
            const k = parseTlInput(amount);
            if (k && (!c.scenarioOnly || confirmed))
              choose({ campaignId: c.id, cardId, amountKurus: k });
          }}
        >
          Bu tutarı seç
        </button>
      </details>
      {selected && (
        <div className="goal-progress">
          <b>
            {formatKurus(spent)} kaydedildi / {formatKurus(target)} hedef
          </b>
          {spent > target && (
            <p className="small">
              Kaydedilen harcama plan payını {formatKurus(spent - target)} aşıyor.
            </p>
          )}
          <progress max={target} value={Math.min(tracked.effectiveKurus, target)} />
          {tracked.qualifyingTransactions !== null && (
            <p className="small">{tracked.qualifyingTransactions} tutar eşiğini karşılayan işlem</p>
          )}
          <p className="small">
            Hedefe kalan {formatKurus(Math.max(0, target - tracked.effectiveKurus))} · İlk ödüle
            kalan {formatKurus(t.missingFirstKurus)}
          </p>
          <div className="row-actions">
            <Link className="btn btn-primary" href={`/kampanyalar?campaign=${c.id}`}>
              Katılım ve harcama takibine git ↗
            </Link>
            <button className="btn btn-ghost" onClick={remove}>
              Plandan çıkar
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
