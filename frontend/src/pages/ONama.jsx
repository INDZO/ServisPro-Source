import "../styles/ONama.css";
import inasImg from "../assets/inas.jpg";
import edinImg from "../assets/edin.jpg";
import aldinaImg from "../assets/aldina.jpg";

const TEAM = [
  {
    name: "Project contributor",
    role: "Vođa tima · Frontend/Backend",
    img: inasImg,
    bio:
      "Koordinacija razvoja, integracija frontenda i backenda, dizajn ključnih tokova (servisi, termini, vozila) i finalna isporuka.",
  },
  {
    name: "Prof. dr Project contributor",
    role: "Mentor · Nastavno-stručna podrška",
    img: edinImg,
    bio:
      "Mentorska podrška u definisanju ciljeva sistema, metodologije razvoja i verifikaciji ključnih funkcionalnih zahteva.",
  },
  {
    name: "Doc. dr Project contributor",
    role: "Mentor · Arhitektura i kvalitet",
    img: aldinaImg,
    bio:
      "Smernice za arhitekturu, kvalitet i konzistentnost rešenja, kao i podrška u dokumentovanju i validaciji zahteva.",
  },
];

function Feature({ title, children }) {
  return (
    <div className="about-card">
      <h3 className="about-card__title">{title}</h3>
      <div className="about-card__body">{children}</div>
    </div>
  );
}

export default function ONama() {
  return (
    <main className="about">
      <section className="about-hero">
        <div className="container">
          <div className="about-hero__grid">
            <div className="about-hero__left">
              <p className="about-kicker">ServisPro</p>
              <h1 className="about-title">O nama</h1>
              <p className="about-subtitle">
                ServisPro je web platforma za pronalaženje autoservisa, slanje zahteva za termin
                i praćenje istorije intervencija nad vozilima. Projekat je realizovan u okviru
                predmeta <strong>Softversko inženjerstvo</strong>.
              </p>

              <div className="about-badges">
                <span className="about-badge">Studentski projekat</span>
                <span className="about-badge">React · ASP.NET Core</span>
                <span className="about-badge">SQL Server</span>
              </div>
            </div>

            <div className="about-hero__right">
              <div className="about-hero__panel">
                <div className="about-stat">
                  <div className="about-stat__value">Pronađi</div>
                  <div className="about-stat__label">autoservis po lokaciji/usluzi</div>
                </div>
                <div className="about-stat">
                  <div className="about-stat__value">Zakaži</div>
                  <div className="about-stat__label">slanjem zahteva po danu</div>
                </div>
                <div className="about-stat">
                  <div className="about-stat__value">Prati</div>
                  <div className="about-stat__label">istoriju radova i kilometražu</div>
                </div>
                <div className="about-stat">
                  <div className="about-stat__value">Oceni</div>
                  <div className="about-stat__label">uslugu i ostavi komentar</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="container">
          <div className="about-section__header">
            <h2>Šta ServisPro rešava</h2>
            <p>
              Fokus projekta je digitalizacija tradicionalnog procesa zakazivanja i vođenja evidencije u autoservisima:
              manje poziva i papira, više transparentnosti i boljeg pregleda održavanja vozila.
            </p>
          </div>

          <div className="about-grid">
            <Feature title="Ključne funkcionalnosti">
              <ul className="about-list">
                <li>Lista i pretraga registrovanih servisa</li>
                <li>Zahtev za termin (zakazivanje po danu, bez satnice)</li>
                <li>Upravljanje statusima termina/vozila (na čekanju, u servisu, završeno)</li>
                <li>Digitalna istorija intervencija (radovi, datum, kilometraža)</li>
                <li>Ocene i komentari za servise</li>
                <li>Chat za dodatnu komunikaciju klijent–servis</li>
              </ul>
            </Feature>

            <Feature title="Uloge u sistemu">
              <ul className="about-list">
                <li><strong>Posetilac</strong>: pregled servisa i javnih informacija</li>
                <li><strong>Klijent</strong>: vozila, termini, istorija, chat, ocene</li>
                <li><strong>Servis</strong>: obrada zahteva, evidencija intervencija, profil i usluge</li>
                <li><strong>Admin</strong>: moderacija i upravljanje šifarnicima/korisnicima</li>
              </ul>
            </Feature>

            <Feature title="Tehnologije">
              <div className="about-tech">
                <div className="about-tech__row">
                  <span className="about-pill">Frontend</span>
                  <span>React.js</span>
                </div>
                <div className="about-tech__row">
                  <span className="about-pill">Backend</span>
                  <span>ASP.NET Core</span>
                </div>
                <div className="about-tech__row">
                  <span className="about-pill">Baza</span>
                  <span>SQL Server</span>
                </div>
                <div className="about-tech__row">
                  <span className="about-pill">Arhitektura</span>
                  <span>Klijent/Server · REST API</span>
                </div>
              </div>
            </Feature>
          </div>
        </div>
      </section>

      <section className="about-section about-section--team">
        <div className="container">
          <div className="about-section__header">
            <h2>Tim</h2>
            <p>
              Projekat je realizovao tim uz mentorsku podršku nastavnog osoblja. Svaki član je imao jasnu ulogu i
              odgovornosti u razvoju i dokumentovanju sistema.
            </p>
          </div>

          <div className="team-grid">
            {TEAM.map((m) => (
              <article className="team-card" key={m.name}>
                <div className="team-card__media">
                  <img
                    src={m.img}
                    alt={`${m.name} — ${m.role}`}
                    className="team-card__img"
                    loading="lazy"
                  />
                </div>
                <div className="team-card__content">
                  <h3 className="team-card__name">{m.name}</h3>
                  <p className="team-card__role">{m.role}</p>
                  <p className="team-card__bio">{m.bio}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="about-footer">
            <p className="about-footer__text">
              ServisPro je razvijan iterativno (planiranje, razrada, izrada, okončanje), uz fokus na funkcionalnosti
              koje donose najveću vrednost krajnjim korisnicima.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

