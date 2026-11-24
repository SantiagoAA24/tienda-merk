import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { NetworkError, requestPasswordReset } from "@/auth/api";
import { LOGIN_PATH } from "@/auth/RequireAuth";
import { Alert, BackHeader, Button, Field } from "@/components";
import { IconCheck } from "@/components/icons";

const MESSAGES = {
  empty: "Escribe tu usuario.",
  offline: "No hay conexión. Revisa el internet e intenta de nuevo.",
  unknown: "No pudimos enviar la solicitud. Intenta de nuevo en un momento.",
} as const;

type ErrorKind = keyof typeof MESSAGES;

export function RecoverPasswordPage() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<ErrorKind | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim()) {
      setError("empty");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await requestPasswordReset(username.trim());
      setSent(true);
    } catch (caught) {
      setError(caught instanceof NetworkError ? "offline" : "unknown");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="tem-app tem-auth-screen">
      <BackHeader title="Recuperar contraseña" to={LOGIN_PATH} />

      {sent ? (
        <div className="tem-auth-form">
          <section className="tem-card" aria-live="polite">
            <div className="tem-auth-done">
              <span className="tem-auth-done__icon" aria-hidden="true">
                <IconCheck size={22} />
              </span>
              <p className="tem-auth-form__text">
                Listo. Le avisamos a quien administra la tienda para que te dé
                una contraseña nueva.
              </p>
            </div>
          </section>
          <div className="tem-auth-form__actions">
            <Link to={LOGIN_PATH} className="tem-btn tem-btn--primary">
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      ) : (
        <form className="tem-auth-form" onSubmit={handleSubmit} noValidate>
          <section className="tem-card">
            <p className="tem-auth-form__text">
              Escribe tu usuario y le avisamos a quien administra la tienda para
              que te dé una contraseña nueva.
            </p>
            {error ? (
              <Alert className="tem-auth-form__alert">{MESSAGES[error]}</Alert>
            ) : null}
            <Field
              label="Usuario"
              className={error === "empty" ? "tem-field--error" : undefined}
              inputProps={{
                type: "text",
                name: "username",
                autoComplete: "username",
                autoCapitalize: "none",
                spellCheck: false,
                placeholder: "Tu usuario",
                value: username,
                onChange: (event) => setUsername(event.target.value),
                "aria-invalid": error === "empty" || undefined,
              }}
            />
          </section>

          <div className="tem-auth-note">
            Si eres quien administra, escríbele a soporte desde el correo de la
            tienda.
          </div>

          <div className="tem-auth-form__actions">
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              aria-busy={submitting || undefined}
            >
              {submitting ? "Enviando…" : "Pedir contraseña nueva"}
            </Button>
          </div>
        </form>
      )}
    </main>
  );
}
