import { Check, Shield, TrendingUp, RotateCcw, Clock, Lock, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/hooks/useLang";
import { useState } from "react";
import PaymentModal from "@/components/PaymentModal";

const pricing = {
  basic: [
    { days: 30, price: 19.99, perMonth: 19.99, original: null, save: null },
    { days: 90, price: 54.99, perMonth: 18.33, original: 59.97, save: "8%" },
    { days: 180, price: 99.99, perMonth: 16.67, original: 119.94, save: "17%", popular: true },
    { days: 365, price: 179.99, perMonth: 14.79, original: 239.88, save: "25%" },
  ],
  trailing: [
    { days: 30, price: 22.99, perMonth: 22.99, original: null, save: null },
    { days: 90, price: 62.99, perMonth: 21.00, original: 68.97, save: "9%" },
    { days: 180, price: 114.99, perMonth: 19.17, original: 137.94, save: "17%", popular: true },
    { days: 365, price: 199.99, perMonth: 16.44, original: 275.88, save: "28%" },
  ],
};

export default function Plans() {
  const { lang, t } = useLang();
  const [mode, setMode] = useState<"basic" | "trailing">("trailing");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ days: number; price: number } | null>(null);

  const plans = pricing[mode];

  const openPayment = (plan: { days: number; price: number }) => {
    setSelectedPlan(plan);
    setPaymentOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl font-display">
          {t.plans.title}
        </h2>
        <p className="mt-4 text-gs-muted max-w-2xl mx-auto text-sm md:text-base">
          {t.plans.subtitle}
        </p>
      </div>

      {/* Mode selector */}
      <div className="mb-8 flex justify-center">
        <div className="flex rounded-full border border-gs-border bg-gs-surface/40 p-1">
          <button
            onClick={() => setMode("basic")}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold tracking-wide transition-all ${
              mode === "basic"
                ? "bg-gs-gold text-gs-bg"
                : "text-gs-muted hover:text-gs-text"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            {t.plans.types.basic}
          </button>
          <button
            onClick={() => setMode("trailing")}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold tracking-wide transition-all ${
              mode === "trailing"
                ? "bg-gs-gold text-gs-bg"
                : "text-gs-muted hover:text-gs-text"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            {t.plans.types.trailing}
          </button>
        </div>
      </div>

      {/* Mode description */}
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <p className="text-sm text-gs-muted leading-relaxed">
          {mode === "basic" ? t.plans.types.basicDesc : t.plans.types.trailingDesc}
        </p>
      </div>

      {/* Limits included */}
      <div className="mb-8 rounded-xl border border-gs-border/60 bg-gs-surface/40 p-6">
        <h3 className="text-xs font-bold text-gs-gold tracking-wider mb-4 font-display uppercase">
          {t.plans.limits.title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            t.plans.limits.daily,
            t.plans.limits.weekly,
            t.plans.limits.monthly,
            t.plans.limits.trailingNote,
          ].map((limit, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gs-muted">
              <Check className="h-4 w-4 text-gs-gold shrink-0" />
              {limit}
            </div>
          ))}
        </div>
      </div>

      {/* Extra benefits row */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-gs-teal/20 bg-gs-teal/5 px-4 py-3">
          <Lock className="h-4 w-4 text-gs-teal shrink-0" />
          <span className="text-xs text-gs-text">{t.plans.commitment.vault}</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gs-gold/20 bg-gs-gold/5 px-4 py-3">
          <Award className="h-4 w-4 text-gs-gold shrink-0" />
          <span className="text-xs text-gs-text">{t.plans.diploma}</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gs-green/20 bg-gs-green/5 px-4 py-3">
          <TrendingUp className="h-4 w-4 text-gs-green shrink-0" />
          <span className="text-xs text-gs-text">{t.plans.score}</span>
        </div>
      </div>

      {/* Refund banner */}
      <div className="mb-10 flex items-center justify-center gap-2 rounded-xl border border-gs-gold/20 bg-gs-gold/[0.04] px-5 py-3">
        <RotateCcw className="h-4 w-4 text-gs-gold" />
        <span className="text-sm text-gs-text">{t.plans.guarantee}</span>
      </div>

      {/* Plans grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <Card
            key={plan.days}
            className={`relative flex flex-col border ${
              plan.popular
                ? "border-gs-gold bg-gs-gold/[0.04] shadow-glow-gold"
                : "border-gs-border/60 bg-gs-surface/40"
            }`}
          >
            {plan.popular && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gs-gold text-gs-bg border-0 text-[10px] font-bold tracking-wider px-3">
                {t.plans.commitment.popular}
              </Badge>
            )}
            <CardContent className="flex flex-1 flex-col p-6">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gs-gold" />
                <span className="text-xl font-bold text-white font-display tracking-wide">
                  {plan.days} {lang === "es" ? "DÍAS" : "DAYS"}
                </span>
              </div>

              {plan.save && (
                <Badge className="mb-2 w-fit rounded-full border border-gs-green/30 bg-gs-green/10 text-gs-green text-[10px] font-bold tracking-wider px-2.5">
                  {lang === "es" ? "AHORRA" : "SAVE"} {plan.save}
                </Badge>
              )}

              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gs-gold font-mono">${plan.price}</span>
                {plan.original && (
                  <span className="text-sm text-gs-muted line-through">${plan.original}</span>
                )}
                <span className="text-sm text-gs-muted"> USD</span>
              </div>
              <div className="mb-6 text-xs text-gs-muted">
                ~${plan.perMonth}/{lang === "es" ? "mes" : "mo"}
              </div>

              <Button
                onClick={() => openPayment(plan)}
                className={`w-full mt-auto rounded-full text-xs font-bold tracking-wide ${
                  plan.popular
                    ? "bg-gs-gold text-gs-bg hover:bg-gs-gold-light"
                    : "bg-transparent text-gs-text border border-gs-border hover:bg-gs-gold/10 hover:border-gs-gold/40 hover:text-gs-gold"
                }`}
              >
                {t.plans.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          isOpen={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          planType={mode}
          periodDays={selectedPlan.days}
          price={String(selectedPlan.price)}
        />
      )}
    </div>
  );
}
