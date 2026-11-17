import { useEffect, useState, type FormEvent } from "react";
import {
  CalendarDays,
  LockKeyhole,
  LogOut,
  Mail,
  UserRound,
} from "lucide-react";
import AuthPanel from "../components/AuthPanel";
import { useAuth } from "../contexts/AuthContext";
import { fetchProfile, getProfileAvatarUrl, updateProfileAvatar } from "../lib/profile";
import { getErrorMessage } from "../lib/error-message";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types/profile";

export default function Account() {
  const { isConfigured, isLoading, session } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [signOutError, setSignOutError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isMounted = true;
    void fetchProfile(userId)
      .then((result) => {
        if (isMounted) {
          setProfile(result);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setProfileError(
            getErrorMessage(
              error,
              "Impossibile caricare il profilo. Verifica che le migration Supabase siano applicate.",
            ),
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  async function handleAvatarChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !avatarFile) {
      setProfileError("Seleziona un'immagine prima di continuare.");
      return;
    }

    setIsSavingAvatar(true);
    setProfileError("");
    try {
      const updatedProfile = await updateProfileAvatar(
        session.user.id,
        avatarFile,
      );
      setProfile(updatedProfile);
      setAvatarFile(null);
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : "Impossibile aggiornare l'immagine del profilo.",
      );
    } finally {
      setIsSavingAvatar(false);
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPasswordError("");

    if (password !== confirmPassword) {
      setPasswordError("Le password non coincidono.");
      return;
    }

    if (!supabase) {
      setPasswordError("Supabase non è configurato.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }
      setPassword("");
      setConfirmPassword("");
      setMessage("Password aggiornata correttamente.");
    } catch (error) {
      setPasswordError(
        error instanceof Error
          ? error.message
          : "Impossibile aggiornare la password.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      setSignOutError("Supabase non è configurato.");
      return;
    }

    setIsSigningOut(true);
    setSignOutError("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : "Impossibile uscire.",
      );
      setIsSigningOut(false);
    }
  }

  if (!isConfigured) {
    return (
      <section className="page-section">
        <div>
          <span className="eyebrow">AREA PERSONALE</span>
          <h1 className="page-title">Account</h1>
        </div>
        <div className="setup-notice" role="alert">
          <h2>Configura Supabase</h2>
          <p>
            Configura le variabili Supabase nel file <code>.env</code> per
            accedere alle impostazioni dell'account.
          </p>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="page-section">
        <div>
          <span className="eyebrow">AREA PERSONALE</span>
          <h1 className="page-title">Account</h1>
        </div>
        <p role="status">Verifica della sessione...</p>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="page-section">
        <div>
          <span className="eyebrow">AREA PERSONALE</span>
          <h1 className="page-title">Account</h1>
        </div>
        <AuthPanel />
      </section>
    );
  }

  const createdAt = session.user.created_at
    ? new Intl.DateTimeFormat("it-IT", {
        dateStyle: "long",
      }).format(new Date(session.user.created_at))
    : "Non disponibile";

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">AREA PERSONALE</span>
          <h1 className="page-title">Account</h1>
          <p className="page-description">
            Gestisci le informazioni e le impostazioni del tuo account.
          </p>
        </div>
      </div>

      <section className="account-card" aria-labelledby="account-details-title">
        <div className="account-card-heading">
          <span className="account-icon" aria-hidden="true">
            <UserRound size={22} />
          </span>
          <div>
            <h2 id="account-details-title">Informazioni account</h2>
            <p>I dati associati al tuo accesso ClassHub.</p>
          </div>
        </div>
        <dl className="account-details">
          <div className="account-detail">
            <dt>
              <Mail size={17} aria-hidden="true" />
              Email
            </dt>
            <dd>{session.user.email ?? "Non disponibile"}</dd>
          </div>
          <div className="account-detail">
            <dt>
              <CalendarDays size={17} aria-hidden="true" />
              Account creato il
            </dt>
            <dd>{createdAt}</dd>
          </div>
          <div className="account-detail">
            <dt>
              <Mail size={17} aria-hidden="true" />
              Verifica email
            </dt>
            <dd>
              {session.user.email_confirmed_at
                ? "Email verificata"
                : "Email non ancora verificata"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="account-card" aria-labelledby="avatar-title">
        <div className="account-card-heading">
          <span className="account-icon" aria-hidden="true">
            <UserRound size={22} />
          </span>
          <div>
            <h2 id="avatar-title">Immagine del profilo</h2>
            <p>Carica un'immagine JPG, PNG o WebP fino a 2 MB.</p>
          </div>
        </div>
        <form className="avatar-form" onSubmit={handleAvatarChange}>
          <div className="avatar-preview" aria-label="Anteprima immagine profilo">
            {getProfileAvatarUrl(profile?.avatar_path ?? null) ? (
              <img
                src={getProfileAvatarUrl(profile?.avatar_path ?? null) ?? ""}
                alt=""
              />
            ) : (
              <UserRound size={32} aria-hidden="true" />
            )}
          </div>
          <label className="avatar-file-input">
            Scegli immagine
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                setAvatarFile(event.target.files?.[0] ?? null)
              }
            />
          </label>
          <button
            className="button button-primary"
            type="submit"
            disabled={!avatarFile || isSavingAvatar}
          >
            {isSavingAvatar ? "Caricamento..." : "Aggiorna immagine"}
          </button>
          {profileError && (
            <p className="form-message form-error" role="alert">
              {profileError}
            </p>
          )}
        </form>
      </section>

      <section className="account-card" aria-labelledby="password-title">
        <div className="account-card-heading">
          <span className="account-icon" aria-hidden="true">
            <LockKeyhole size={22} />
          </span>
          <div>
            <h2 id="password-title">Cambia password</h2>
            <p>Scegli una nuova password di almeno 8 caratteri.</p>
          </div>
        </div>
        <form
          className="lesson-form account-password-form"
          onSubmit={handlePasswordChange}
        >
          <label>
            Nuova password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label>
            Conferma nuova password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>
          {passwordError && (
            <p className="form-message form-error" role="alert">
              {passwordError}
            </p>
          )}
          {message && (
            <p className="form-message form-success" role="status">
              {message}
            </p>
          )}
          <button
            className="button button-primary"
            type="submit"
            disabled={isSavingPassword}
          >
            {isSavingPassword ? "Salvataggio..." : "Aggiorna password"}
          </button>
        </form>
      </section>

      <section className="account-card account-logout-card">
        <div>
          <h2>Esci da ClassHub</h2>
          <p>Termina la sessione su questo dispositivo.</p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          disabled={isSigningOut}
          onClick={() => void handleSignOut()}
        >
          <LogOut size={17} aria-hidden="true" />
          {isSigningOut ? "Uscita..." : "Esci"}
        </button>
        {signOutError && (
          <p className="form-message form-error" role="alert">
            {signOutError}
          </p>
        )}
      </section>
    </section>
  );
}
