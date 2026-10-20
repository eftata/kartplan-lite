import { Link } from "../lib/router";
import { Brand } from "../components/Brand";

export function Landing() {
  return (
    <div className="landing">
      <header className="topbar topbar-plain">
        <span className="wordmark" aria-label="KartPlan">
          <Brand />
        </span>
        <nav className="landing-nav" aria-label="Ana menü">
          <Link href="/kesfet">Kampanyaları keşfet</Link>
          <a href="#nasil-calisir">Nasıl çalışır?</a>
          <Link href="/giris" className="btn btn-ghost">
            Giriş yap
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">Kartlarından daha fazlasını al</p>
          <h1>
            Kart kampanyalarını <em>tek yerden keşfet.</em>
          </h1>
          <p className="lead">
            Bankaların güncel kampanya sayfalarına ulaş. Kendi kartlarını ekle; yayınlanan
            kampanyaları kartlarına göre takip et ve harcamanı planla.
          </p>
          <div className="hero-cta">
            <Link href="/kesfet" className="btn btn-primary btn-lg">
              Kampanyaları keşfet <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/giris" className="btn btn-primary btn-lg">
              Kartlarımı ekle
            </Link>
            <span className="muted small">Ücretsiz · Yaklaşık 3 dakikada kurulum</span>
          </div>
          <p className="hero-reassurance">Kart numarası veya banka şifresi istemeyiz.</p>
        </div>

        <div className="hero-demo" aria-label="Temsili aylık plan örneği">
          <div className="demo-heading">
            <span className="hero-demo-label">TEMSİLİ PLAN</span>
            <span className="demo-month">Bu ay</span>
          </div>
          <p className="demo-title">
            Harcamalarının
            <br />
            akıllı dağılımı
          </p>
          <div className="demo-row">
            <span>🛒 Market</span>
            <span className="demo-card prog-bonus">Bonus</span>
            <strong className="num">+150 ₺</strong>
          </div>
          <div className="demo-row">
            <span>⛽ Akaryakıt</span>
            <span className="demo-card prog-maximum">Maximum</span>
            <strong className="num">+100 ₺</strong>
          </div>
          <div className="demo-row">
            <span>📦 E-ticaret</span>
            <span className="demo-card prog-world">World</span>
            <strong className="num">+75 ₺</strong>
          </div>
          <div className="demo-total">
            <span>Örnek toplam avantaj</span>
            <strong className="num">325 ₺</strong>
          </div>
          <p className="demo-disclaimer">
            Tutarlar örnektir; gerçek kazanç kampanya koşullarına bağlıdır.
          </p>
        </div>
      </section>

      <section className="steps" id="nasil-calisir" aria-labelledby="steps-title">
        <div className="steps-heading">
          <p className="kicker">Nasıl çalışır?</p>
          <h2 id="steps-title">Üç adımda daha net kararlar.</h2>
        </div>
        <div>
          <span className="step-no">01</span>
          <h3>Kartlarını seç</h3>
          <p>Banka ve programdan kartlarını işaretle. Hiçbir kart bilgisi istemeyiz.</p>
        </div>
        <div>
          <span className="step-no">02</span>
          <h3>Harcamanı anlat</h3>
          <p>Market, akaryakıt, e-ticaret… Aylık yaklaşık tutarları kaydırıcıyla gir.</p>
        </div>
        <div>
          <span className="step-no">03</span>
          <h3>Planını al</h3>
          <p>Kategori başına kart, tutar ve kampanya. Katılman gerekenleri de hatırlatırız.</p>
        </div>
      </section>

      <footer className="footer">
        <span>KartPlan · bağımsız bir araçtır, hiçbir bankayla bağlantılı değildir.</span>
        <Link href="/aydinlatma">Aydınlatma metni</Link>
      </footer>
    </div>
  );
}
