import { Link } from "../lib/router";
export function League() {
  return (
    <section className="league-coming">
      <span className="coming-orbit" aria-hidden="true">
        ✦
      </span>
      <span className="coming-pill">COMING SOON · ÇOK YAKINDA</span>
      <h1>
        Kazanmayı birlikte
        <br />
        bir alışkanlığa çevirelim.
      </h1>
      <p>
        Kampanya Ligi'ni yeniden tasarlıyoruz. Bütçene sadık kalmayı, hedeflerini tamamlamayı ve
        düzenli takibi ödüllendiren bir deneyim burada olacak.
      </p>
      <div className="coming-preview">
        <div>
          <b>01</b>
          <h2>Kişisel görevler</h2>
          <p>Planına ve hedeflerine uygun, anlamlı adımlar.</p>
        </div>
        <div>
          <b>02</b>
          <h2>Aylık sezonlar</h2>
          <p>Her ay yeni hedefler ve dengeli bir ilerleme.</p>
        </div>
        <div>
          <b>03</b>
          <h2>Başarı koleksiyonu</h2>
          <p>Tamamladığın hedeflerden oluşan kişisel bir hikâye.</p>
        </div>
      </div>
      <div className="row-actions">
        <Link className="btn btn-primary" href="/ana-sayfa">
          Ana sayfaya dön →
        </Link>
        <Link className="btn btn-ghost" href="/plan">
          Bu ayın planını oluştur
        </Link>
      </div>
      <small>
        Mevcut lig kayıtların korunuyor. Bu ön gösterimde yeni puan veya sıralama oluşturulmuyor.
      </small>
    </section>
  );
}
