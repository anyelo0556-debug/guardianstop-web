import { useState, useMemo } from "react";
import { Calculator, TrendingUp, Shield, AlertTriangle, Target, DollarSign } from "lucide-react";
import { useLang } from "@/hooks/useLang";

const PRESETS = [500, 1000, 2500, 5000, 10000, 25000, 50000];

export default function RiskSimulator() {
  const { lang } = useLang();
  const [capital, setCapital] = useState<number>(5000);
  const [custom, setCustom] = useState<string>("");

  const c = useMemo(() => {
    const val = custom ? parseFloat(custom.replace(/[^0-9.]/g, "")) : capital;
    return isNaN(val) || val <= 0 ? capital : val;
  }, [capital, custom]);

  const dailyLimit = c * 0.01;
  const weeklyLimit = c * 0.10;
  const monthlyLimit = c * 0.30;

  const trailingData = [
    { profitPct: 1, profit: c * 0.01, protectedAmt: c * 0.01 * 0.30 },
    { profitPct: 2, profit: c * 0.02, protectedAmt: c * 0.02 * 0.30 },
    { profitPct: 3, profit: c * 0.03, protectedAmt: c * 0.03 * 0.30 },
    { profitPct: 5, profit: c * 0.05, protectedAmt: c * 0.05 * 0.30 },
    { profitPct: 8, profit: c * 0.08, protectedAmt: c * 0.08 * 0.30 },
  ];

  const t = lang === "es" ? {
    title: "SIMULADOR DE PROTECCIÓN",
    subtitle: "Ingresa tu capital y descubre exactamente cómo Guardian Stop protegería tu cuenta.",
    capital: "TU CAPITAL",
    preset: "Selecciona o escribe tu capital:",
    custom: "Capital personalizado",
    limits: "TUS LÍMITES DE PROTECCIÓN",
    daily: "Pérdida máxima diaria",
    weekly: "Pérdida máxima semanal",
    monthly: "Pérdida máxima mensual",
    trailing: "TRAILING — ¿CUÁNTO SE PROTEGE?",
    trailingSub: "Cuanto más ganes, más proteges. El software recalcula automáticamente.",
    profitCol: "Profit acumulado",
    protectedCol: "Protegido (30%)",
    thresholdCol: "Umbral de cierre",
    reco: "RECOMENDACIÓN DE POSICIÓN",
    recoText: "Con un riesgo del 1% por operación, tu tamaño de posición debería estar calculado para no perder más de",
    recoPerTrade: "por trade",
    note: "Estos cálculos son estimaciones basadas en tu capital inicial. Los límites reales se configuran según tu plan y perfil de riesgo.",
    day: "día",
    week: "semana",
    month: "mes",
  } : {
    title: "PROTECTION SIMULATOR",
    subtitle: "Enter your capital and discover exactly how Guardian Stop would protect your account.",
    capital: "YOUR CAPITAL",
    preset: "Select or type your capital:",
    custom: "Custom capital",
    limits: "YOUR PROTECTION LIMITS",
    daily: "Max daily loss",
    weekly: "Max weekly loss",
    monthly: "Max monthly loss",
    trailing: "TRAILING — HOW MUCH IS PROTECTED?",
    trailingSub: "The more you earn, the more you protect. The software recalculates automatically.",
    profitCol: "Accumulated profit",
    protectedCol: "Protected (30%)",
    thresholdCol: "Close threshold",
    reco: "POSITION RECOMMENDATION",
    recoText: "With 1% risk per trade, your position size should be calculated to not lose more than",
    recoPerTrade: "per trade",
    note: "These calculations are estimates based on your initial capital. Actual limits are configured according to your plan and risk profile.",
    day: "day",
    week: "week",
    month: "month",
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat(lang === "es" ? "es-US" : "en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div className="mx-auto max-w-5xl px-4 py-20 md:py-28">
      <div className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gs-gold/20 bg-gs-gold/5 px-4 py-1.5 text-[10px] font-bold text-gs-gold tracking-wider">
          <Calculator className="h-3 w-3" />
          {lang === "es" ? "HERRAMIENTA INTERACTIVA" : "INTERACTIVE TOOL"}
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl font-display">
          {t.title}
        </h2>
        <p className="mt-4 text-gs-muted max-w-2xl mx-auto text-sm md:text-base">
          {t.subtitle}
        </p>
      </div>

      {/* Capital selector */}
      <div className="mb-10 rounded-xl border border-gs-border/60 bg-gs-surface/30 p-6">
        <label className="mb-3 block text-xs font-bold text-gs-muted uppercase tracking-wider">
          {t.preset}
        </label>
        <div className="mb-4 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setCapital(p);
                setCustom("");
              }}
              className={`rounded-full px-4 py-2 text-xs font-bold tracking-wide transition-all ${
                capital === p && !custom
                  ? "bg-gs-gold text-gs-bg"
                  : "border border-gs-border text-gs-muted hover:border-gs-gold/40 hover:text-gs-text"
              }`}
            >
              {fmt(p)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <DollarSign className="h-4 w-4 text-gs-gold" />
          <input
            type="text"
            inputMode="numeric"
            placeholder={t.custom}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-gs-border bg-gs-bg px-3 py-2 text-sm text-gs-text focus:outline-none focus:border-gs-gold/50"
          />
          <span className="text-xs text-gs-muted">USD</span>
        </div>
      </div>

      {/* Limits */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gs-red/20 bg-gs-red/[0.04] p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-gs-red" />
            <span className="text-[10px] font-bold text-gs-red uppercase tracking-wider">{t.daily}</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono">{fmt(dailyLimit)}</p>
          <p className="text-[10px] text-gs-muted mt-1">1% {lang === "es" ? "del capital" : "of capital"}</p>
        </div>
        <div className="rounded-xl border border-gs-orange/20 bg-gs-orange/[0.04] p-5">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-gs-orange" />
            <span className="text-[10px] font-bold text-gs-orange uppercase tracking-wider">{t.weekly}</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono">{fmt(weeklyLimit)}</p>
          <p className="text-[10px] text-gs-muted mt-1">10% {lang === "es" ? "del capital" : "of capital"}</p>
        </div>
        <div className="rounded-xl border border-gs-gold/20 bg-gs-gold/[0.04] p-5">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-gs-gold" />
            <span className="text-[10px] font-bold text-gs-gold uppercase tracking-wider">{t.monthly}</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono">{fmt(monthlyLimit)}</p>
          <p className="text-[10px] text-gs-muted mt-1">30% {lang === "es" ? "del capital" : "of capital"}</p>
        </div>
      </div>

      {/* Trailing table */}
      <div className="mb-10 rounded-xl border border-gs-border/60 bg-gs-surface/30 p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-gs-gold" />
          <h3 className="text-sm font-bold text-gs-gold font-display tracking-wide">{t.trailing}</h3>
        </div>
        <p className="text-xs text-gs-muted mb-5">{t.trailingSub}</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gs-border/40">
                <th className="pb-3 text-left text-[10px] font-bold text-gs-muted uppercase tracking-wider">
                  {lang === "es" ? "Profit %" : "Profit %"}
                </th>
                <th className="pb-3 text-right text-[10px] font-bold text-gs-muted uppercase tracking-wider">
                  {t.profitCol}
                </th>
                <th className="pb-3 text-right text-[10px] font-bold text-gs-gold uppercase tracking-wider">
                  {t.protectedCol}
                </th>
                <th className="pb-3 text-right text-[10px] font-bold text-gs-red uppercase tracking-wider">
                  {t.thresholdCol}
                </th>
              </tr>
            </thead>
            <tbody>
              {trailingData.map((row, i) => (
                <tr key={i} className="border-b border-gs-border/20 last:border-0">
                  <td className="py-3 text-white font-bold">+{row.profitPct}%</td>
                  <td className="py-3 text-right text-gs-muted font-mono">{fmt(row.profit)}</td>
                  <td className="py-3 text-right text-gs-gold font-mono font-bold">{fmt(row.protectedAmt)}</td>
                  <td className="py-3 text-right text-gs-red font-mono">{fmt(row.profit - row.protectedAmt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Position recommendation */}
      <div className="rounded-xl border border-gs-teal/20 bg-gs-teal/[0.04] p-6">
        <div className="mb-3 flex items-center gap-2">
          <Calculator className="h-4 w-4 text-gs-teal" />
          <h3 className="text-sm font-bold text-gs-teal font-display tracking-wide">{t.reco}</h3>
        </div>
        <p className="text-sm text-gs-muted leading-relaxed">
          {t.recoText}{" "}
          <span className="font-bold text-white font-mono">{fmt(dailyLimit)}</span>{" "}
          {t.recoPerTrade}.
        </p>
        <p className="mt-4 text-[10px] text-gs-muted/60">{t.note}</p>
      </div>
    </div>
  );
}
