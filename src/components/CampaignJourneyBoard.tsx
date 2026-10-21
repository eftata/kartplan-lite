import { useState } from "react";
import { useJourney } from "../lib/journeyStore";
import { useSession } from "../lib/store";
import { usePath, Link, navigate } from "../lib/router";
import { startTracking, addJourneyEntry } from "../lib/data";
import { campaignTargets } from "../lib/campaignTargets";
import { entryProblem, nextJourneyProgress, type JourneyRow } from "../lib/campaignJourney";
import { planWithReservations } from "../lib/planReservations";
import { formatKurus, parseTlInput } from "../lib/money";
import { categoryName, CATEGORIES } from "../lib/categories";
import { CardLabel } from "./MiniCard";
import type { CampaignEntry } from "../lib/types";

const STAGES = [
  { id: "eligible", label: "Sana uygun" },
  { id: "joined", label: "Katıldıkların" },
  { id: "active", label: "Devam eden" },
  { id: "completed", label: "Tamamlanan" },
  { id: "all", label: "Tümü" },
];
export function CampaignJourneyBoard() {
  const { rows, loading, error } = useJourney();
  const { profile } = useSession();
  const { search } = usePath();
  const selected = search.get("campaign");
  const requested = search.get("stage") ?? "eligible";
  const stage = STAGES.some((s) => s.id === requested) ? requested : "eligible";
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const filtered = rows
    .filter(
      (r) =>
        (!selected || r.campaign.id === selected) &&
        (!category || r.campaign.category === category) &&
        (!query ||
          `${r.campaign.title} ${r.cards.map((c) => c.name).join(" ")}`
            .toLocaleLowerCase("tr")
            .includes(query.toLocaleLowerCase("tr"))) &&
        (selected ||
          stage === "all" ||
          (stage === "joined" && r.enrollment) ||
          (stage === "eligible" && r.state === "eligible") ||
          r.state === stage),
    )
    .sort((a, b) => {
      const ab = a.campaign.category === "tumu" ? 0 : (profile.spend[a.campaign.category] ?? 0);
      const bb = b.campaign.category === "tumu" ? 0 : (profile.spend[b.campaign.category] ?? 0);
      return Number(bb > 0) - Number(ab > 0) || a.campaign.endsAt.localeCompare(b.campaign.endsAt);
    });
  return (
    <section className="journey-board" id="takip">
      <div className="journey-flow">
        <span>
          <b>01</b> Uygun kampanyanı seç
        </span>
        <i>→</i>
        <span>
          <b>02</b> Koşulları onayla ve katıl
        </span>
        <i>→</i>
        <span>
          <b>03</b> Uygun harcamayı kaydet
        </span>
        <i>→</i>
        <span>
          <b>04</b> Hedefi tamamla, kazan
        </span>
      </div>
      <div className="journey-tabs" role="group" aria-label="Kampanya aşaması">
        {STAGES.map((s) => (
          <button
            className={stage === s.id && !selected ? "active" : ""}
            aria-pressed={stage === s.id && !selected}
            key={s.id}
            onClick={() => navigate(`/kampanyalar?stage=${s.id}`)}
          >
            {s.label}{" "}
            <b>
              {
                rows.filter(
                  (r) =>
                    s.id === "all" ||
                    (s.id === "joined" && r.enrollment) ||
                    (s.id === "eligible" && r.state === "eligible") ||
                    r.state === s.id,
                ).length
              }
            </b>
          </button>
        ))}
      </div>
      <div className="journey-tools">
        <input
          aria-label="Takip kampanyası ara"
          type="search"
          placeholder="Kampanya veya kart ara…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Takip sektörü"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Tüm sektörler</option>
          {CATEGORIES.map((c) => (
            <option value={c.slug} key={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <Link href="/plan">Bütçe dağılımını düzenle ↗</Link>
      </div>
      {selected && (
        <p>
          <Link href="/kampanyalar?stage=all">← Bütün kampanyalarına dön</Link>
        </p>
      )}
      {loading ? (
        <p role="status">Katılım ve ilerleme bilgilerin yükleniyor…</p>
      ) : error ? (
        <p role="alert">Takip kayıtları yüklenemedi. Yeniden dene.</p>
      ) : !filtered.length ? (
        <div className="empty">
          <h3>Bu aşamada kampanyan yok</h3>
          <p>Önce kartlarını ve sektör bütçeni belirle; ardından uygun kampanyayı takibe al.</p>
          <Link href="/kartlarim">Kartlarım ↗</Link> ·{" "}
          <Link href="/harcama">Harcama sınırlarım ↗</Link> ·{" "}
          <Link href="/kampanyalar?stage=all">Tüm aşamaları göster ↗</Link>
        </div>
      ) : (
        <div className="journey-card-grid">
          {filtered.map((row) => (
            <JourneyCard key={row.campaign.id} row={row} />
          ))}
        </div>
      )}
      <p className="small muted">
        Bu listede kart uygunluğu ve sayısal kuralı belirlenmiş kampanyalar bulunur. Mağaza, müşteri
        kitlesi ve POS koşullarını katılırken teyit et. Hesaplama kuralı henüz bulunmayan diğer
        banka fırsatları aşağıda görünür.
      </p>
    </section>
  );
}
function JourneyCard({ row }: { row: JourneyRow }) {
  const { campaign: c, enrollment, progress: p } = row;
  const { user, profile, myCards, planCampaigns, today } = useSession();
  const { enrollments } = useJourney();
  const season = today.slice(0, 7);
  const savedChoice =
    profile.planMonth === season
      ? profile.planChoices?.find((x) => x.campaignId === c.id)
      : undefined;
  const [cardId, setCardId] = useState(
    enrollment?.cardId ?? savedChoice?.cardId ?? row.cards[0]?.id ?? "",
  );
  const card = row.cards.find((x) => x.id === cardId) ?? row.cards[0];
  const [mode, setMode] = useState<"first" | "budget" | "plan">(savedChoice ? "plan" : "first");
  const [conditions, setConditions] = useState(false);
  const [bankJoined, setBankJoined] = useState(false);
  const [joinDay, setJoinDay] = useState(today);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState(today);
  const [merchant, setMerchant] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const other = enrollments.filter((e) => e.campaignId !== c.id);
  const budget = c.category === "tumu" ? 0 : (profile.spend[c.category] ?? 0);
  const used = other
    .filter((e) => e.category === c.category)
    .reduce((s, e) => s + e.targetKurus, 0);
  const available = Math.max(0, budget - used);
  const targetInfo = card ? campaignTargets(c, card, available) : null;
  const target =
    mode === "plan" && savedChoice && savedChoice.cardId === card?.id
      ? savedChoice.amountKurus
      : mode === "budget"
        ? (targetInfo?.suggestedKurus ?? 0)
        : (targetInfo?.firstKurus ?? 0);
  async function enroll() {
    if (!card || !conditions || (c.requiresJoin && !bankJoined)) return;
    setMessage("");
    setBusy(true);
    try {
      const next = [
        ...other.map((e) => ({
          campaignId: e.campaignId,
          cardId: e.cardId,
          amountKurus: e.targetKurus,
        })),
        { campaignId: c.id, cardId: card.id, amountKurus: target },
      ];
      const check = planWithReservations(
        {
          cards: myCards,
          campaigns: planCampaigns,
          spend: profile.spend,
          joined: profile.joined,
          today,
        },
        next,
      );
      if (check.issues.length) throw new Error(check.issues.join(" "));
      const draftChoices =
        profile.planMonth === season
          ? (profile.planChoices ?? []).filter(
              (r) => !next.some((e) => e.campaignId === r.campaignId),
            )
          : [];
      const withDrafts = planWithReservations(
        {
          cards: myCards,
          campaigns: planCampaigns,
          spend: profile.spend,
          joined: profile.joined,
          today,
        },
        [...next, ...draftChoices],
      );
      await startTracking(
        user.uid,
        {
          id: `${season}_${c.id}`,
          season,
          campaignId: c.id,
          cardId: card.id,
          category: c.category as "market",
          targetKurus: target,
          joinDay,
          conditionsAccepted: true,
          bankJoined: c.requiresJoin ? bankJoined : false,
        },
        withDrafts.accepted,
      );
      setMessage(
        "Katılım kaydedildi ve bütçe payın planına eklendi. Uygun harcamalarını burada takip edebilirsin.",
      );
      navigate(`/kampanyalar?campaign=${c.id}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Katılım kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }
  async function record() {
    if (!enrollment || !card) return;
    const amountKurus = parseTlInput(amount) ?? 0;
    const entry: CampaignEntry = {
      amountKurus,
      day,
      merchant: merchant.trim().toLocaleLowerCase("tr"),
      conditionsConfirmed: confirmed,
    };
    const problem = entryProblem(c, enrollment, entry, p, today);
    if (problem) {
      setMessage(problem);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await addJourneyEntry(user.uid, c, card, season, entry, today);
      if (nextJourneyProgress(c, card, enrollment, p, entry).completed)
        navigate(`/kampanyalar?campaign=${c.id}`);
      setAmount("");
      setConfirmed(false);
      setMessage("Uygun harcama eklendi. Hedef tamamlandığında kazanım otomatik güncellenir.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Harcama kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }
  const stateLabel = {
    eligible: "Katılım bekliyor",
    joined: "Katıldın · ilk işlemi bekliyor",
    active: "Hedef ilerliyor",
    completed: "Hedef tamamlandı",
    expired: "Dönemi sona erdi",
  }[row.state];
  return (
    <article className={`journey-card journey-card-${row.state}`} id={`campaign-${c.id}`}>
      <div className="journey-card-top">
        <CardLabel card={card} />
        <span className={`journey-state ${row.state}`}>{stateLabel}</span>
      </div>
      <span className="kicker">
        {categoryName(c.category)} · {c.endsAt} son gün
      </span>
      <h2>{c.title}</h2>
      <p className="journey-card-description">{c.summary}</p>
      <div className="journey-card-metrics">
        <div>
          <small>{enrollment ? "Seçtiğin harcama hedefi" : "İlk net ödül için harcama"}</small>
          <b>{formatKurus(enrollment?.targetKurus ?? targetInfo?.firstKurus ?? 0)}</b>
        </div>
        <div>
          <small>
            {row.state === "completed"
              ? "Tamamlanan kazanım"
              : enrollment
                ? "Hedef tamamlanınca"
                : "Bu hedefte net kazanım"}
          </small>
          <b className="pos">
            {formatKurus(
              enrollment
                ? row.state === "completed"
                  ? row.earnedKurus
                  : row.potentialKurus
                : card
                  ? campaignTargets(c, card, target).rewardKurus
                  : 0,
            )}
          </b>
        </div>
      </div>
      <details className="journey-conditions">
        <summary>Katılım, mağaza ve işlem koşulları</summary>
        <p>{c.scenarioHint}</p>
        <p>{c.joinHint || "Kampanya kaynağındaki koşulları kontrol et."}</p>
        {c.requiredTransactions && (
          <p>
            En az {c.requiredTransactions} ayrı {formatKurus(c.transactionMinKurus ?? 0)} işlem
            {c.separateDays ? ", farklı günlerde" : ""} gerekir.
          </p>
        )}
        {c.repeatReward && (
          <p>
            Her uygun işlem en az {formatKurus(c.minSpendKurus)} olmalı.{" "}
            {c.skipTransactions ? `İlk ${c.skipTransactions} uygun işlem ödülsüzdür.` : ""}
          </p>
        )}
        <a href={c.url} target="_blank" rel="noreferrer">
          Bankanın sitesinde teyit et ↗
        </a>
      </details>
      {!enrollment ? (
        <div className="journey-enroll">
          <label>
            Kullanacağın kart
            <select
              value={cardId}
              onChange={(e) => {
                setCardId(e.target.value);
                setMode("first");
              }}
            >
              {row.cards.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Hedefin
            <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="first">
                İlk net ödülü hedefle · {formatKurus(targetInfo?.firstKurus ?? 0)}
              </option>
              <option value="budget">
                Kalan bütçeme göre · {formatKurus(targetInfo?.suggestedKurus ?? 0)}
              </option>
              {savedChoice && savedChoice.cardId === cardId && (
                <option value="plan">
                  Planımda seçtiğim tutar · {formatKurus(savedChoice.amountKurus)}
                </option>
              )}
            </select>
          </label>
          <p className="small muted">
            Sektör sınırın {formatKurus(budget)} · Diğer katılımlardan sonra{" "}
            {formatKurus(available)} ayrılabilir.
          </p>
          <label className="checkline">
            <input
              type="checkbox"
              checked={conditions}
              onChange={(e) => setConditions(e.target.checked)}
            />{" "}
            Kart, yaş/müşteri, mağaza/POS ve ödeme koşullarının bana uyduğunu kontrol ettim.
          </label>
          {c.requiresJoin ? (
            <>
              <label className="checkline">
                <input
                  type="checkbox"
                  checked={bankJoined}
                  onChange={(e) => setBankJoined(e.target.checked)}
                />{" "}
                Bankanın uygulamasından/SMS ile kampanyaya katıldım.
              </label>
              <label>
                Bankada katıldığın gün
                <input
                  type="date"
                  min={c.startsAt > `${season}-01` ? c.startsAt : `${season}-01`}
                  max={today}
                  value={joinDay}
                  onChange={(e) => setJoinDay(e.target.value)}
                />
              </label>
            </>
          ) : (
            <p className="small">
              Bu kuralda bankadan ayrıca katılım zorunluluğu yok; uygulamada takibe alman yeterli.
            </p>
          )}
          <button
            className="btn btn-primary"
            disabled={
              busy ||
              !card ||
              !conditions ||
              (c.requiresJoin && !bankJoined) ||
              target > available ||
              target <= 0
            }
            onClick={enroll}
          >
            {busy ? "Kaydediliyor…" : "Bu hedefle katıl ve takibe al"}
          </button>
          {target > available && (
            <p className="small">
              Hedef kalan bütçeyi aşıyor. <Link href="/plan">Dağılımını gözden geçir ↗</Link>
            </p>
          )}
        </div>
      ) : (
        <div className="journey-tracking">
          <div className="journey-tracking-head">
            <b>%{Math.round(row.ratio * 100)} tamamlandı</b>
            <span>{p?.qualifiedCount ?? 0} uygun işlem</span>
          </div>
          <progress
            max={enrollment.targetKurus}
            value={Math.min(p?.effectiveKurus ?? 0, enrollment.targetKurus)}
          />
          <p className="small">
            Hedefe kalan{" "}
            {formatKurus(Math.max(0, enrollment.targetKurus - (p?.effectiveKurus ?? 0)))}
            {(p?.totalKurus ?? 0) > enrollment.targetKurus
              ? ` · Kayıtlı harcama hedef payını ${formatKurus((p?.totalKurus ?? 0) - enrollment.targetKurus)} aşıyor.`
              : ""}
          </p>
          {row.state === "completed" ? (
            <div className="journey-complete">
              <b>✓ {formatKurus(row.earnedKurus)} kazanım özetine eklendi</b>
              <p>Seçtiğin hedef tamamlandı. Banka yüklemesini ayrıca teyit et.</p>
              <Link className="btn btn-soft" href="/lig">
                Tamamlama görevini ve lig puanını gör ↗
              </Link>
            </div>
          ) : row.state === "expired" ? (
            <p>Kampanya sona erdi. Yeni işlem kaydedilmez; geçmiş kayıtların korunur.</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void record();
              }}
            >
              <h3>Uygun harcama kaydet</h3>
              <div className="journey-form-row">
                <label>
                  İşlem tutarı (₺)
                  <input
                    required
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </label>
                <label>
                  İşlem tarihi
                  <input
                    required
                    type="date"
                    min={
                      c.requiresJoin
                        ? enrollment.joinDay
                        : c.startsAt > `${season}-01`
                          ? c.startsAt
                          : `${season}-01`
                    }
                    max={today < c.endsAt ? today : c.endsAt}
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Mağaza / işyeri
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="Örn. Migros Ataşehir"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                />
              </label>
              <label className="checkline">
                <input
                  required
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />{" "}
                Bu işlemi seçili kartla yaptım; kampanyanın mağaza, POS ve ödeme yöntemi koşullarını
                sağlıyor.
              </label>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Kontrol edilip kaydediliyor…" : "Uygunluğu kontrol et ve kaydet"}
              </button>
            </form>
          )}
          {!!p?.entries.length && (
            <details className="journey-history">
              <summary>İşlem geçmişi ({p.entries.length})</summary>
              <ul>
                {p.entries.map((entry, i) => (
                  <li key={i}>
                    <span>
                      {entry.day} · {entry.merchant || "Eski kayıt · koşul teyidi yok"}
                    </span>
                    <b>{formatKurus(entry.amountKurus)}</b>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="journey-card-links">
            <Link href="/plan">Plan dağılımı ↗</Link>
            <Link href="/lig">Görevler ve lig ↗</Link>
          </div>
        </div>
      )}
      {message && (
        <p className="journey-message" role="status">
          {message}
        </p>
      )}
    </article>
  );
}
