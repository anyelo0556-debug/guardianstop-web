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

          {/* RIGHT: Large Shield — MÁS GRANDE */}
          <div className="flex items-center justify-center order-1 lg:order-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gs-gold/[0.06] blur-[100px] scale-125" />
              <img
                src="/logo-shield.png"
                alt="Guardian Stop"
                className="relative h-80 w-auto md:h-[420px] lg:h-[480px] object-contain drop-shadow-[0_0_80px_rgba(201,168,76,0.2)]"
              />
            </div>
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
