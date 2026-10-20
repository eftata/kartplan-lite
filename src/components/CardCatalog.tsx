import { useState } from "react";
import type { CatalogCard } from "../lib/types";
import { MiniCard } from "./MiniCard";
import { Link } from "../lib/router";

export function CardCatalog({ cards, signedIn }: { cards: CatalogCard[]; signedIn: boolean }) {
  const [query, setQuery] = useState("");
  const [bank, setBank] = useState("");
  const banks = [...new Set(cards.map((c) => c.bank))].sort((a, b) => a.localeCompare(b, "tr"));
  const needle = query.trim().toLocaleLowerCase("tr");
  const visible = cards.filter(
    (c) =>
      (!bank || c.bank === bank) &&
      `${c.name} ${c.bank} ${c.programName}`.toLocaleLowerCase("tr").includes(needle),
  );
  return (
    <section className="card-directory" aria-labelledby="card-directory-title">
      <p className="discovery-eyebrow">KART KATALOĞU</p>
      <h2 id="card-directory-title">Kartını bul, cüzdanına ekle</h2>
      <p className="muted">
        {cards.length} kart · {banks.length} banka / marka. Hesap.com listesindeki 62 kart dahil.
        Kart eklemek banka başvurusu değildir.
      </p>
      <div className="card-directory-filters">
        <input
          className="input"
          type="search"
          aria-label="Katalogda kart ara"
          placeholder="Kart veya banka ara…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="input"
          aria-label="Katalog banka filtresi"
          value={bank}
          onChange={(e) => setBank(e.target.value)}
        >
          <option value="">Tüm bankalar</option>
          {banks.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </div>
      <p className="muted small" role="status">
        {visible.length} kart gösteriliyor
      </p>
      <div className="card-directory-grid">
        {visible.map((c) => (
          <article className="directory-card" key={c.id}>
            <div className="directory-card-art">
              <MiniCard card={c} />
            </div>
            <small className="muted">{c.bank}</small>
            <h3>{c.name}</h3>
            <span className="directory-type">
              {c.cardType === "banka" ? "Banka kartı" : "Kredi kartı"}
            </span>
            <div className="directory-actions">
              <Link href={signedIn ? "/kartlarim" : "/giris"}>Cüzdanıma ekle ↗</Link>
              {c.sourceUrl && (
                <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Kart bilgisi ↗
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
      {!visible.length && <p>Aramana uygun kart bulunamadı.</p>}
      <p className="muted small">
        Kaynak:{" "}
        <a href="https://hesap.com/kredi-karti/listeleme" target="_blank" rel="noopener noreferrer">
          Hesap.com kart listesi
        </a>{" "}
        · Kontrol: 21 Ekim 2026. Ücret ve başvuru koşullarını bankadan teyit et. Kart kataloğu
        kapsamı, kampanya kapsamından farklıdır; her kart için kampanya bulunmayabilir.
      </p>
    </section>
  );
}
