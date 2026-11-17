import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

export default function AuthPanel() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setErrorMessage("Supabase non è configurato.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setMessage("");

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          throw error;
        }
        if (!data.session) {
          setMessage(
            "Registrazione completata. Controlla la tua email per confermare l'account.",
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          throw error;
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Accesso o registrazione non riusciti.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-panel">
      <div>
        <h2>{isSignUp ? "Crea un account" : "Accedi per continuare"}</h2>
        <p>
          {isSignUp
            ? "Registrati per creare e salvare le tue lezioni."
            : "Le lezioni sono private e visibili solo al tuo account."}
        </p>
      </div>
      <form className="lesson-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {errorMessage && (
          <p className="form-message form-error" role="alert">
            {errorMessage}
          </p>
        )}
        {message && <p className="form-message">{message}</p>}
        <button
          className="button button-primary"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Attendi..."
            : isSignUp
              ? "Registrati"
              : "Accedi"}
        </button>
      </form>
      <button
        className="text-button"
        type="button"
        onClick={() => {
          setIsSignUp((current) => !current);
          setErrorMessage("");
          setMessage("");
        }}
      >
        {isSignUp
          ? "Hai già un account? Accedi"
          : "Non hai un account? Registrati"}
      </button>
    </div>
  );
}
