import { CampaignJourneyBoard } from "../components/CampaignJourneyBoard";
import { Link } from "../lib/router";
import { mixCampaigns } from "../lib/campaignOrder";
import { categoryName } from "../lib/categories";
import { useState } from "react";
import { CampaignCard } from "../components/CampaignCard";
import { CampaignItem } from "../components/CampaignItem";
import { PageHead } from "../components/Layout";
import { setJoined } from "../lib/data";
import { CAMPAIGN_SOURCES } from "../lib/sources";
import { useSession } from "../lib/store";
import { useCampaignFeed } from "../lib/useCampaignFeed";

export function Campaigns() {
  const { user, profile, myCards, campaigns, planCampaigns, today } = useSession();
  const { external, feed, loading } = useCampaignFeed(today);
  const [scope, setScope] = useState("tumu");
  const [program, setProgram] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [joinedOnly, setJoinedOnly] = useState(false);
  const [limit, setLimit] = useState(24);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const owned = new Set(myCards.map((c) => c.program));
  const current = external.filter((c) => !c.endsAt || c.endsAt >= today);
  const categories = [...new Set(current.map((c) => c.category))].sort((a, b) =>
    a.localeCompare(b, "tr"),
  );
  const needle = query.trim().toLocaleLowerCase("tr");
  const rows = mixCampaigns(
    current.filter(
      (c) =>
        (scope === "tumu" || owned.has(c.program)) &&
        (!program || c.program === program) &&
        (!category || c.category === category) &&
        (!joinedOnly || profile.joined[c.id]) &&
        (!needle ||
          `${c.title} ${c.summary} ${c.category}`.toLocaleLowerCase("tr").includes(needle)),
    ),
  );
  const managed = campaigns.filter(
    (c) =>
      !c.demo &&
      c.status === "yayinda" &&
      c.startsAt <= today &&
      c.endsAt >= today &&
      !current.some((e) => e.sourceUrl === c.url) &&
      (scope === "tumu" || owned.has(c.program)) &&
      (!category || c.category === "tumu" || categoryName(c.category) === category) &&
      (!program || program === c.program) &&
      (!needle || `${c.title} ${c.summary}`.toLocaleLowerCase("tr").includes(needle)) &&
      (!joinedOnly || profile.joined[c.id]),
  );
  async function toggle(id: string) {
    setBusy(id);
    setError("");
    try {
      await setJoined(user.uid, id, !profile.joined[id]);
    } catch {
      setError("Katılım durumu kaydedilemedi. Tekrar dene.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <PageHead kicker="Katılım → harcama → kazanım" title="Kampanya merkezim">
        Kartlarına uygun fırsatları seç. Katılımını kaydet, koşullara uygun her işlemle hedefini
        tamamla.
      </PageHead>
      <CampaignJourneyBoard />
      <details className="all-bank-offers">
        <summary>Tüm bankalardan diğer güncel kampanyaları incele</summary>
        <div className="segmented" role="group" aria-label="Kampanya kapsamı">
          <button
            type="button"
            aria-pressed={scope === "tumu"}
            onClick={() => {
              setScope("tumu");
              setLimit(24);
            }}
          >
            Tüm kampanyalar
          </button>
          <button
            type="button"
            aria-pressed={scope === "bana"}
            onClick={() => {
              setScope("bana");
              setLimit(24);
            }}
          >
            Kart programlarım
          </button>
        </div>
        <div className="filters">
          <input
            className="input"
            type="search"
            aria-label="Kampanya ara"
            placeholder="Marka, fırsat veya sektör ara…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(24);
            }}
          />
          <select
            className="input"
            aria-label="Kart programı"
            value={program}
            onChange={(e) => {
              setProgram(e.target.value);
              setLimit(24);
            }}
          >
            <option value="">Tüm programlar</option>
            {CAMPAIGN_SOURCES.map((s) => (
              <option key={s.program} value={s.program}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            aria-label="Sektör"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setLimit(24);
            }}
          >
            <option value="">Tüm sektörler</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <label className="small">
            <input
              type="checkbox"
              checked={joinedOnly}
              onChange={(e) => {
                setJoinedOnly(e.target.checked);
                setLimit(24);
              }}
            />{" "}
            Katıldıklarım
          </label>
        </div>
        <p className="muted small" role="status">
          {loading ? "Banka listesi güncelleniyor…" : `${rows.length + managed.length} kampanya`}
          {feed &&
            ` · ${new Date(feed.updatedAt).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })} güncellendi`}
        </p>
        {error && <p role="alert">{error}</p>}
        <p className="muted small">
          Program eşleşmesi, kartının kampanyaya kesin uygun olduğunu göstermez. Kart türü,
          mağaza/POS ve katılım koşullarını detaylardan kontrol et. Planda yalnızca hesaplama kuralı
          doğrulanan kampanyalar toplanır.
        </p>
        <div className="discovery-grid member-campaign-grid">
          {rows.slice(0, limit).map((c) => (
            <div key={c.id} className="member-campaign">
              <CampaignCard campaign={c} today={today} />
              {planCampaigns.some((rule) => rule.id === c.id || rule.url === c.sourceUrl) ? (
                <Link
                  className="btn btn-soft"
                  href={`/kampanyalar?campaign=${planCampaigns.find((rule) => rule.id === c.id || rule.url === c.sourceUrl)!.id}`}
                >
                  Katılım ve ilerleme takibini aç ↗
                </Link>
              ) : (
                <>
                  <p className="small muted">
                    Sayısal takip kuralı henüz yok. Katılım notu kazanım toplamına eklenmez.
                  </p>{" "}
                  <button
                    type="button"
                    className={`btn ${profile.joined[c.id] ? "btn-ghost" : "btn-soft"}`}
                    disabled={busy !== null}
                    aria-pressed={!!profile.joined[c.id]}
                    onClick={() => void toggle(c.id)}
                  >
                    {busy === c.id
                      ? "Kaydediliyor…"
                      : profile.joined[c.id]
                        ? "Katıldım ✓ · geri al"
                        : "Banka katılımımı not et"}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        {rows.length > limit && (
          <button type="button" className="btn btn-primary" onClick={() => setLimit((v) => v + 24)}>
            Daha fazla kampanya göster ({rows.length - limit})
          </button>
        )}
        {managed.map((c) => (
          <CampaignItem
            key={c.id}
            campaign={c}
            cards={myCards.filter((k) => k.program === c.program)}
            uid={user.uid}
            joined={!!profile.joined[c.id]}
            today={today}
          />
        ))}
        {!loading && !rows.length && !managed.length && (
          <div className="empty">Bu filtrelere uyan kampanya bulunamadı.</div>
        )}
      </details>
    </>
  );
}
