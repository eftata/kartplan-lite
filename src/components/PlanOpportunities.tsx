import { useState } from "react";
import { CampaignCard } from "./CampaignCard";
import { formatKurus, parseTlInput } from "../lib/money";
import type { PlanOpportunity } from "../lib/planOpportunities";
import type { PlanReservation } from "../lib/planReservations";

export function PlanOpportunities({
  opportunities,
  today,
  reservations,
  onReserve,
  onRemove,
  loading,
}: {
  opportunities: PlanOpportunity[];
  today: string;
  reservations: PlanReservation[];
  onReserve: (r: PlanReservation) => void;
  onRemove: (id: string) => void;
  loading: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [limit, setLimit] = useState(12);
  const rows = opportunities.filter(
    (o) =>
      (!status || o.status === status) &&
      (!query ||
        `${o.campaign.title} ${o.campaign.summary} ${o.campaign.category} ${o.cards.map((c) => c.name).join(" ")}`
          .toLocaleLowerCase("tr")
          .includes(query.toLocaleLowerCase("tr"))),
  );
  return (
    <section
      className="plan-opportunities"
      id="plan-firsatlari"
      aria-labelledby="plan-opportunities-title"
    >
      <p className="kicker">Kartlarınla ilişkili tüm güncel fırsatlar</p>
      <h2 id="plan-opportunities-title">Plan dışında kalan fırsatları da gör</h2>
      <p className="muted">
        {loading
          ? "Banka kampanyaları taranıyor…"
          : `${opportunities.length} fırsat incelendi · ${opportunities.filter((o) => o.rule).length} hesaplama kuralı mevcut`}
        . Her kampanyanın neden toplama girdiği veya girmediği aşağıda açıklanır.
      </p>
      <p className="small">
        Mağazaya veya belirli müşteri kitlesine özel bir kampanyada koşulları teyit edip bütçe
        ayırdığında senaryon yeniden hesaplanır. Ayrılan tutar aynı sektörün kalan bütçesinden
        düşülür.
      </p>
      <div className="filters">
        <input
          type="search"
          className="input"
          aria-label="Plan fırsatlarında ara"
          placeholder="Petrol Ofisi, Coffy, market…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(12);
          }}
        />
        <select
          className="input"
          aria-label="Fırsat durumu"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setLimit(12);
          }}
        >
          <option value="">Tüm fırsatlar</option>
          <option value="scenario">Bütçe ayırarak hesapla</option>
          <option value="review">Koşul / hesaplama teyidi gerekiyor</option>
          <option value="alternative">Hesaplanabilen alternatifler</option>
          <option value="planned">Plana dahil</option>
          <option value="no-budget">Sektör bütçesi yok</option>
        </select>
      </div>
      <p className="muted small" role="status">
        {rows.length} fırsat gösteriliyor
      </p>
      <div className="plan-opportunity-list">
        {rows.slice(0, limit).map((o) => (
          <article key={o.campaign.id} className="plan-opportunity">
            <div className={`opportunity-reason opportunity-${o.status}`}>
              <strong>
                {o.status === "planned"
                  ? "Plana dahil"
                  : o.status === "scenario"
                    ? "Koşulları teyit ederek hesapla"
                    : o.status === "alternative"
                      ? "Alternatif"
                      : o.status === "no-budget"
                        ? "Bütçe eşleşmedi"
                        : "Teyit gerekiyor"}
              </strong>
              <p>{o.reason}</p>
              <small>
                {o.cards.map((c) => `${c.bank} · ${c.name}`).join(" / ")}
                {o.category && ` · Sektör bütçen: ${formatKurus(o.budgetKurus)}`}
              </small>
            </div>
            {o.rule?.scenarioOnly && (
              <ScenarioEditor
                opportunity={o}
                reservation={reservations.find((r) => r.campaignId === o.campaign.id)}
                onReserve={onReserve}
                onRemove={onRemove}
              />
            )}
            <CampaignCard campaign={o.campaign} today={today} showApplication={false} />
          </article>
        ))}
      </div>
      {rows.length > limit && (
        <button type="button" className="btn btn-ghost" onClick={() => setLimit((v) => v + 12)}>
          Diğer fırsatları göster ({rows.length - limit})
        </button>
      )}
      {!loading && !rows.length && (
        <p>Bu filtrede fırsat bulunamadı. Diğer fırsat durumlarını da inceleyebilirsin.</p>
      )}
    </section>
  );
}
function ScenarioEditor({
  opportunity: o,
  reservation,
  onReserve,
  onRemove,
}: {
  opportunity: PlanOpportunity;
  reservation: PlanReservation | undefined;
  onReserve: (r: PlanReservation) => void;
  onRemove: (id: string) => void;
}) {
  const [text, setText] = useState(reservation ? String(reservation.amountKurus / 100) : "");
  const [cardId, setCardId] = useState(reservation?.cardId ?? o.cards[0]?.id ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  function apply() {
    const amount = parseTlInput(text);
    if (amount === null || amount <= 0 || amount > o.budgetKurus) {
      setError("Sektör bütçeni aşmayan geçerli bir TL tutarı gir.");
      return;
    }
    setError("");
    onReserve({ campaignId: o.campaign.id, cardId, amountKurus: amount });
  }
  return (
    <div className="scenario-editor">
      <p className="small">{o.rule?.scenarioHint}</p>
      <label className="small">
        Bu kampanyaya ayıracağım tutar (TL)
        <input
          className="input"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Örn. 6400"
        />
      </label>
      <label className="small">
        Kullanacağım kart
        <select className="input" value={cardId} onChange={(e) => setCardId(e.target.value)}>
          {o.cards.map((c) => (
            <option value={c.id} key={c.id}>
              {c.bank} · {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="small scenario-confirm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />{" "}
        Belirtilen mağaza, müşteri ve işlem koşullarını sağlıyorum.
      </label>
      <div>
        <button type="button" className="btn btn-primary" disabled={!confirmed} onClick={apply}>
          {reservation ? "Bütçe payını güncelle" : "Bu bütçeyle planı hesapla"}
        </button>
        {reservation && (
          <button type="button" className="btn btn-ghost" onClick={() => onRemove(o.campaign.id)}>
            Senaryodan çıkar
          </button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
