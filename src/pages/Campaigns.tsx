import { useState } from "react";
import { useSession } from "../lib/store";
import { useJourney } from "../lib/journeyStore";
import { useCampaignFeed } from "../lib/useCampaignFeed";
import { CampaignCard } from "../components/CampaignCard";
import { Link } from "../lib/router";
import { selectCampaign } from "../lib/planner";
import { saveUser } from "../lib/data";
import { eligibleCards } from "../lib/optimizer";
import { categoryName } from "../lib/categories";
import { rewardText } from "../components/CampaignItem";
import { mixCampaigns } from "../lib/campaignOrder";
import type { ExternalCampaign } from "../lib/externalCampaigns";
export function Campaigns() {
  const { user, profile, myCards, planCampaigns, today } = useSession();
  const { enrollments } = useJourney();
  const { external, loading } = useCampaignFeed(today);
  const season = today.slice(0, 7);
  const choices = profile.planMonth === season ? (profile.planChoices ?? []) : [];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [onlyMine, setOnlyMine] = useState(true);
  const [limit, setLimit] = useState(18);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const current = external.filter((c) => !c.endsAt || c.endsAt >= today);
  const extras: ExternalCampaign[] = planCampaigns
    .filter(
      (c) =>
        !c.demo &&
        c.status === "yayinda" &&
        c.startsAt <= today &&
        c.endsAt >= today &&
        !current.some((e) => e.sourceUrl === c.url),
    )
    .map((c) => ({
      id: c.id,
      title: c.title,
      program: c.program,
      category: categoryName(c.category),
      summary: c.summary,
      benefit: rewardText(c),
      endsAt: c.endsAt,
      sourceUrl: c.url,
    }));
  const all = [...current, ...extras];
  const programs = new Set(myCards.map((k) => k.program));
  const rows = mixCampaigns(
    all.filter(
      (c) =>
        (!onlyMine || programs.has(c.program)) &&
        (!category || c.category === category) &&
        (!query ||
          `${c.title} ${c.summary}`
            .toLocaleLowerCase("tr")
            .includes(query.toLocaleLowerCase("tr"))),
    ),
  );
  async function choose(id: string) {
    const c = planCampaigns.find((c) => c.id === id);
    if (!c) return;
    setBusy(id);
    setMessage("");
    try {
      const locked = enrollments.some((e) => e.campaignId === id);
      if (locked) return;
      const next = choices.some((r) => r.campaignId === id)
        ? choices.filter((r) => r.campaignId !== id)
        : selectCampaign(c, myCards, profile.spend, planCampaigns, choices, today);
      await saveUser(user.uid, { planMonth: season, planChoices: next });
      setMessage(
        next.some((r) => r.campaignId === id)
          ? "Kampanya planına eklendi. Uygun kartın ve harcama payın otomatik atandı."
          : "Kampanya plan seçiminden kaldırıldı.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <div className="discovery-member-heading">
        <div>
          <span className="kicker">Keşfet ve karşılaştır</span>
          <h1>Bir sonraki fırsatını bul.</h1>
          <p>
            Kampanyaları burada keşfet. Hesaplanabilen bir kampanyayı seçtiğinde uygun kartın ve
            bütçe payın planına otomatik eklensin.
          </p>
        </div>
        <Link className="btn btn-primary" href="/plan?adim=3">
          Seçimlerimle plan oluştur →
        </Link>
      </div>
      <div className="browse-plan-note">
        <span>
          <b>{choices.length} kampanya</b> bu ayın planında
        </span>
        <Link href="/plan?adim=3">Planımı düzenle ↗</Link>
        <Link href="/takip">Katılım ve harcama takibine git ↗</Link>
      </div>
      <div className="browse-controls">
        <input
          type="search"
          aria-label="Kampanya ara"
          placeholder="Marka, kampanya veya fırsat ara…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(18);
          }}
        />
        <select
          aria-label="Sektör"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setLimit(18);
          }}
        >
          <option value="">Tüm sektörler</option>
          {[...new Set(all.map((c) => c.category))]
            .sort((a, b) => a.localeCompare(b, "tr"))
            .map((c) => (
              <option key={c}>{c}</option>
            ))}
        </select>
        <label className="checkline">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => {
              setOnlyMine(e.target.checked);
              setLimit(18);
            }}
          />{" "}
          Kart programlarımla ilişkili
        </label>
      </div>
      {message && (
        <div className="planner-message" role="status">
          {message} <Link href="/plan?adim=3">Planıma git ↗</Link>
        </div>
      )}
      <p className="muted small">
        {loading ? "Kampanyalar güncelleniyor…" : `${rows.length} güncel fırsat`} · Kampanya seçimi,
        bankadaki katılım yerine geçmez.
      </p>
      <div className="discovery-grid member-campaign-grid">
        {rows.slice(0, limit).map((c) => {
          const rule = planCampaigns.find((r) => r.id === c.id || r.url === c.sourceUrl);
          const compatible = rule && eligibleCards(rule, myCards).length > 0;
          const selected = rule && choices.find((r) => r.campaignId === rule.id);
          const tracked = rule && enrollments.some((e) => e.campaignId === rule.id);
          return (
            <article className={`browse-campaign ${selected ? "in-plan" : ""}`} key={c.id}>
              <CampaignCard campaign={c} today={today} />
              <div className="browse-action">
                {tracked ? (
                  <Link className="btn btn-soft" href={`/takip?campaign=${rule!.id}`}>
                    Takip ekranını aç →
                  </Link>
                ) : compatible ? (
                  <button
                    className={`btn ${selected ? "btn-soft" : "btn-primary"}`}
                    disabled={!!busy}
                    onClick={() => choose(rule.id)}
                  >
                    {busy === rule.id
                      ? "Kaydediliyor…"
                      : selected
                        ? "✓ Planımda · seçimi kaldır"
                        : "Planıma ekle · kartı otomatik ata"}
                  </button>
                ) : (
                  <>
                    <span className="small muted">
                      {rule
                        ? "Planlamak için uygun kartını ekle."
                        : "Sayısal hesaplama kuralı henüz yok; koşulları inceleyebilirsin."}
                    </span>
                    {rule && <Link href="/kartlarim">Kartlarımı düzenle ↗</Link>}
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {rows.length > limit && (
        <button className="btn btn-soft" onClick={() => setLimit((n) => n + 18)}>
          Daha fazla fırsat göster ({rows.length - limit})
        </button>
      )}
      {!loading && !rows.length && (
        <div className="empty">
          Bu filtrelerde kampanya yok. Tüm programları görmek için kart filtresini kaldır.
        </div>
      )}
      <Link className="planner-home-link" href="/ana-sayfa">
        ← Ana sayfaya dön
      </Link>
    </>
  );
}
