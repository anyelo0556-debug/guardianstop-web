import { GraduationCap, User, Crown, Target } from "lucide-react";
import { useLang } from "@/hooks/useLang";

export default function WhoIsItFor() {
  const { lang } = useLang();

  const profiles = lang === "es" ? [
    {
      icon: GraduationCap,
      title: "PRINCIPIANTES",
      desc: "Estás empezando y ya sabes que el 90% de los traders novatos queman su primera cuenta. Guardian Stop te enseña disciplina desde el día uno. No aprendas a costa de tu capital.",
      tag: "Aprende protegido",
    },
    {
      icon: User,
      title: "AMATEURS",
      desc: "Llevas tiempo operando, has tenido buenos días, pero siempre terminas devolviéndolo al mercado. Sabes operar, pero te falta la estructura. Aquí la construyes.",
      tag: "Consolida tu edge",
    },
    {
      icon: Crown,
      title: "EXPERIMENTADOS",
      desc: "Dominas tu estrategia pero la psicología te traiciona en los momentos clave. Un mal día puede borrar un mes de trabajo. Guardian Stop es tu seguro de disciplina.",
      tag: "Protege lo ganado",
    },
  ] : [
    {
      icon: GraduationCap,
      title: "BEGINNERS",
      desc: "You're starting out and already know 90% of novice traders blow their first account. Guardian Stop teaches you discipline from day one. Don't learn at the cost of your capital.",
      tag: "Learn protected",
    },
    {
      icon: User,
      title: "AMATEURS",
      desc: "You've been trading for a while, you've had good days, but always end up giving it back to the market. You can trade, but lack structure. Here you build it.",
      tag: "Solidify your edge",
    },
    {
      icon: Crown,
      title: "EXPERIENCED",
      desc: "You dominate your strategy but psychology betrays you at key moments. One bad day can erase a month of work. Guardian Stop is your discipline insurance.",
      tag: "Protect what you earn",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
      <div className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gs-gold/20 bg-gs-gold/5 px-4 py-1.5 text-[10px] font-bold text-gs-gold tracking-wider">
          <Target className="h-3 w-3" />
          {lang === "es" ? "PARA TODO TIPO DE TRADER" : "FOR EVERY TYPE OF TRADER"}
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl font-display">
          {lang === "es" ? "NO IMPORTA TU NIVEL" : "YOUR LEVEL DOESN'T MATTER"}
        </h2>
        <p className="mt-4 text-gs-muted max-w-3xl mx-auto text-sm md:text-base leading-relaxed">
          {lang === "es"
            ? "No buscamos traders perfectos. Buscamos traders dispuestos a convertirse en administradores de riesgo. Aquí no importa si eres principiante, amateur o experimentado: Guardian Stop es donde construyes la disciplina que el mercado exige."
            : "We don't look for perfect traders. We look for traders willing to become risk managers. It doesn't matter if you're a beginner, amateur or experienced: Guardian Stop is where you build the discipline the market demands."}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {profiles.map((p, i) => {
          const Icon = p.icon;
          return (
            <div
              key={i}
              className="group flex flex-col rounded-xl border border-gs-border/60 bg-gs-surface/30 p-6 hover:border-gs-gold/30 transition-all duration-300"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gs-gold/20 bg-gs-gold/5 group-hover:bg-gs-gold/10 transition-colors">
                  <Icon className="h-5 w-5 text-gs-gold" />
                </div>
                <span className="rounded-full border border-gs-border/40 bg-gs-bg/50 px-2.5 py-1 text-[9px] font-bold text-gs-muted uppercase tracking-wider">
                  {p.tag}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white font-display tracking-wide mb-2">
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed text-gs-muted flex-1">
                {p.desc}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-gs-gold/20 bg-gs-gold/[0.04] p-6 text-center">
        <p className="text-sm text-gs-muted leading-relaxed">
          {lang === "es"
            ? "El mercado no premia la inteligencia. Premia la consistencia. Y la consistencia solo nace de la disciplina."
            : "The market doesn't reward intelligence. It rewards consistency. And consistency is only born from discipline."}
        </p>
      </div>
    </div>
  );
}
