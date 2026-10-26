import { TrendingUp, Users, Shield, DollarSign, BarChart3, Handshake, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { useLang } from "@/hooks/useLang";
import { useState } from "react";

export default function Brokers({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { lang } = useLang();
  const isEs = lang === "es";
  const [showDetails, setShowDetails] = useState(false);

  const t = {
    hero: {
      badge: isEs ? "PARA BROKERS" : "FOR BROKERS",
      title1: isEs ? "RETÉN A TUS TRADERS" : "RETAIN YOUR TRADERS",
      title2: isEs ? "ANTES DE QUE SE VAYAN" : "BEFORE THEY LEAVE",
      subtitle: isEs
        ? "El 40% de los traders que se queman migran a prop firms. No por spreads. No por plataforma. Por disciplina. Ofreceles lo que realmente buscan."
        : "40% of burned traders migrate to prop firms. Not for spreads. Not for platform. For discipline. Give them what they really want.",
      cta: isEs ? "VER PROPUESTA COMPLETA" : "SEE FULL PROPOSAL",
    },
    problem: {
      title: isEs ? "EL PROBLEMA QUE NADIE VE" : "THE PROBLEM NO ONE SEES",
      stats: [
        { value: "80%", label: isEs ? "de traders retail pierden dinero en 6 meses" : "of retail traders lose money in 6 months" },
        { value: "40%", label: isEs ? "de ellos migran a prop firms tras quemarse" : "migrate to prop firms after burning out" },
        { value: "$0", label: isEs ? "comisiones que genera un trader quemado" : "commissions from a burned-out trader" },
      ],
    },
    irony: {
      title: isEs ? "LA IRONÍA" : "THE IRONY",
      desc: isEs
        ? "El trader paga $200-$500 a una prop firm POR EVALUACIÓN para que le impongan disciplina. Si la reprueba, paga otra. Y otra. Está dispuesto a pagar por no quemarse. Pero se lo cobran las prop firms, no el broker."
        : "The trader pays $200-$500 to a prop firm PER EVALUATION for imposed discipline. If they fail, they pay again. And again. They're willing to pay not to blow up. But prop firms charge them, not the broker.",
    },
    solution: {
      title: isEs ? "LA SOLUCIÓN" : "THE SOLUTION",
      items: [
        {
          icon: Shield,
          title: isEs ? "Protección automática de cuenta" : "Automatic account protection",
          desc: isEs
            ? "Límites diarios (1%), semanales (10%), mensuales (30%). Trailing stop que protege ganancias. El trader no puede quemar la cuenta."
            : "Daily limits (1%), weekly (10%), monthly (30%). Trailing stop that protects profits. The trader cannot blow the account.",
        },
        {
          icon: TrendingUp,
          title: isEs ? "Trailing stop inteligente" : "Smart trailing stop",
          desc: isEs
            ? "Activa al 1% de profit. Siempre resguarda el 30% de lo acumulado. Si el mercado se da la vuelta, cierra todo automáticamente."
            : "Activates at 1% profit. Always safeguards 30% of accumulated gains. If the market turns, closes everything automatically.",
        },
        {
          icon: Users,
          title: isEs ? "Score de Disciplina auditable" : "Auditable Discipline Score",
          desc: isEs
            ? "Cada mes genera un track record de consistencia. El trader puede mostrarlo públicamente. Atrae inversores. Genera lealtad."
            : "Each month generates a consistency track record. Traders can display it publicly. Attracts investors. Builds loyalty.",
        },
        {
          icon: BarChart3,
          title: isEs ? "Datos de comportamiento" : "Behavioral data",
          desc: isEs
            ? "Sabes en qué activos, horarios y días tus clientes pierden más. Ajusta márgenes, mejora educación, reduce riesgo de contraparte."
            : "Know which assets, hours, and days your clients lose most. Adjust margins, improve education, reduce counterparty risk.",
        },
      ],
    },
    benefits: {
      title: isEs ? "BENEFICIOS PARA EL BROKER" : "BENEFITS FOR THE BROKER",
      items: [
        { title: isEs ? "Retención de clientes" : "Client retention", desc: isEs ? "Trader protegido = cliente que dura años, no semanas" : "Protected trader = client lasting years, not weeks" },
        { title: isEs ? "Diferenciación" : "Differentiation", desc: isEs ? "Ningún broker retail ofrece esto. Marketing gratis." : "No retail broker offers this. Free marketing." },
        { title: isEs ? "Revenue share" : "Revenue share", desc: isEs ? "30% de cada suscripción mensual va al broker" : "30% of each monthly subscription goes to the broker" },
        { title: isEs ? "Menos chargebacks" : "Fewer chargebacks", desc: isEs ? "Trader que no quema = menos disputas de tarjeta" : "Trader who doesn't blow up = fewer card disputes" },
        { title: isEs ? "Datos valiosos" : "Valuable data", desc: isEs ? "Comportamiento de riesgo de tus clientes en tiempo real" : "Real-time risk behavior of your clients" },
        { title: isEs ? "White-label" : "White-label", desc: isEs ? "'Protección [Broker] powered by Guardian Stop'" : "'[Broker] Protection powered by Guardian Stop'" },
      ],
    },
    comparison: {
      title: isEs ? "CON O SIN GUARDIAN STOP" : "WITH OR WITHOUT GUARDIAN STOP",
      with: [
        isEs ? "Trader dura 2+ años generando comisiones" : "Trader lasts 2+ years generating commissions",
        isEs ? "Menos cuentas abandonadas" : "Fewer abandoned accounts",
        isEs ? "Menos soporte por quejas" : "Less support from complaints",
        isEs ? "Diferenciación real vs competencia" : "Real differentiation vs competitors",
        isEs ? "Ingreso recurrente por revenue share" : "Recurring income from revenue share",
      ],
      without: [
        isEs ? "Trader quema cuenta en 2-6 meses" : "Trader blows account in 2-6 months",
        isEs ? "Se va a una prop firm y no vuelve" : "Goes to prop firm and never returns",
        isEs ? "Chargebacks y disputas" : "Chargebacks and disputes",
        isEs ? "Pierde contra brokers con prop firms" : "Loses to brokers with prop firm partnerships",
        isEs ? "Cero ingresos del trader quemado" : "Zero income from burned trader",
      ],
    },
    proposal: {
      title: isEs ? "PROPUESTA DE IMPLEMENTACIÓN" : "IMPLEMENTATION PROPOSAL",
      steps: [
        { num: "1", title: isEs ? "Prueba piloto 30 días" : "30-day pilot", desc: isEs ? "50 cuentas demo. Sin compromiso. Usted ve los números." : "50 demo accounts. No commitment. You see the numbers." },
        { num: "2", title: isEs ? "Integración API" : "API integration", desc: isEs ? "Conexión a su sistema en 2-4 semanas. Solo lectura + cierre." : "Connection to your system in 2-4 weeks. Read-only + close." },
        { num: "3", title: isEs ? "Lanzamiento escalonado" : "Staggered launch", desc: isEs ? "Empieza con cuentas premium. Escala según resultados." : "Start with premium accounts. Scale based on results." },
      ],
    },
    cta: {
      title: isEs ? "HABLEMOS" : "LET'S TALK",
      subtitle: isEs
        ? "Prueba piloto de 30 días, 50 cuentas demo, sin costo. Usted ve la retención. Después decidimos."
        : "30-day pilot, 50 demo accounts, at no cost. You see the retention. Then we decide.",
      button: isEs ? "AGENDAR REUNIÓN" : "SCHEDULE MEETING",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
      {/* HERO */}
      <div className="mb-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gs-gold/20 bg-gs-gold/5 px-4 py-1.5 text-[10px] font-bold text-gs-gold tracking-wider">
          <Handshake className="h-3 w-3" />
          {t.hero.badge}
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl font-display">
          {t.hero.title1}
          <span className="text-glow block text-gs-gold mt-1">{t.hero.title2}</span>
        </h2>
        <p className="mt-6 text-gs-muted max-w-3xl mx-auto text-sm md:text-base leading-relaxed">
          {t.hero.subtitle}
        </p>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gs-gold px-8 py-3 text-sm font-bold text-gs-bg hover:bg-gs-gold-light transition-colors"
        >
          {t.hero.cta}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* PROBLEM STATS */}
      <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        {t.problem.stats.map((s, i) => (
          <div key={i} className="rounded-xl border border-gs-border/60 bg-gs-surface/30 p-6 text-center">
            <div className="text-4xl font-bold text-gs-gold font-display">{s.value}</div>
            <div className="mt-2 text-sm text-gs-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* IRONY */}
      <div className="mb-12 rounded-xl border border-gs-gold/30 bg-gs-gold/[0.04] p-8 text-center">
        <h3 className="text-lg font-bold text-gs-gold font-display mb-3">
          {t.irony.title}
        </h3>
        <p className="text-sm text-gs-muted leading-relaxed max-w-3xl mx-auto">
          {t.irony.desc}
        </p>
      </div>

      {/* SOLUTION */}
      <div className="mb-12">
        <h3 className="text-2xl font-bold text-white font-display text-center mb-8">
          {t.solution.title}
        </h3>
        <div className="grid gap-5 md:grid-cols-2">
          {t.solution.items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-start gap-4 rounded-xl border border-gs-border/60 bg-gs-surface/30 p-6 hover:border-gs-gold/30 transition-all">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gs-gold/20 bg-gs-gold/5">
                  <Icon className="h-5 w-5 text-gs-gold" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-display mb-1">{item.title}</h4>
                  <p className="text-sm text-gs-muted leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BENEFITS */}
      <div className="mb-12">
        <h3 className="text-2xl font-bold text-white font-display text-center mb-8">
          {t.benefits.title}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.benefits.items.map((b, i) => (
            <div key={i} className="rounded-xl border border-gs-border/60 bg-gs-surface/30 p-5 hover:border-gs-gold/30 transition-all">
              <DollarSign className="h-5 w-5 text-gs-gold mb-2" />
              <h4 className="text-sm font-bold text-white font-display mb-1">{b.title}</h4>
              <p className="text-xs text-gs-muted">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* COMPARISON */}
      <div className="mb-12 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gs-green/30 bg-gs-green/[0.04] p-6">
          <h4 className="text-sm font-bold text-gs-green font-display mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {isEs ? "CON GUARDIAN STOP" : "WITH GUARDIAN STOP"}
          </h4>
          <ul className="space-y-3">
            {t.comparison.with.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gs-muted">
                <CheckCircle className="h-4 w-4 text-gs-green shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.04] p-6">
          <h4 className="text-sm font-bold text-red-400 font-display mb-4 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            {isEs ? "SIN GUARDIAN STOP" : "WITHOUT GUARDIAN STOP"}
          </h4>
          <ul className="space-y-3">
            {t.comparison.without.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gs-muted">
                <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* PROPOSAL STEPS */}
      <div className="mb-12">
        <h3 className="text-2xl font-bold text-white font-display text-center mb-8">
          {t.proposal.title}
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          {t.proposal.steps.map((step, i) => (
            <div key={i} className="relative rounded-xl border border-gs-border/60 bg-gs-surface/30 p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gs-gold text-gs-bg font-bold text-lg font-display">
                {step.num}
              </div>
              <h4 className="text-sm font-bold text-white font-display mb-2">{step.title}</h4>
              <p className="text-xs text-gs-muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-xl border border-gs-gold/30 bg-gs-gold/[0.06] p-8 text-center">
        <h3 className="text-xl font-bold text-gs-gold font-display mb-2">{t.cta.title}</h3>
        <p className="text-sm text-gs-muted mb-6 max-w-2xl mx-auto">{t.cta.subtitle}</p>
        <button
          onClick={() => onNavigate("contact")}
          className="inline-flex items-center gap-2 rounded-full bg-gs-gold px-8 py-3 text-sm font-bold text-gs-bg hover:bg-gs-gold-light transition-colors"
        >
          {t.cta.button}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
