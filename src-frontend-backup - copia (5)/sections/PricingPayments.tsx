import { Check, Zap, Shield, Crown, MessageSquare, RotateCcw, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Guardian 60",
    days: 60,
    price: 120,
    popular: false,
    features: [
      "Protección FSM en tiempo real",
      "Ledger personal SHA-256",
      "Alertas WhatsApp básicas",
      "Dashboard trader",
      "1 cuenta de bróker",
    ],
  },
  {
    name: "Guardian 90",
    days: 90,
    price: 165,
    popular: true,
    features: [
      "Todo lo de Guardian 60",
      "Psicología de trading avanzada",
      "Score de Disciplina (30d)",
      "Historial completo de auditoría",
      "Soporte prioritario",
    ],
  },
  {
    name: "Guardian 180",
    days: 180,
    price: 290,
    popular: false,
    features: [
      "Todo lo de Guardian 90",
      "Hasta 3 cuentas de bróker",
      "Guardiano AI ilimitado",
      "Alertas conductuales personalizadas",
      "Reporte mensual de consistencia",
    ],
  },
  {
    name: "Guardian 365",
    days: 365,
    price: 520,
    popular: false,
    features: [
      "Todo lo de Guardian 180",
      "Cuenta Bóveda incluida",
      "Acceso anticipado a nuevos brókers",
      "Panel Master personal (1 subcuenta)",
      "Onboarding 1-a-1 con Ángel Dávila",
    ],
  },
];

export default function PricingPayments() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl font-display">
          Planes de Protección
        </h2>
        <p className="mt-3 text-gs-muted max-w-2xl mx-auto text-sm">
          Suscripción plana. Sin comisiones ocultas. Solo pagas por el tiempo que necesitas estar protegido.
          Participación por volumen disponible según bróker.
        </p>
      </div>

      {/* Refund banner */}
      <div className="mb-8 flex items-center justify-center gap-2 rounded-lg border border-gs-gold/30 bg-gs-gold/5 px-4 py-3">
        <RotateCcw className="h-4 w-4 text-gs-gold" />
        <span className="text-xs text-gs-text">
          <strong className="text-gs-gold">Garantía 7 días:</strong> Reembolso total si no estás satisfecho. 
          Día 8 la suscripción se confirma y no aplica devolución.
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative flex flex-col border ${
              plan.popular
                ? "border-gs-gold bg-gs-gold/5 shadow-glow-gold"
                : "border-gs-border bg-gs-surface/60"
            }`}
          >
            {plan.popular && (
              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gs-gold text-gs-bg border-0 text-[10px] font-bold tracking-wider">
                RECOMENDADO
              </Badge>
            )}
            <CardContent className="flex flex-1 flex-col p-5">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white tracking-wide">{plan.name}</h3>
                <div className="mt-1 text-xs text-gs-muted">{plan.days} días de protección</div>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gs-gold font-mono">${plan.price}</span>
                <span className="text-xs text-gs-muted"> USD</span>
              </div>
              <ul className="mb-6 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gs-muted">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gs-gold" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full text-[11px] font-bold tracking-wide ${
                  plan.popular
                    ? "bg-gs-gold text-gs-bg hover:bg-gs-gold-light"
                    : "bg-gs-surface text-gs-text border border-gs-border hover:bg-gs-bg hover:border-gs-gold/40"
                }`}
              >
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                ELEGIR PLAN
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info cards */}
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Card className="border-gs-border bg-gs-surface/60">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded bg-gs-gold/10 p-2 border border-gs-gold/20">
              <Shield className="h-4 w-4 text-gs-gold" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Pagos Seguros</div>
              <p className="mt-1 text-[11px] text-gs-muted">
                Stripe / PayPal / Crypto. Renovación automática.
                Cancelación con 7 días de anticipación.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gs-border bg-gs-surface/60">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded bg-gs-teal/10 p-2 border border-gs-teal/20">
              <MessageSquare className="h-4 w-4 text-gs-teal" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">WhatsApp Automático</div>
              <p className="mt-1 text-[11px] text-gs-muted">
                Recordatorios de pago, confirmaciones y links de renovación
                directo por WhatsApp. Cero cortes por olvido.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gs-border bg-gs-surface/60">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded bg-gs-purple/10 p-2 border border-gs-purple/20">
              <Crown className="h-4 w-4 text-gs-purple" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Cuenta Bóveda</div>
              <p className="mt-1 text-[11px] text-gs-muted">
                Planes 365 incluyen bloqueo voluntario de retiros por 60/90/180 días
                para forzar consistencia.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score discipline note */}
      <div className="mt-6 flex items-center gap-3 rounded-lg border border-gs-teal/30 bg-gs-teal/5 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-gs-teal shrink-0" />
        <div className="text-xs text-gs-muted">
          <span className="font-bold text-gs-teal">Score de Disciplina:</span> Se activa automáticamente después de tu primer mes completo.
          Mide consistencia, respeto a stops y control emocional. Visible en tu perfil público (opt-in).
        </div>
      </div>
    </div>
  );
}
