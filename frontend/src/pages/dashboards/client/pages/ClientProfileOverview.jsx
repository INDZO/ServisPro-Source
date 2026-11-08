import { useEffect, useMemo, useState } from "react";
import { ClientProfileApi } from "../../../../api/clientProfileApi.js";
import { ProfileImageApi } from "../../../../api/profileImageApi.js";
import "../../../../styles/clientProfileOverview.css";
import PasswordInput from "../../../../components/PasswordInput.jsx";

const DEFAULT_IMAGE_URL =
  "https://res.cloudinary.com/dbdpwiidk/image/upload/v1767672175/depositphotos_137014128-stock-illustration-user-profile-icon_qg26rb.webp";

function cls(...parts) {
  return parts.filter(Boolean).join(" ");
}

function validateFullName(v) {
  const s = (v || "").trim();
  if (!s) return "Ime i prezime ne može biti prazno.";
  if (s.length < 3) return "Ime i prezime mora imati najmanje 3 karaktera.";
  return "";
}

function validatePassword({ currentPassword, newPassword, confirmPassword }) {
  const cur = String(currentPassword || "").trim();
  const next = String(newPassword || "").trim();
  const conf = String(confirmPassword || "").trim();

  if (!cur) return "Unesi trenutnu lozinku.";
  if (!next) return "Unesi novu lozinku.";
  if (next.length < 6) return "Nova lozinka mora imati najmanje 6 karaktera.";
  if (next === cur) return "Nova lozinka mora biti različita od trenutne.";
  if (conf !== next) return "Nova lozinka i potvrda se ne poklapaju.";
  return "";
}

function getIsDefaultImage(p) {
  const publicId = p?.imagePublicId ?? p?.publicId ?? "";
  if (publicId) return false;

  const url = (p?.imageUrl || "").trim();
  if (!url) return true;
  if (url === DEFAULT_IMAGE_URL) return true;
  if (url.startsWith(DEFAULT_IMAGE_URL)) return true;

  return false;
}

