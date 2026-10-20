import { useState } from "react";
import type { CatalogCard } from "../lib/types";
import { ProgramIcon } from "./ProgramIcon";

export function MiniCard({ card, small }: { card: CatalogCard; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (card.imageUrl && !failed)
    return (
      <img
        className={`minicard-art ${small ? "minicard-art-sm" : ""}`}
        src={card.imageUrl}
        alt=""
        aria-hidden="true"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  return (
    <div
      className={`minicard prog-${card.program} ${small ? "minicard-sm" : ""}`}
      aria-hidden="true"
    >
      <span className="minicard-prog">
        <ProgramIcon program={card.program} size={small ? 9 : 21} />
      </span>
      <span className="minicard-chip" />
      {!small && <span className="minicard-name">{card.name}</span>}
    </div>
  );
}

export function CardLabel({ card }: { card: CatalogCard | undefined }) {
  if (!card) return <span className="muted">Bilinmeyen kart</span>;
  return (
    <span className="cardlabel">
      <MiniCard card={card} small />
      <span>
        <strong>{card.name}</strong>
        <small>{card.bank}</small>
      </span>
    </span>
  );
}
