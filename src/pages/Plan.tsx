import { useState } from "react";
import { useSession } from "../lib/store";
import { useJourney } from "../lib/journeyStore";
import { saveUser } from "../lib/data";
import { Link, usePath } from "../lib/router";
import { SpendForm } from "../components/SpendForm";
import { CardLabel } from "../components/MiniCard";
import { categoryName, CATEGORIES } from "../lib/categories";
import { formatKurus } from "../lib/money";
import { eligibleCards, isActiveThisMonth, optimize, netCampaignReward } from "../lib/optimizer";
import { campaignTargets } from "../lib/campaignTargets";
import { selectCampaign, selectedReward } from "../lib/planner";
import { planWithReservations, type PlanReservation } from "../lib/planReservations";
export function Plan() {
  const { user, profile, myCards, planCampaigns: campaigns, today } = useSession();
  const { enrollments } = useJourney();
  const { search } = usePath();
  const season = today.slice(0, 7);
  const [step, setStep] = useState(
    search.get("adim") === "3" && profile.planMonth === season && profile.planChoices?.length
      ? 3
      : 1,
  );
  const [spend, setSpend] = useState(profile.spend);
  const [cardIds, setCardIds] = useState(profile.cardIds);
  const [choices, setChoices] = useState<PlanReservation[]>(
    profile.planMonth === season ? (profile.planChoices ?? []) : [],
  );
  const [targetModes, setTargetModes] = useState<Record<string, "first" | "budget">>({});
  const [category, setCategory] = useState("");
  const [program, setProgram] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(
    search.get("adim") === "3" && profile.planMonth === season && !!profile.planChoices?.length,
  );
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const cards = myCards.filter((k) => cardIds.includes(k.id));
  const required = enrollments.map((e) => ({
    campaignId: e.campaignId,
    cardId: e.cardId,
    amountKurus: e.targetKurus,
  }));
  const locked = new Set(required.map((r) => r.campaignId));
  const allChoices = [...required, ...choices.filter((r) => !locked.has(r.campaignId))];
  const budget = Object.values(spend).reduce((s, v) => s + (v ?? 0), 0);
  const rows = campaigns.filter(
    (c) =>
      !c.demo &&
      c.category !== "tumu" &&
      isActiveThisMonth(c, today) &&
      c.startsAt <= today &&
      eligibleCards(c, cards).length &&
      (!category || c.category === category) &&
      (!program || eligibleCards(c, cards).some((k) => k.id === program)),
  );
  function go(next: number) {
    setMessage("");
    setStep(next);
    setSaved(false);
    window.scrollTo({ top: 0 });
  }
  function toggle(id: string, preferred?: string) {
    const c = campaigns.find((c) => c.id === id)!;
    if (locked.has(id)) return;
    try {
      setChoices(
        allChoices.some((r) => r.campaignId === id) && !preferred
          ? choices.filter((r) => r.campaignId !== id)
          : selectCampaign(
              c,
              cards,
              spend,
              campaigns,
              allChoices,
              today,
              preferred,
              targetModes[id] ?? "first",
            ),
      );
      setMessage("");
      setSaved(false);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function recommend() {
    const plan = optimize({
      cards,
      spend,
      campaigns: campaigns.filter((c) => !c.demo),
      joined: profile.joined,
      today,
    });
    let next = [...required];
    for (const o of plan.outcomes) {
      if (next.some((r) => r.campaignId === o.campaign.id)) continue;
      try {
        next = selectCampaign(o.campaign, cards, spend, campaigns, next, today, o.cardId, "budget");
      } catch {
        /* Keep suggestions within the remaining budget. */
      }
    }
    setChoices(next);
    setMessage("Bütçeye sığan genel kampanyalar önerildi. İstersen seçimlerini değiştirebilirsin.");
  }
  async function save() {
    const check = planWithReservations(
      { cards, spend, campaigns, joined: profile.joined, today },
      allChoices,
    );
    if (check.issues.length) {
      setMessage(check.issues.join(" "));
      return;
    }
    if (!check.accepted.length) {
      setMessage("Önce en az bir kampanya seç.");
      return;
    }
    setBusy(true);
    try {
      await saveUser(user.uid, { spend, planMonth: season, planChoices: check.accepted });
      setSaved(true);
      setMessage(
        "Planın kaydedildi. Katılım ve uygun harcama takibi için takip ekranına geçebilirsin.",
      );
    } catch {
      setMessage("Plan kaydedilemedi. Yeniden dene.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="planner">
      <div className="planner-heading">
        <span className="kicker">Kişisel plan stüdyon</span>
        <h1>Önce seç. Sonra ne yapacağını bil.</h1>
        <p>
          Bu ekran bütçeni kartlarına dağıtır. Gerçek katılım ve harcamalarını{" "}
          <Link href="/takip">Takip</Link> bölümünde yönetirsin.
        </p>
      </div>
      <ol className="planner-steps">
        {["Bütçe ve kartlar", "Kampanya seçimi", "Plan özeti"].map((label, i) => (
          <li key={label} className={step === i + 1 ? "current" : step > i + 1 ? "done" : ""}>
            <button
              onClick={() => {
                if (i === 0 || (cards.length && budget > 0)) go(i + 1);
              }}
              aria-current={step === i + 1 ? "step" : undefined}
            >
              <span>{step > i + 1 ? "✓" : `0${i + 1}`}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>
      {step === 1 ? (
        <div className="planner-setup">
          <div>
            <div className="section-heading">
              <div>
                <span className="kicker">01 / Aylık sınırın</span>
                <h2>Bu ay nerede, ne kadar harcayacaksın?</h2>
              </div>
              <b>{formatKurus(budget)}</b>
            </div>
            <SpendForm value={spend} onChange={setSpend} />
          </div>
          <aside className="planner-wallet">
            <span className="kicker">Kullanacağın kartlar</span>
            <h2>Hangi kartları plana dahil edelim?</h2>
            <p>Kampanya seçtiğinde uygun kart bu kartlar arasından otomatik atanır.</p>
            {myCards.map((card) => (
              <label key={card.id} className="wallet-choice">
                <input
                  type="checkbox"
                  checked={cardIds.includes(card.id)}
                  disabled={enrollments.some((e) => e.cardId === card.id)}
                  onChange={(e) => {
                    setCardIds((old) =>
                      e.target.checked ? [...old, card.id] : old.filter((id) => id !== card.id),
                    );
                    if (!e.target.checked)
                      setChoices((old) => old.filter((r) => r.cardId !== card.id));
                    setSaved(false);
                  }}
                />
                <CardLabel card={card} />
              </label>
            ))}
            <Link href="/kartlarim">Kart ekle veya cüzdanını düzenle ↗</Link>
            <div className="planner-next">
              <button
                className="btn btn-primary"
                disabled={!cards.length || budget <= 0}
                onClick={() => go(2)}
              >
                Kampanyaları seç →
              </button>
              {!cards.length && <p>Önce sahip olduğun en az bir kartı ekle.</p>}
            </div>
          </aside>
        </div>
      ) : step === 2 ? (
        <>
          <div className="planner-selection-head">
            <div>
              <h2>Kullanmak istediğin kampanyaları seç.</h2>
              <p>
                Kart ve harcama payı otomatik atanır. Aynı kategoride farklı bankaların
                kampanyalarını birlikte seçebilirsin.
              </p>
            </div>
            <button className="btn btn-soft" onClick={recommend}>
              Bütçeme göre öner ✦
            </button>
          </div>
          <div className="planner-filters">
            <label>
              Kart
              <select value={program} onChange={(e) => setProgram(e.target.value)}>
                <option value="">Tüm kartlarım</option>
                {cards.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sektör
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Tüm sektörler</option>
                {CATEGORIES.map((c) => (
                  <option value={c.slug} key={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <span>
              {allChoices.length} seçili ·{" "}
              {formatKurus(selectedReward(allChoices, campaigns, cards))} net potansiyel
            </span>
          </div>
          <div className="planner-options">
            {rows.map((c) => {
              const selected = allChoices.find((r) => r.campaignId === c.id);
              const own = eligibleCards(c, cards);
              const card = own.find((k) => k.id === selected?.cardId) ?? own[0]!;
              const used = allChoices
                .filter(
                  (r) =>
                    r.campaignId !== c.id &&
                    campaigns.find((x) => x.id === r.campaignId)?.category === c.category,
                )
                .reduce((s, r) => s + r.amountKurus, 0);
              const available =
                c.category === "tumu" ? 0 : Math.max(0, (spend[c.category] ?? 0) - used);
              const t = campaignTargets(c, card, available);
              const amount =
                (targetModes[c.id] ?? "first") === "first" ? t.firstKurus : t.suggestedKurus;
              const isLocked = locked.has(c.id);
              return (
                <article
                  className={`planner-option ${selected ? "selected" : ""} ${search.get("campaign") === c.id ? "highlighted" : ""}`}
                  key={c.id}
                >
                  <div className="planner-option-top">
                    <CardLabel card={card} />
                    <span>{selected ? "✓ Planında" : categoryName(c.category)}</span>
                  </div>
                  <h3>{c.title}</h3>
                  <p>{c.summary}</p>
                  <div className="planner-numbers">
                    <div>
                      <small>{selected ? "Ayrılan harcama" : "Bütçene göre harcama"}</small>
                      <b>{formatKurus(selected?.amountKurus ?? amount)}</b>
                    </div>
                    <div>
                      <small>Koşullu net ödül</small>
                      <b className="pos">
                        {formatKurus(
                          selected
                            ? netCampaignReward(c, selected.amountKurus, card)
                            : netCampaignReward(c, amount, card),
                        )}
                      </b>
                    </div>
                  </div>
                  {own.length > 1 && selected && (
                    <label>
                      Atanan kart
                      <select
                        disabled={isLocked}
                        value={card.id}
                        onChange={(e) => toggle(c.id, e.target.value)}
                      >
                        {own.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {!selected && (
                    <label>
                      Harcama payı
                      <select
                        value={targetModes[c.id] ?? "first"}
                        onChange={(e) =>
                          setTargetModes((old) => ({
                            ...old,
                            [c.id]: e.target.value as "first" | "budget",
                          }))
                        }
                      >
                        <option value="first">İlk ödül için {formatKurus(t.firstKurus)}</option>
                        <option value="budget">
                          Kalan bütçeye göre {formatKurus(t.suggestedKurus)}
                        </option>
                      </select>
                    </label>
                  )}
                  <details>
                    <summary>İşlem ve katılım koşulları</summary>
                    <p>
                      {c.joinHint} {c.scenarioHint}
                    </p>
                    {c.requiredTransactions && (
                      <p>
                        {c.requiredTransactions} ayrı işlem · işlem başına{" "}
                        {formatKurus(c.transactionMinKurus ?? 0)}
                      </p>
                    )}
                    <a href={c.url} target="_blank" rel="noreferrer">
                      Banka kaynağında teyit et ↗
                    </a>
                  </details>
                  {c.scenarioOnly && !selected && (
                    <label className="checkline">
                      <input
                        type="checkbox"
                        checked={!!confirmed[c.id]}
                        onChange={(e) =>
                          setConfirmed((old) => ({ ...old, [c.id]: e.target.checked }))
                        }
                      />{" "}
                      Mağaza ve müşteri koşulları bana uygun.
                    </label>
                  )}
                  <button
                    className={`btn ${selected ? "btn-soft" : "btn-primary"}`}
                    disabled={
                      isLocked ||
                      (!selected &&
                        (t.budgetGapKurus > 0 || (!!c.scenarioOnly && !confirmed[c.id])))
                    }
                    onClick={() => toggle(c.id)}
                  >
                    {isLocked
                      ? "Takipte · hedefi sabit"
                      : selected
                        ? "Seçimi kaldır"
                        : "Seç ve kartı otomatik ata →"}
                  </button>
                  {!selected && t.budgetGapKurus > 0 && (
                    <small className="muted">
                      Kalan {formatKurus(available)} sektör payı bu eşik için yeterli değil.
                    </small>
                  )}
                </article>
              );
            })}
          </div>
          {!rows.length && (
            <div className="empty">
              Bu kart ve sektör için hesaplanabilir kampanya bulunamadı.{" "}
              <Link href="/kampanyalar">Diğer fırsatları keşfet ↗</Link>
            </div>
          )}
          <div className="planner-footer">
            <button className="btn btn-ghost" onClick={() => go(1)}>
              ← Bütçeye dön
            </button>
            <button className="btn btn-primary" disabled={!allChoices.length} onClick={() => go(3)}>
              Plan özetini gör →
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="plan-result-hero">
            <div>
              <span className="kicker">Seçimlerin bütçene dağıtıldı</span>
              <h2>Hangi kartı, nerede kullanacağın belli.</h2>
              <p>
                {allChoices.length} kampanya · {new Set(allChoices.map((r) => r.cardId)).size} kart
                · {formatKurus(allChoices.reduce((s, r) => s + r.amountKurus, 0))} ayrılan harcama
              </p>
            </div>
            <div>
              <small>Koşullar sağlandığında net potansiyel</small>
              <strong>{formatKurus(selectedReward(allChoices, campaigns, cards))}</strong>
            </div>
          </div>
          <div className="plan-budget-breakdown">
            <div>
              <small>Aylık bütçen</small>
              <b>{formatKurus(budget)}</b>
            </div>
            <div>
              <small>Kampanya hedeflerine ayrılan</small>
              <b>{formatKurus(allChoices.reduce((s, r) => s + r.amountKurus, 0))}</b>
            </div>
            <div>
              <small>Henüz ayrılmayan bütçe</small>
              <b>
                {formatKurus(
                  Math.max(0, budget - allChoices.reduce((s, r) => s + r.amountKurus, 0)),
                )}
              </b>
            </div>
          </div>
          <div className="plan-result-list">
            {CATEGORIES.map((cat) => {
              const chosen = allChoices.filter(
                (r) => campaigns.find((c) => c.id === r.campaignId)?.category === cat.slug,
              );
              if (!chosen.length) return null;
              return (
                <section key={cat.slug}>
                  <header>
                    <h3>
                      {cat.icon} {cat.name}
                    </h3>
                    <span>{formatKurus(spend[cat.slug] ?? 0)} sektör sınırı</span>
                  </header>
                  {chosen.map((r) => {
                    const c = campaigns.find((c) => c.id === r.campaignId)!;
                    return (
                      <article key={r.campaignId}>
                        <CardLabel card={cards.find((k) => k.id === r.cardId)} />
                        <div>
                          <h4>{c.title}</h4>
                          <p>
                            {c.requiredTransactions
                              ? `${c.requiredTransactions} ayrı işlem gerekli. `
                              : c.repeatReward
                                ? `Her işlem en az ${formatKurus(c.minSpendKurus)}. `
                                : ""}
                            {c.requiresJoin
                              ? "Harcamadan önce bankadan katıl."
                              : "Mağaza ve POS koşullarını kontrol et."}
                          </p>
                        </div>
                        <div>
                          <b>{formatKurus(r.amountKurus)}</b>
                          <small>
                            +
                            {formatKurus(
                              cards.find((k) => k.id === r.cardId)
                                ? netCampaignReward(
                                    c,
                                    r.amountKurus,
                                    cards.find((k) => k.id === r.cardId)!,
                                  )
                                : 0,
                            )}{" "}
                            net ödül
                          </small>
                        </div>
                      </article>
                    );
                  })}
                </section>
              );
            })}
          </div>
          <div className="planner-footer">
            <button className="btn btn-ghost" onClick={() => go(2)}>
              ← Seçimlerimi düzenle
            </button>
            {saved ? (
              <Link className="btn btn-primary" href="/takip">
                Katılım ve harcama takibine geç →
              </Link>
            ) : (
              <button
                className="btn btn-primary"
                disabled={busy || !allChoices.length}
                onClick={save}
              >
                {busy ? "Kaydediliyor…" : "Bu planı kaydet →"}
              </button>
            )}
          </div>
          <p className="small muted">
            Kaydetmek, banka kampanyasına katılım sağlamaz. Katılımını Takip ekranında teyit
            ettikten sonra uygun harcamalarını kaydedebilirsin.
          </p>
        </>
      )}
      {message && (
        <p className="planner-message" role="status">
          {message}
        </p>
      )}
      <Link className="planner-home-link" href="/ana-sayfa">
        ← Ana sayfaya dön
      </Link>
    </section>
  );
}
