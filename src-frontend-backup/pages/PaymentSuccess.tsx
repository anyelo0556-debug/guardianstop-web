import { useEffect } from "react";
import { Link } from "react-router";
import { CheckCircle, ArrowLeft, Shield } from "lucide-react";
import { useLang } from "@/hooks/useLang";

export default function PaymentSuccess() {
  const { lang } = useLang();
  const isEs = lang === "es";

  useEffect(() => {
    // Scroll to top
    window.scrollTo(0, 0);
  }, []);

  const t = {
    title: isEs ? "¡Pago completado!" : "Payment completed!",
    subtitle: isEs
      ? "Tu suscripción a Guardian Stop está activa."
      : "Your Guardian Stop subscription is now active.",
    activated: isEs ? "Plan activado" : "Plan activated",
    access: isEs
      ? "Ya puedes acceder a todas las funciones de protección."
      : "You can now access all protection features.",
    dashboard: isEs ? "Ir al panel" : "Go to dashboard",
    home: isEs ? "Volver al inicio" : "Back to home",
    contact: isEs
      ? "¿Tienes dudas? Escríbenos a soporte-@guardianstop.com"
      : "Questions? Write to soporte-@guardianstop.com",
  };

  return (
    <div className="min-h-screen bg-gs-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-white font-display mb-2">{t.title}</h1>
        <p className="text-gs-muted mb-6">{t.subtitle}</p>

        <div className="rounded-xl border border-gs-gold/20 bg-gs-surface/20 p-6 mb-6">
          <Shield className="h-8 w-8 text-gs-gold mx-auto mb-3" />
          <p className="text-white font-bold mb-1">{t.activated}</p>
          <p className="text-sm text-gs-muted">{t.access}</p>
        </div>

        <div className="space-y-3">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-gs-gold px-6 py-3 text-sm font-bold text-gs-bg hover:bg-gs-gold-light transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.home}
          </Link>
        </div>

        <p className="mt-6 text-xs text-gs-muted">{t.contact}</p>
      </div>
    </div>
  );
}
