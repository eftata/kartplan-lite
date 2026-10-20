import { useId, useState } from "react";
import type { ExternalCampaign } from "../lib/externalCampaigns";
import { CAMPAIGN_SOURCES } from "../lib/sources";
import { ProgramIcon } from "./ProgramIcon";

export function CampaignCard({ campaign, today }: { campaign: ExternalCampaign; today: string }) {
  const source = CAMPAIGN_SOURCES.find((item) => item.program === campaign.program);
  const [imageFailed, setImageFailed] = useState(false);
  const headingId = useId();
  const days = campaign.endsAt
    ? Math.ceil((Date.parse(campaign.endsAt) - Date.parse(today)) / 86400000)
    : null;
  const end = campaign.endsAt
    ? new Date(`${campaign.endsAt}T12:00:00`).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
      })
    : "Bankada teyit et";
  const hasDetails = Boolean(campaign.conditions?.length);
  const thresholds = [
    ...new Set(
      campaign.spendCondition?.match(
        /\d[\d.,]*\s*TL(?:\s*(?:[-–]|ve)\s*\d[\d.,]*\s*TL)?\s*(?:ve üzeri|ve üstü|üzeri|üstü|arası)/gi,
      ) ?? [],
    ),
  ];
  const spending = thresholds.length > 1 ? "Kademeli harcama koşulu" : thresholds[0];
  const channels = [
    ...new Set(
      campaign.participation?.match(
        /BonusFlaş|İşCep|World Mobil|Yapı Kredi Mobil|Paraf Mobil|Halkbank Mobil|SMS|Akbank Mobil|Juzdan/gi,
      ) ?? [],
    ),
  ]
    .slice(0, 2)
    .join(" / ");
  return (
    <article className={`campaign-card campaign-${campaign.program}`} aria-labelledby={headingId}>
      <div className="campaign-card-top">
        <div className="campaign-bank">
          <ProgramIcon program={campaign.program} size={30} />
          <strong>{source?.name ?? campaign.program}</strong>
          <span>{source?.bank ?? "KartPlan seçkisi"}</span>
        </div>
        <span className={`campaign-deadline ${days !== null && days <= 7 ? "ending" : ""}`}>
          {days === 0
            ? "Son gün"
            : days !== null && days <= 7
              ? `Son ${days} gün`
              : campaign.category}
        </span>
      </div>
      <div className="campaign-card-body">
        <div className="campaign-art">
          {campaign.imageUrl && !imageFailed ? (
            <img
              src={campaign.imageUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="campaign-art-fallback">
              <ProgramIcon program={campaign.program} size={58} />
              <span>{campaign.category}</span>
            </div>
          )}
        </div>
        <div className="campaign-copy">
          <span className="campaign-sector">{campaign.category} fırsatı</span>
          <h3 id={headingId}>{campaign.title}</h3>
          <p>
            {campaign.summary ||
              "Bu kampanyanın ayrıntılı koşulları henüz alınamadı. Resmi banka sayfasından katılım ve kart uygunluğunu kontrol edebilirsin."}
          </p>
        </div>
        <div className="campaign-reward">
          <span>SUNULAN AVANTAJ</span>
          <strong>{campaign.benefit || "Özel fırsat"}</strong>
          <small>Koşullar sağlandığında geçerlidir</small>
        </div>
      </div>
      <div className="campaign-key-facts">
        <div>
          <span>Harcama koşulu</span>
          <strong>
            {spending || (campaign.spendCondition ? "İşlem koşulu var" : "Koşulları incele")}
          </strong>
          {campaign.spendCondition && <p>{campaign.spendCondition}</p>}
        </div>
        <div>
          <span>Katılım</span>
          <strong>
            {channels ||
              (campaign.participation ? "Katılım adımı gerekiyor" : "Katılım şartını kontrol et")}
          </strong>
          {campaign.participation && <p>{campaign.participation}</p>}
        </div>
        <div>
          <span>Son geçerlilik</span>
          <strong>{end}</strong>
          <p>
            {campaign.checkedAt ? "Resmi banka sayfasından alındı" : "Banka kaynağında teyit et"}
          </p>
        </div>
      </div>
      <details className="campaign-details">
        <summary>
          <span>Kampanya detaylarını incele</span>
          <span className="campaign-detail-toggle" aria-hidden="true">
            +
          </span>
        </summary>
        <div className="campaign-detail-content">
          <div className="campaign-detail-heading">
            <h4>Bilmen gerekenler</h4>
            <span>{source?.bank} · Resmi kampanya kaynağı</span>
          </div>
          {hasDetails ? (
            <ul>
              {campaign.conditions?.map((condition, index) => (
                <li key={index}>{condition}</li>
              ))}
            </ul>
          ) : (
            <p>
              {campaign.summary ||
                "Kampanyanın ayrıntılı koşulları henüz alınamadı. Kart uygunluğu, katılım adımları ve istisnaları bankanın resmi sayfasında inceleyebilirsin."}
            </p>
          )}
          <p className="campaign-source-note">
            {campaign.checkedAt
              ? `${new Date(campaign.checkedAt).toLocaleDateString("tr-TR")} tarihinde alınan koşullardan seçkidir. `
              : ""}
            Bankanın koşullarında değişiklik olabilir. İşlem öncesinde güncel metni teyit et.
          </p>
          {campaign.sourceUrl && (
            <a href={campaign.sourceUrl} target="_blank" rel="noopener noreferrer">
              Bankanın resmi sayfasında teyit et ↗
            </a>
          )}
        </div>
      </details>
    </article>
  );
}
