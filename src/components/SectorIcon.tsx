const paths: Record<string, string> = {
  Market: "M3 4h2l2 11h11l3-8H6M9 20h.01M18 20h.01",
  "E-ticaret": "M5 7h14l1 14H4L5 7ZM9 8V6a3 3 0 0 1 6 0v2",
  Akaryakıt:
    "M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M3 21h13M6 7h7v5H6M15 10h2v7a2 2 0 0 0 4 0V8l-3-3",
  Seyahat: "m3 10 18-7-7 18-3-7-8-4Zm8 4 5-5",
  Giyim: "m8 3-5 3-2 5 4 2 2-3v11h10V10l2 3 4-2-2-5-5-3a4 4 0 0 1-8 0Z",
  Restoran: "M4 3v6a3 3 0 0 0 6 0V3M7 3v18M18 3c-3 3-3 7 0 8v10M18 3v8",
  Elektronik: "M3 4h18v13H3V4ZM8 21h8M12 17v4",
  Eğitim: "m2 8 10-5 10 5-10 5L2 8Zm4 3v6l6 3 6-3v-6M22 8v8",
  Sağlık: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z",
  "Ev & Yaşam": "m3 10 9-7 9 7M5 9v12h14V9M10 21v-7h4v7",
  Fatura: "M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6",
  Eğlence: "M4 3h16v18H4V3ZM4 8h16M4 16h16M8 3v18M16 3v18",
};
export function SectorIcon({ category }: { category: string }) {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[category] || "M3 3h7v7H3V3ZM14 3h7v7h-7V3ZM3 14h7v7H3v-7ZM14 14h7v7h-7v-7Z"} />
    </svg>
  );
}
