import type { FormEvent } from "react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { ApiError, NetworkError } from "@/auth/api";
import { useAuth } from "@/auth/context";
import type { LocationState } from "@/auth/RequireAuth";
import {
  Alert,
  AuthCover,
  Button,
  Checkbox,
  Field,
  PasswordField,
} from "@/components";

const MESSAGES = {
  empty: "Escribe tu usuario y tu contraseña.",
  invalid: "Usuario o contraseña incorrectos. Revísalos e intenta de nuevo.",
  offline: "No hay conexión. Revisa el internet e intenta de nuevo.",
  unknown: "No pudimos iniciar sesión. Intenta de nuevo en un momento.",
} as const;

type ErrorKind = keyof typeof MESSAGES;

export const RECOVER_PATH = "/recuperar-contrasena";

export function LoginPage() {
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as LocationState)?.from ?? "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [keepSession, setKeepSession] = useState(true);
  const [error, setError] = useState<ErrorKind | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (state.status === "authenticated" && !submitting) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("empty");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password, keepSession);
      navigate(from, { replace: true });
    } catch (caught) {
      if (caught instanceof NetworkError) {
        setError("offline");
      } else if (caught instanceof ApiError && caught.status === 401) {
        setError("invalid");
      } else {
        setError("unknown");
      }
      setSubmitting(false);
    }
  }

  const invalid = error === "invalid" || error === "empty";

  return (
    <main className="tem-app tem-auth-screen">
      <AuthCover />

      <form className="tem-auth-card" onSubmit={handleSubmit} noValidate>
        <h2 className="tem-auth-card__title">Iniciar sesión</h2>

        {error ? <Alert>{MESSAGES[error]}</Alert> : null}

        <Field
          label="Usuario"
          className={invalid ? "tem-field--error" : undefined}
          inputProps={{
            type: "text",
            name: "username",
            autoComplete: "username",
            autoCapitalize: "none",
            spellCheck: false,
            placeholder: "Tu usuario",
            value: username,
            onChange: (event) => setUsername(event.target.value),
            "aria-invalid": invalid || undefined,
          }}
        />

        <PasswordField
          label="Contraseña"
          invalid={invalid}
          inputProps={{
            name: "password",
            autoComplete: "current-password",
            placeholder: "Tu contraseña",
            value: password,
            onChange: (event) => setPassword(event.target.value),
          }}
        />

        <Checkbox
          checked={keepSession}
          onChange={(event) => setKeepSession(event.target.checked)}
        >
          Mantener sesión en este celular
        </Checkbox>

        <Button
          type="submit"
          variant="primary"
          disabled={submitting}
          aria-busy={submitting || undefined}
        >
          {submitting ? "Entrando…" : "Entrar"}
        </Button>

        <div className="tem-auth-link">
          <Link to={RECOVER_PATH} className="tem-btn tem-btn--text">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </form>

      <p className="tem-auth-footnote">
        Si no tienes usuario, pídeselo a quien administra la tienda.
      </p>
    </main>
  );
}
