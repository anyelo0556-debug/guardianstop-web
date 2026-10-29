import { Lock, Award, TrendingUp, Shield } from "lucide-react";
import { useLang } from "@/hooks/useLang";

export default function Vault() {
  const { lang, t } = useLang();

  const icons: Record<string, React.ReactNode> = {
    lock: <Lock className="h-7 w-7 text-gs-gold" />,
    award: <Award className="h-7 w-7 text-gs-gold" />,
    trending: <TrendingUp className="h-7 w-7 text-gs-gold" />,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
      <div className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gs-gold/20 bg-gs-gold/5 px-4 py-1.5 text-[10px] font-bold text-gs-gold tracking-wider">
          <Shield className="h-3 w-3" />
          {lang === "es" ? "COMPROMISO DE DISCIPLINA" : "DISCIPLINE COMMITMENT"}
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl font-display">
          {t.vault.title}
        </h2>
        <p className="mt-4 text-gs-muted max-w-2xl mx-auto text-sm md:text-base">
          {t.vault.subtitle}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {t.vault.features.map((f: any, i: number) => (
          <div
            key={i}
            className="group flex flex-col items-center text-center rounded-xl border border-gs-border/60 bg-gs-surface/30 p-6 hover:border-gs-gold/30 transition-all duration-300"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gs-gold/20 bg-gs-gold/5 group-hover:bg-gs-gold/10 transition-colors">
              {icons[f.icon]}
            </div>
            <h3 className="text-sm font-bold text-white font-display tracking-wide mb-2">
              {f.title}
            </h3>
            <p className="text-sm leading-relaxed text-gs-muted">
              {f.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-gs-gold/20 bg-gs-gold/[0.04] px-6 py-5 text-center">
        <p className="text-sm text-gs-muted leading-relaxed">
          {t.vault.note}
        </p>
      </div>
    </div>
  );
}
