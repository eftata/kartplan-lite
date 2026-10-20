/** KartPlan'a ait özgün işaret ve kelime logosu. */
export function Brand({ subtitle = false }: { subtitle?: boolean }) {
  return (
    <span className="brand-lockup">
      <svg className="brand-symbol" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <rect width="44" height="44" rx="13" fill="currentColor" />
        <path
          d="M14 11v22m0-9 13-12M14 24l13 9"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="31" cy="12" r="3" fill="#E7B76B" />
      </svg>
      <span className="brand-type">
        <strong>
          Kart<span>Plan</span>
        </strong>
        {subtitle && <small>KART FIRSATLARI</small>}
      </span>
    </span>
  );
}
