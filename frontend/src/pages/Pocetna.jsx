import { useNavigate } from "react-router-dom";
import heroImg from "../assets/hero.jpg";

export default function Pocetna() {
  const navigate = useNavigate();

  return (
    <div>
      <section className="hero hero-bg" style={{ backgroundImage: `url(${heroImg})` }}>
        <div className="hero-overlay" />
        <div className="container hero-inner">
          <div className="hero-content">
            <div className="badge">Digitalna evidencija i organizacija auto-servisa</div>

            <h1 className="hero-title">
              Termini i servisna istorija
              <br />
              na jednom mestu.
            </h1>

            <p className="hero-subtitle">
              ServisPro povezuje vozače i auto-servise kroz jednostavno zakazivanje, praćenje statusa i urednu evidenciju
              intervencija — bez papira i bez gubljenja vremena.
            </p>

            <div className="hero-actions">
              <button className="btn btn-solid" onClick={() => navigate("/auto-servisi")}>
                Pregledaj auto servise
              </button>

              <button className="btn btn-ghost-light" onClick={() => navigate("/postani-clan")}>
                Postani član (servis)
              </button>

              <button className="btn btn-link-light" onClick={() => navigate("/kontakt")}>
                Postavi pitanje
              </button>
            </div>

            <div className="hero-meta">
              <div className="meta-item">
                <span className="meta-number">1</span>
                <span className="meta-text">platforma</span>
              </div>
              <div className="meta-item">
                <span className="meta-number">3</span>
                <span className="meta-text">koraka do termina</span>
              </div>
              <div className="meta-item">
                <span className="meta-number">0</span>
                <span className="meta-text">papirnih evidencija</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">Šta dobijaš sa ServisPro?</h2>
          <p className="section-subtitle">
            Fokus na praktičnim stvarima: termin, transparentnost i uredna istorija vozila.
          </p>

          <div className="grid-3">
            <div className="feature">
              <h3 className="feature-title">Zakazivanje termina</h3>
              <p className="feature-text">
                Brzo pronađi servis i pošalji zahtev za termin. Jasna komunikacija i manje nepotrebnih poziva.
              </p>
            </div>

            <div className="feature">
              <h3 className="feature-title">Digitalna servisna istorija</h3>
              <p className="feature-text">
                Evidencija intervencija i kilometraže na jednom mestu. Pomaže u planiranju i dokazivanju održavanja.
              </p>
            </div>

            <div className="feature">
              <h3 className="feature-title">Ocene i utisci</h3>
              <p className="feature-text">
                Transparentne recenzije pomažu u izboru pouzdanog servisa i boljem poređenju ponude.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <h2 className="section-title">Kako radi?</h2>
          <p className="section-subtitle">Jednostavan tok za vozača i servis.</p>

          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div>
                <h3 className="step-title">Vozač bira servis</h3>
                <p className="step-text">Pregled servisa, usluga i ocena - zatim slanje zahteva za termin.</p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <div>
                <h3 className="step-title">Servis potvrđuje i vodi proces</h3>
                <p className="step-text">Prihvatanje/odbijanje zahteva i ažuriranje statusa tokom rada.</p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <div>
                <h3 className="step-title">Intervencije ostaju zabeležene</h3>
                <p className="step-text">Digitalna istorija održavanja vozila dostupna je kroz nalog korisnika.</p>
              </div>
            </div>
          </div>

          <div className="section-cta">
            <button className="btn btn-solid" onClick={() => navigate("/auto-servisi")}>
              Pogledaj servise
            </button>
            <button className="btn btn-ghost-dark" onClick={() => navigate("/postani-clan")}>
              Registruj servis
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">Za koga je ServisPro?</h2>
          <p className="section-subtitle">Dve strane platforme, jedna ideja: bolja usluga.</p>

          <div className="grid-2">
            <div className="panel">
              <h3 className="panel-title">Za vozače</h3>
              <ul className="panel-list">
                <li>Brže pronalaženje pouzdanog servisa</li>
                <li>Digitalna istorija održavanja</li>
                <li>Transparentne recenzije i informacije</li>
              </ul>

              <button className="btn btn-solid" style={{ background: "#f0f0f0" }} onClick={() => navigate("/auto-servisi")}>
                Pronađi servis
              </button>
            </div>

            <div className="panel">
              <h3 className="panel-title">Za auto-servise</h3>
              <ul className="panel-list">
                <li>Vidljivost i novi klijenti</li>
                <li>Organizacija termina i zahteva</li>
                <li>Standardizovana evidencija intervencija</li>
              </ul>

              <button className="btn btn-solid" style={{ background: "#f0f0f0" }} onClick={() => navigate("/postani-clan")}>
                Pridruži se kao servis
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
