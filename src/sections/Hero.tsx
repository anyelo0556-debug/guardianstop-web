import { useLang } from "@/hooks/useLang";

export default function Hero({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { lang, t } = useLang();

  return (
    <div className="relative">
      {/* Subtle radial glow behind shield */}
      <div className="pointer-events-none absolute top-1/2 right-[15%] -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gs-gold/[0.03] blur-[100px]" />

      <div className="mx-auto max-w-7xl px-4 pt-12 pb-4 md:pt-16 md:pb-6">
        {/* TWO-COLUMN HERO — Exacto a referencia */}
        <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-8 min-h-[420px]">
          {/* LEFT: Text only */}
          <div className="flex flex-col items-start text-left order-2 lg:order-1">
            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl lg:text-[52px] font-display leading-[1.1]">
              {t.hero.title1}
              <span className="text-glow block text-gs-gold mt-1">{t.hero.title2}</span>
            </h1>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => onNavigate("how")}
                className="rounded-full border border-gs-gold/50 bg-transparent px-8 py-3 text-sm font-medium text-gs-gold hover:bg-gs-gold/10 transition-colors"
              >
                {t.hero.cta2}
              </button>
              <button
                onClick={() => onNavigate("plans")}
                className="rounded-full bg-gs-gold px-8 py-3 text-sm font-bold text-gs-bg hover:bg-gs-gold-light transition-colors"
              >
                {t.hero.cta1}
              </button>
            </div>
          </div>

          {/* RIGHT: Shield watermark — integrated, no border, larger, glowing */}
          <div className="flex items-center justify-center order-1 lg:order-2 relative">
            {/* Animated glow layers behind shield */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="absolute h-[300px] w-[300px] md:h-[400px] md:w-[400px] lg:h-[480px] lg:w-[480px] rounded-full bg-gs-gold/10 blur-[80px] animate-pulse-glow" />
              <div className="absolute h-[200px] w-[200px] md:h-[280px] md:w-[280px] lg:h-[340px] lg:w-[340px] rounded-full bg-gs-gold/20 blur-[50px] animate-pulse-glow-delayed" />
            </div>
            <img
              src="/logo-full.png"
              alt="Guardian Stop"
              className="relative h-96 w-auto md:h-[480px] lg:h-[560px] object-contain opacity-95 animate-shield-shimmer"
              style={{
                filter: 'drop-shadow(0 0 40px rgba(201,168,76,0.25)) drop-shadow(0 0 80px rgba(201,168,76,0.1))',
              }}
            />
          </div>
        </div>

        {/* Divider line */}
        <div className="mt-8 h-px w-full bg-gs-gold/20" />

        {/* STATS ROW — Exacto a referencia: 4 horizontal cards */}
        <div className="mt-8 grid w-full grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { value: "99.8%", title: lang === "es" ? "ESTRATEGIAS PROTEGIDAS" : "STRATEGIES PROTECTED", sub: lang === "es" ? "Tasa de éxito" : "Success rate" },
            { value: "10,000+", title: lang === "es" ? "TRADERS" : "TRADERS", sub: lang === "es" ? "Comunidad activa" : "Active community" },
            { value: "500M+", title: lang === "es" ? "DÓLARES" : "DOLLARS", sub: lang === "es" ? "Volumen asegurado" : "Secured volume" },
            { value: "24/7", title: lang === "es" ? "SOPORTE" : "SUPPORT", sub: lang === "es" ? "Disponibilidad premium" : "Premium availability" },
          ].map((s) => (
            <div
              key={s.title}
              className="rounded-xl border border-gs-gold/20 bg-transparent p-5 text-center hover:border-gs-gold/40 transition-all duration-300"
            >
              <div className="text-2xl font-bold text-white md:text-3xl font-display tracking-tight">{s.value}</div>
              <div className="mt-2 text-[10px] font-medium text-gs-gold uppercase tracking-wider">{s.title}</div>
              <div className="text-[9px] text-gs-muted/60 mt-1">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
