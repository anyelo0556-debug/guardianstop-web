import { Shield, Target, Eye, XCircle } from "lucide-react";
import { useLang } from "@/hooks/useLang";

export default function About() {
  const { t } = useLang();

  const items = [
    {
      icon: Shield,
      title: t.about.who.title,
      desc: t.about.who.desc,
      accent: "border-gs-gold/30 bg-gs-gold/[0.04]",
      iconBg: "bg-gs-gold/10",
      iconColor: "text-gs-gold",
    },
    {
      icon: Target,
      title: t.about.mission.title,
      desc: t.about.mission.desc,
      accent: "border-gs-teal/30 bg-gs-teal/[0.04]",
      iconBg: "bg-gs-teal/10",
      iconColor: "text-gs-teal",
    },
    {
      icon: Eye,
      title: t.about.vision.title,
      desc: t.about.vision.desc,
      accent: "border-gs-cyan/30 bg-gs-cyan/[0.04]",
      iconBg: "bg-gs-cyan/10",
      iconColor: "text-gs-cyan",
    },
    {
      icon: XCircle,
      title: t.about.not.title,
      desc: t.about.not.desc,
      accent: "border-gs-red/30 bg-gs-red/[0.04]",
      iconBg: "bg-gs-red/10",
      iconColor: "text-gs-red",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl font-display">
          {t.about.title}
        </h2>
        <p className="mt-4 text-gs-muted max-w-2xl mx-auto text-sm md:text-base">
          {t.about.subtitle}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className={`group flex flex-col rounded-xl border p-6 transition-all duration-300 hover:scale-[1.02] ${item.accent}`}
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full border ${item.iconBg} ${item.iconColor === "text-gs-red" ? "border-gs-red/20" : item.iconColor === "text-gs-teal" ? "border-gs-teal/20" : item.iconColor === "text-gs-cyan" ? "border-gs-cyan/20" : "border-gs-gold/20"}`}>
                <Icon className={`h-5 w-5 ${item.iconColor}`} />
              </div>
              <h3 className="text-sm font-bold text-white font-display tracking-wide mb-2">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-gs-muted">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* What we are NOT — visual checklist */}
      <div className="mt-8 rounded-xl border border-gs-border/60 bg-gs-surface/20 p-6 md:p-8">
        <h3 className="text-sm font-bold text-gs-gold font-display tracking-wide mb-4 text-center">
          {t.about.not.checklistTitle}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {t.about.not.items.map((item: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gs-muted">
              <XCircle className="h-4 w-4 text-gs-red shrink-0" />
              {item}
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-sm text-gs-gold font-medium">
          {t.about.not.yes}
        </div>
      </div>
    </div>
  );
}
