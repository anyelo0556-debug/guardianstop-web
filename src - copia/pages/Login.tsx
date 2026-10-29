import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";

function getOAuthUrl() {
  const kimiAuthUrl = import.meta.env.VITE_KIMI_AUTH_URL;
  const appID = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${kimiAuthUrl}/api/oauth/authorize`);
  url.searchParams.set("client_id", appID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile");
  url.searchParams.set("state", state);

  return url.toString();
}

export default function Login() {
  return (
    <div className="min-h-screen bg-gs-bg flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Back to home */}
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-gs-muted hover:text-gs-gold transition-colors mb-8"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver al sitio
        </Link>

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gs-gold/30 bg-gs-gold/5">
            <Shield className="h-8 w-8 text-gs-gold" />
          </div>
          <h1 className="text-xl font-bold tracking-[0.12em] text-gs-gold font-display">
            GUARDIAN STOP
          </h1>
          <p className="mt-2 text-xs text-gs-muted text-center">
            Tu freno emocional automatizado
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gs-border/60 bg-gs-surface/30 p-6">
          <h2 className="text-sm font-bold text-white font-display tracking-wide text-center mb-2">
            ACCEDE A TU CUENTA
          </h2>
          <p className="text-xs text-gs-muted text-center mb-6">
            Inicia sesión para acceder a tu dashboard, configurar tus límites y ver tu Score de Disciplina.
          </p>

          <Button
            className="w-full rounded-full bg-gs-gold text-gs-bg font-bold hover:bg-gs-gold-light transition-colors"
            size="lg"
            onClick={() => {
              window.location.href = getOAuthUrl();
            }}
          >
            <Shield className="mr-2 h-4 w-4" />
            Iniciar sesión
          </Button>

          <p className="mt-4 text-[10px] text-gs-muted/60 text-center">
            Al iniciar sesión, aceptas nuestros términos de servicio y política de privacidad.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[10px] text-gs-muted/40">
          © {new Date().getFullYear()} Guardian Stop. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
