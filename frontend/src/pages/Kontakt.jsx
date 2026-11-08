import { apiFetch } from "../api/baseUrl";
import { useMemo, useState } from "react";
import "../styles/Kontakt.css";
import { API_BASE_URL } from "../api/baseUrl.js";

const CONTACT_ENDPOINT = `${API_BASE_URL}/api/Contact`;

const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function normalize(v) {
  return (v ?? "").toString().trim();
}

function validate(values) {
  const errors = {};

  const email = normalize(values.email);
  const subject = normalize(values.subject);
  const message = normalize(values.message);

  if (!email) errors.email = "Email je obavezan.";
  else if (!emailRegex.test(email)) errors.email = "Unesite ispravan email.";

  if (!subject) errors.subject = "Naslov je obavezan.";
  else if (subject.length < 3) errors.subject = "Naslov mora imati bar 3 karaktera.";
  else if (subject.length > 120) errors.subject = "Naslov može imati najviše 120 karaktera.";

  if (!message) errors.message = "Poruka je obavezna.";
  else if (message.length < 10) errors.message = "Poruka mora imati bar 10 karaktera.";
  else if (message.length > 2000) errors.message = "Poruka može imati najviše 2000 karaktera.";

  return errors;
}

export default function Kontakt() {
  const [values, setValues] = useState({
    email: "",
    subject: "",
    message: "",
  });

  const [touched, setTouched] = useState({
    email: false,
    subject: false,
    message: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState({ type: "idle", message: "" }); 


  const errors = useMemo(() => validate(values), [values]);
  const canSubmit = useMemo(
    () => Object.keys(errors).length === 0 && !isSubmitting,
    [errors, isSubmitting]
  );

  function onChange(e) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setSubmitState({ type: "idle", message: "" });
  }

  function onBlur(e) {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  async function onSubmit(e) {
    e.preventDefault();

    setTouched({ email: true, subject: true, message: true });

    const currentErrors = validate(values);
    if (Object.keys(currentErrors).length > 0) {
      setSubmitState({ type: "error", message: "Proverite polja forme i pokušajte ponovo." });
      return;
    }

    setIsSubmitting(true);
    setSubmitState({ type: "idle", message: "" });

    try {
      const payload = {
        email: normalize(values.email),
        title: normalize(values.subject),   
        message: normalize(values.message), 
      };

      const res = await apiFetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let serverMsg = "Slanje nije uspelo. Pokušajte ponovo.";
        try {
          const text = await res.text();
          if (text && text.length < 300) serverMsg = text;
        } catch {}
        throw new Error(serverMsg);
      }

      setSubmitState({ type: "success", message: "Poruka je uspešno poslata. Hvala!" });
      setValues({ email: "", subject: "", message: "" });
      setTouched({ email: false, subject: false, message: false });
    } catch (err) {
      setSubmitState({
        type: "error",
        message: err?.message || "Došlo je do greške prilikom slanja poruke.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const showError = (field) => touched[field] && errors[field];

  return (
    <main className="contact">
      <section className="contact-hero">
        <div className="container">
          <div className="contact-hero__inner">
            <h1>Kontaktirajte nas</h1>
            <p>
              Imate pitanje, predlog ili želite da prijavite problem? Pošaljite poruku i odgovorićemo u najkraćem roku.
            </p>
          </div>
        </div>
      </section>

      <section className="contact-body">
        <div className="container">
          <div className="contact-card">
            <div className="contact-card__header">
              <h2>Pošaljite poruku</h2>
              <p>Polja označena kao obavezna moraju biti popunjena.</p>
            </div>

            {submitState.type !== "idle" && (
              <div
                className={`contact-alert ${
                  submitState.type === "success" ? "is-success" : "is-error"
                }`}
                role="status"
              >
                {submitState.message}
              </div>
            )}

            <form className="contact-form" onSubmit={onSubmit} noValidate>
              <div className="form-row">
                <label htmlFor="email">
                  Email <span className="req">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={onChange}
                  onBlur={onBlur}
                  placeholder="npr. contact@example.invalid"
                  autoComplete="email"
                />
                {showError("email") && <div className="field-error">{errors.email}</div>}
              </div>

              <div className="form-row">
                <label htmlFor="subject">
                  Naslov <span className="req">*</span>
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  value={values.subject}
                  onChange={onChange}
                  onBlur={onBlur}
                  placeholder="Kratak opis poruke"
                  maxLength={120}
                />
                {showError("subject") && <div className="field-error">{errors.subject}</div>}
              </div>

              <div className="form-row">
                <label htmlFor="message">
                  Poruka <span className="req">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={values.message}
                  onChange={onChange}
                  onBlur={onBlur}
                  placeholder="Napišite detalje..."
                  rows={7}
                  maxLength={2000}
                />
                <div className="hint">
                  {normalize(values.message).length}/2000
                </div>
                {showError("message") && <div className="field-error">{errors.message}</div>}
              </div>

              <div className="form-actions">
                <button className="btn btn--primary" type="submit" disabled={!canSubmit}>
                  {isSubmitting ? "Slanje..." : "Pošalji"}
                </button>

                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => {
                    setValues({ email: "", subject: "", message: "" });
                    setTouched({ email: false, subject: false, message: false });
                    setSubmitState({ type: "idle", message: "" });
                  }}
                  disabled={isSubmitting}
                >
                  Reset
                </button>
              </div>
             </form>
          </div>
        </div>
      </section>
    </main>
  );
}