function PasswordModal({ open, onClose, onSubmit, busy }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErr("");
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();

    const msg = validatePassword({ currentPassword, newPassword, confirmPassword });
    if (msg) return setErr(msg);

    setErr("");

    try {
      await onSubmit({
        currentPassword: String(currentPassword || "").trim(),
        newPassword: String(newPassword || "").trim(),
      });
    } catch (e2) {
      setErr(e2?.message || "Greška pri promeni lozinke.");
    }
  };

  if (!open) return null;

  return (
    <div className="pm-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="pm" onClick={(e) => e.stopPropagation()}>
        <div className="pm-head">
          <div className="pm-title">Promena lozinke</div>
          <button type="button" className="pm-close" onClick={onClose} aria-label="Zatvori">
            ×
          </button>
        </div>

        <form onSubmit={submit} className="pm-form">
          {err ? <div className="pm-alert pm-alert--err">{err}</div> : null}

          <label className="pm-field">
            <span>Trenutna lozinka</span>
            <PasswordInput
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (err) setErr("");
              }}
              autoComplete="current-password"
            />
          </label>

          <label className="pm-field">
            <span>Nova lozinka</span>
            <PasswordInput
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (err) setErr("");
              }}
              autoComplete="new-password"
            />
          </label>

          <label className="pm-field">
            <span>Potvrdi novu lozinku</span>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (err) setErr("");
              }}
              autoComplete="new-password"
            />
          </label>

          <div className="pm-actions">
            <button type="button" className="pm-btn pm-btn--ghost" onClick={onClose} disabled={busy}>
              Otkaži
            </button>
            <button type="submit" className="pm-btn pm-btn--solid" disabled={busy}>
              {busy ? "Čuvanje..." : "Promeni lozinku"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientProfileOverview({ onProfileChanged }) {
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    imageUrl: "",
    imagePublicId: null,
  });

  const isDefaultImage = useMemo(() => getIsDefaultImage(profile), [profile]);

  const [editingName, setEditingName] = useState(false);
  const [fullNameDraft, setFullNameDraft] = useState("");

  const [uploadingImg, setUploadingImg] = useState(false);

  const [passOpen, setPassOpen] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function loadProfile() {
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const p = await ClientProfileApi.get();

      const mapped = {
        fullName: p.fullName || p.FullName || "",
        email: p.email || p.Email || "",
        imageUrl: p.imageUrl || p.ImageUrl || "",
        imagePublicId: p.imagePublicId ?? p.ImagePublicId ?? p.publicId ?? p.PublicId ?? null,
      };

      setProfile(mapped);
      setFullNameDraft(mapped.fullName);

      onProfileChanged?.({
        fullName: mapped.fullName,
        email: mapped.email,
        imageUrl: mapped.imageUrl,
        imagePublicId: mapped.imagePublicId,
      });
    } catch (e) {
      setErr(e?.message || "Greška pri učitavanju profila.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  const startEditName = () => {
    setErr("");
    setMsg("");
    setFullNameDraft(profile.fullName || "");
    setEditingName(true);
  };

  const cancelEditName = () => {
    setEditingName(false);
    setFullNameDraft(profile.fullName || "");
  };

  const saveName = async () => {
    setErr("");
    setMsg("");

    const v = (fullNameDraft || "").trim();
    const vErr = validateFullName(v);
    if (vErr) {
      setErr(vErr);
      return;
    }

    try {
      await ClientProfileApi.update({ fullName: v });
      setMsg("Ime i prezime je uspešno ažurirano.");
      setEditingName(false);
      await loadProfile();
    } catch (e) {
      setErr(e?.message || "Greška pri ažuriranju profila.");
    }
  };

  const onUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr("");
    setMsg("");
    setUploadingImg(true);

    try {
      await ProfileImageApi.upload(file);
      setMsg("Slika profila je ažurirana.");
      await loadProfile();
    } catch (e2) {
      setErr(e2?.message || "Greška pri upload-u slike.");
    } finally {
      setUploadingImg(false);
      e.target.value = "";
    }
  };

  const onRemoveImage = async () => {
    setErr("");
    setMsg("");
    setUploadingImg(true);

    try {
      await ProfileImageApi.remove();
      setMsg("Slika profila je uklonjena.");
      await loadProfile();
    } catch (e2) {
      setErr(e2?.message || "Greška pri uklanjanju slike.");
    } finally {
      setUploadingImg(false);
    }
  };

  const submitPassword = async ({ currentPassword, newPassword }) => {
    setMsg("");
    setSavingPass(true);
    try {
      await ClientProfileApi.changePassword({ currentPassword, newPassword });
      setMsg("Lozinka je uspešno promenjena.");
      setPassOpen(false);
    } catch (e) {
      throw e;
    } finally {
      setSavingPass(false);
    }
  };

  if (loading) {
    return (
      <div className="dash-card">
        <h1 className="dash-title">Profil</h1>
        <p className="dash-muted">Učitavanje...</p>
      </div>
    );
  }

  return (
    <div className="profile2">
      <div className="profile2-head">
        <div>
          <h1 className="profile2-title">Profil</h1>
          <div className="profile2-sub">Pregled naloga i podešavanja</div>
        </div>

        <button type="button" className="profile2-passBtn" onClick={() => setPassOpen(true)}>
          Promeni lozinku
        </button>
      </div>

      {(msg || err) ? (
        <div className={cls("profile2-alert", err ? "is-error" : "is-ok")}>{err || msg}</div>
      ) : null}

      <div className="profile2-grid">
        <section className="profile2-card">
          <div className="profile2-avatarWrap">
            {profile.imageUrl ? (
              <img className="profile2-avatar" src={profile.imageUrl} alt="Profil slika" />
            ) : (
              <div className="profile2-avatar profile2-avatar--ph">?</div>
            )}
          </div>

          <div className="profile2-avatarActions">
            <label className="profile2-fileBtn">
              <input type="file" accept="image/*" onChange={onUploadImage} disabled={uploadingImg} />
              {uploadingImg ? "Učitavanje..." : "Promeni sliku"}
            </label>

            {!isDefaultImage ? (
              <button
                type="button"
                className="profile2-ghostBtn"
                onClick={onRemoveImage}
                disabled={uploadingImg}
              >
                Ukloni sliku
              </button>
            ) : null}
          </div>

          <div className="profile2-mini">
            <div className="profile2-miniName" title={profile.fullName || ""}>
              {profile.fullName || "-"}
            </div>
            <div className="profile2-miniEmail" title={profile.email || ""}>
              {profile.email || "-"}
            </div>
          </div>
        </section>

        <section className="profile2-card">
          <div className="profile2-sectionTitle">Osnovni podaci</div>

          <div className="profile2-row">
            <div className="profile2-label">Ime i prezime</div>

            {!editingName ? (
              <div className="profile2-valueRow">
                <div className="profile2-value">{profile.fullName || "-"}</div>
                <button type="button" className="profile2-linkBtn" onClick={startEditName}>
                  Izmeni
                </button>
              </div>
            ) : (
              <div className="profile2-editRow">
                <input
                  className="profile2-input"
                  value={fullNameDraft}
                  onChange={(e) => setFullNameDraft(e.target.value)}
                  placeholder="Unesi ime i prezime"
                />
                <div className="profile2-editActions">
                  <button type="button" className="profile2-ghostBtn" onClick={cancelEditName}>
                    Otkaži
                  </button>
                  <button type="button" className="profile2-solidBtn" onClick={saveName}>
                    Sačuvaj
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="profile2-row">
            <div className="profile2-label">Email</div>
            <div className="profile2-value">{profile.email || "-"}</div>
          </div>
        </section>
      </div>

      <PasswordModal open={passOpen} onClose={() => setPassOpen(false)} onSubmit={submitPassword} busy={savingPass} />
    </div>
  );
}