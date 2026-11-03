import { Link, useSearchParams } from "react-router";
import { CheckCircle, Mail, ArrowRight } from "lucide-react";

export default function Welcome() {
  const [params] = useSearchParams();
  const planType = params.get("plan") === "basic" ? "GUARDIAN BASIC" : "GUARDIAN TRAILING";
  const days = params.get("days") || "90";
  const price = params.get("price") || "62.99";

  return (
    <div className="min-h-screen bg-gs-bg flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <CheckCircle className="h-16 w-16 text-gs-gold mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white font-display mb-2">¡BIENVENIDO A GUARDIAN STOP!</h1>
        <p className="text-sm text-gs-muted mb-6">
          Tu protección ya está <span className="text-gs-gold font-bold">ACTIVA</span>.
        </p>

        <div className="rounded-xl border border-gs-gold/20 bg-gs-gold/5 p-5 mb-4 text-left">
          <div className="text-[10px] text-gs-muted tracking-wider mb-1">SUSCRIPCIÓN ACTIVADA</div>
          <div className="text-white font-bold">{planType} · {days} días</div>
          <div className="text-gs-gold font-mono mt-1">${price} USD</div>
        </div>

        <div className="rounded-xl border border-gs-teal/20 bg-gs-teal/5 p-4 mb-6 flex items-center gap-3">
          <Mail className="h-5 w-5 text-gs-teal shrink-0" />
          <p className="text-xs text-gs-muted text-left">
            Te enviamos un <strong className="text-gs-teal">correo de bienvenida</strong> con los detalles
            de tu plan. Revísalo ahora.
          </p>
        </div>

        <Link to="/panel"
          className="inline-flex items-center gap-2 rounded-full bg-gs-gold px-8 py-3 text-sm font-bold text-gs-bg hover:bg-gs-gold-light">
          Ir a mi Panel <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
