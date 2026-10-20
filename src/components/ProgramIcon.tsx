/** Kart programlarını ayırt eden yerel simgeler. Banka logosu yerine uygulama simgesidir. */
export function ProgramIcon({ program, size = 32 }: { program: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 48 48",
    fill: "none",
    "aria-hidden": true as const,
  };
  if (program === "bonus")
    return (
      <svg {...common}>
        <circle cx="24" cy="24" r="23" fill="#228B55" />
        <circle cx="24" cy="13" r="6" fill="#fff" />
        <circle cx="34.5" cy="20.5" r="6" fill="#fff" />
        <circle cx="30.5" cy="33" r="6" fill="#fff" />
        <circle cx="17.5" cy="33" r="6" fill="#fff" />
        <circle cx="13.5" cy="20.5" r="6" fill="#fff" />
        <circle cx="24" cy="24" r="4.5" fill="#F7C84B" />
      </svg>
    );
  if (program === "maximum")
    return (
      <svg {...common}>
        <rect width="48" height="48" rx="13" fill="#A32031" />
        <path
          d="M9 33V15l7.5 10L24 15l7.5 10L39 15v18"
          stroke="white"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  if (program === "world")
    return (
      <svg {...common}>
        <rect width="48" height="48" rx="13" fill="#713BA5" />
        <circle cx="24" cy="24" r="14" stroke="white" strokeWidth="2.5" />
        <path
          d="M10 24h28M24 10c-7 6-7 22 0 28M24 10c7 6 7 22 0 28"
          stroke="white"
          strokeWidth="2"
        />
      </svg>
    );
  if (program === "axess")
    return (
      <svg {...common}>
        <rect width="48" height="48" rx="13" fill="#D14237" />
        <path
          d="M11 12l13 13 13-13M11 36l13-13 13 13"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (program === "paraf")
    return (
      <svg {...common}>
        <rect width="48" height="48" rx="13" fill="#168A68" />
        <path
          d="M15 36V12h11c7 0 11 3 11 9s-4 9-11 9H15"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  return (
    <svg {...common}>
      <rect width="48" height="48" rx="13" fill="#34445D" />
      <path
        d="M15 12v24M33 12L15 25l18 11"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
