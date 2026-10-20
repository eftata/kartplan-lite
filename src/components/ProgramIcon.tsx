import { CAMPAIGN_SOURCES } from "../lib/sources";

/** Bankanın resmi program logosunu, özgün en-boy oranını koruyarak gösterir. */
export function ProgramIcon({ program, size = 32 }: { program: string; size?: number }) {
  const source = CAMPAIGN_SOURCES.find((item) => item.program === program);
  if (!source)
    return (
      <span className="program-logo-fallback" aria-hidden="true">
        ▭
      </span>
    );
  return (
    <span
      className={`program-logo program-logo-${program}`}
      style={{ width: size * 3, height: size }}
      aria-hidden="true"
    >
      <img src={source.logoUrl} alt="" width={size * 3} height={size} />
    </span>
  );
}

export function BankLogo({ program }: { program: string }) {
  const source = CAMPAIGN_SOURCES.find((item) => item.program === program);
  if (!source) return null;
  return (
    <img
      className={`bank-logo bank-logo-${program}`}
      src={source.bankLogoUrl}
      alt={source.bank}
      title={source.bank}
    />
  );
}
