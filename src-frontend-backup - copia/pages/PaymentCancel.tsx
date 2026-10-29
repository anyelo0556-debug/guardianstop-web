import { Link } from "react-router";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useLang } from "@/hooks/useLang";

export default function PaymentCancel() {
  const { lang } = useLang();
  const isEs = lang === "es";

  const t = {
    title: isEs ? "Pago cancelado" : "Payment cancelled",
    subtitle: isEs
      ? "El proceso de pago fue cancelado o no se completó."
      : "The payment process was cancelled or not completed.",
    retry: isEs ? "Puedes intentarlo de nuevo cuando quieras." : "You can try again anytime.",
    back: isEs ? "Volver a planes" : "Back to plans",
    home: isEs ? "Volver al inicio" : "Back to home",
    help: isEs
      ? "¿Necesitas ayuda? Escríbenos a soporte-@guardianstop.com"
      : "Need help? Write to soporte-@guardianstop.com",
  };

  return (
    <div className="min-h-screen bg-gs-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
          <XCircle className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-white font-display mb-2">{t.title}</h1>
        <p className="text-gs-muted mb-2">{t.subtitle}</p>
        <p className="text-sm text-gs-muted mb-6">{t.retry}</p>

        <div className="space-y-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-gs-gold px-6 py-3 text-sm font-bold text-gs-bg hover:bg-gs-gold-light transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            {t.back}
          </button>
          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full rounded-lg border border-gs-border/60 px-6 py-3 text-sm font-bold text-gs-muted hover:bg-gs-surface/30 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.home}
          </Link>
        </div>

        <p className="mt-6 text-xs text-gs-muted">{t.help}</p>
      </div>
    </div>
  );
}
