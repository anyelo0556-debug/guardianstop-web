import { Shield, Eye, Lock, TrendingUp } from "lucide-react";
import { useLang } from "@/hooks/useLang";

export default function HowItWorks() {
  const { t } = useLang();

  const steps = [
    { icon: Shield, title: t.how.steps[0].title, desc: t.how.steps[0].desc },
    { icon: Eye, title: t.how.steps[1].title, desc: t.how.steps[1].desc },
    { icon: Lock, title: t.how.steps[2].title, desc: t.how.steps[2].desc },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl font-display">
          {t.how.title}
        </h2>
        <p className="mt-4 text-gs-muted max-w-2xl mx-auto text-sm md:text-base">
          {t.how.subtitle}
        </p>
      </div>

      {/* 3 horizontal cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={i}
              className="group flex flex-col items-center text-center rounded-xl border border-gs-border/60 bg-gs-surface/30 p-6 hover:border-gs-gold/30 transition-all duration-300"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gs-gold/20 bg-gs-gold/5 group-hover:bg-gs-gold/10 transition-colors">
                <Icon className="h-7 w-7 text-gs-gold" />
              </div>
              <h3 className="text-sm font-bold text-white font-display tracking-wide mb-2">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-gs-muted">
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Trailing highlight - horizontal */}
      <div className="mt-6 flex items-start gap-5 rounded-xl border border-gs-gold/30 bg-gs-gold/[0.04] p-6 md:p-8">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gs-gold/30 bg-gs-gold/10">
          <TrendingUp className="h-7 w-7 text-gs-gold" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gs-gold font-display tracking-wide mb-2">
            {t.how.trailing.title}
          </h3>
          <p className="text-sm leading-relaxed text-gs-muted">
            {t.how.trailing.desc}
          </p>
        </div>
      </div>
    </div>
  );
}
