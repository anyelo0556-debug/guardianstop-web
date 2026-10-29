import { useState } from "react";
import { CheckCircle2, XCircle, HelpCircle, ArrowRight, RotateCcw } from "lucide-react";
import { useLang } from "@/hooks/useLang";

type Question = {
  q: string;
  a: boolean;
  correct: string;
  wrong: string;
};

export default function MindsetQuiz() {
  const { lang } = useLang();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(boolean | null)[]>([]);
  const [showResult, setShowResult] = useState(false);

  const questions: Question[] = lang === "es" ? [
    {
      q: "Los mejores traders ganan porque tienen estrategias secretas que nadie más conoce.",
      a: false,
      correct: "FALSO. Los mejores traders ganan por disciplina, no por estrategias secretas. Paul Tudor Jones dice que el 90% del trading es psicología, no técnica.",
      wrong: "Incorrecto. La estrategia es el 10%. La ejecución disciplinada es el 90%.",
    },
    {
      q: "Un trader profesional puede controlar sus emociones el 100% del tiempo sin ayuda.",
      a: false,
      correct: "FALSO. Ningún humano controla sus emociones 100% del tiempo. Por eso los hedge funds tienen departamentos de risk management. Guardian Stop ES ese departamento para el trader independiente.",
      wrong: "Incorrecto. Todos los traders tienen malos días. La diferencia está en tener un freno cuando la psicología falla.",
    },
    {
      q: "Si pierdo 1% hoy, debo operar más para recuperarlo antes de que cierre el mercado.",
      a: false,
      correct: "FALSO. Eso es el ciclo de la muerte del trader. Operar para 'recuperar' convierte pérdidas de $50 en pérdidas de $500. Los profesionales aceptan el día y vuelven mañana con el plan intacto.",
      wrong: "Incorrecto. El overtrading para recuperar es la razón #1 por la que los traders queman cuentas.",
    },
    {
      q: "El trailing stop que protege el 30% de mis ganancias me saca 'antes de tiempo' y me hace perder dinero.",
      a: false,
      correct: "FALSO. Si ganaste 5% y el trailing te sacó protegiendo el 30%, te llevaste +3.5% ese día. La codicia de 'querer un poco más' es lo que convierte ganancias en pérdidas.",
      wrong: "Incorrecto. El trailing te dice: 'Toma tus ganancias y vive para operar mañana.' El que siempre quiere más nunca retiene capital.",
    },
    {
      q: "Un track record auditable de disciplina durante 90 días tiene valor real para atraer inversores.",
      a: true,
      correct: "VERDADERO. En un mundo donde cualquiera abre una cuenta y se llama 'trader', la evidencia auditable de consistencia es tu ventaja competitiva. Los inversores no compran promesas, compran pruebas.",
      wrong: "Incorrecto. Los inversores confían en datos, no en palabras. Un Score de Disciplina del 95% durante 90 días es evidencia real.",
    },
    {
      q: "Bloquear mi cuenta cuando cruzo mi límite es una trampa, no una protección.",
      a: false,
      correct: "FALSO. El bloqueo ejecuta exactamente lo que tú decidiste cuando estabas racional. Ese 'adulto racional' puso el límite del 1%. El 'adulto emocional' que quiere recuperar es quien lo cruza.",
      wrong: "Incorrecto. No es una trampa, es un contrato contigo mismo. Tú firmaste los límites. El sistema solo los hace cumplir.",
    },
    {
      q: "El mercado premia la inteligencia. Los traders más inteligentes ganan más.",
      a: false,
      correct: "FALSO. El mercado premia la consistencia, no la inteligencia. Hay matemáticos de Wall Street que quemaron fortunas. Y hay traders con estrategias simples que ganan durante décadas porque nunca rompen sus reglas.",
      wrong: "Incorrecto. La inteligencia sin disciplina es peligrosa en el trading. La consistencia nace de reglas que se respetan.",
    },
  ] : [
    {
      q: "The best traders win because they have secret strategies no one else knows.",
      a: false,
      correct: "FALSE. The best traders win because of discipline, not secret strategies. Paul Tudor Jones says 90% of trading is psychology, not technique.",
      wrong: "Incorrect. Strategy is 10%. Disciplined execution is 90%.",
    },
    {
      q: "A professional trader can control their emotions 100% of the time without help.",
      a: false,
      correct: "FALSE. No human controls emotions 100% of the time. That's why hedge funds have risk management departments. Guardian Stop IS that department for the independent trader.",
      wrong: "Incorrect. All traders have bad days. The difference is having a brake when psychology fails.",
    },
    {
      q: "If I lose 1% today, I should trade more to recover it before the market closes.",
      a: false,
      correct: "FALSE. That's the trader's death cycle. Trading to 'recover' turns $50 losses into $500 losses. Professionals accept the day and return tomorrow with the plan intact.",
      wrong: "Incorrect. Overtrading to recover is the #1 reason traders blow up accounts.",
    },
    {
      q: "A trailing stop that protects 30% of my profits takes me out 'too early' and makes me lose money.",
      a: false,
      correct: "FALSE. If you gained 5% and trailing exited protecting 30%, you walked away with +3.5% that day. Greed for 'a little more' is what turns profits into losses.",
      wrong: "Incorrect. Trailing says: 'Take your profits and live to trade tomorrow.' Those who always want more never retain capital.",
    },
    {
      q: "An auditable track record of discipline for 90 days has real value for attracting investors.",
      a: true,
      correct: "TRUE. In a world where anyone opens an account and calls themselves a 'trader', auditable evidence of consistency is your competitive advantage. Investors don't buy promises, they buy proof.",
      wrong: "Incorrect. Investors trust data, not words. A 95% Discipline Score over 90 days is real evidence.",
    },
    {
      q: "Blocking my account when I cross my limit is a trap, not protection.",
      a: false,
      correct: "FALSE. The block executes exactly what YOU decided when you were rational. That 'rational adult' set the 1% limit. The 'emotional adult' who wants to recover is the one crossing it.",
      wrong: "Incorrect. It's not a trap, it's a contract with yourself. You signed the limits. The system just enforces them.",
    },
    {
      q: "The market rewards intelligence. The smartest traders win the most.",
      a: false,
      correct: "FALSE. The market rewards consistency, not intelligence. There are Wall Street mathematicians who blew fortunes. And there are traders with simple strategies who win for decades because they never break their rules.",
      wrong: "Incorrect. Intelligence without discipline is dangerous in trading. Consistency comes from respected rules.",
    },
  ];

  const handleAnswer = (val: boolean) => {
    const newAnswers = [...answers];
    newAnswers[step] = val;
    setAnswers(newAnswers);
  };

  const goNext = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      setShowResult(true);
    }
  };

  const correctCount = answers.filter((a, i) => a === questions[i].a).length;
  const isCorrect = answers[step] === questions[step].a;

  const reset = () => {
    setStep(0);
    setAnswers([]);
    setShowResult(false);
  };

  if (showResult) {
    const pct = Math.round((correctCount / questions.length) * 100);
    const isReady = pct >= 80;
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border border-gs-gold/30 bg-gs-gold/10">
          {isReady ? (
            <CheckCircle2 className="h-10 w-10 text-gs-green" />
          ) : (
            <HelpCircle className="h-10 w-10 text-gs-gold" />
          )}
        </div>
        <h3 className="text-2xl font-bold text-white font-display mb-2">
          {lang === "es" ? "TU RESULTADO" : "YOUR RESULT"}
        </h3>
        <p className="text-4xl font-bold text-gs-gold font-mono mb-4">
          {correctCount}/{questions.length} ({pct}%)
        </p>
        <p className="text-sm text-gs-muted mb-6 max-w-md mx-auto leading-relaxed">
          {isReady
            ? (lang === "es"
                ? "Tienes la mentalidad correcta. Ahora necesitas el sistema que la proteja. Guardian Stop es ese sistema."
                : "You have the right mindset. Now you need the system that protects it. Guardian Stop is that system.")
            : (lang === "es"
                ? "Aún hay mitos que crees ciertos. No es tu culpa: la industria te los vendió. Guardian Stop te ayuda a romperlos."
                : "There are still myths you believe. It's not your fault: the industry sold them to you. Guardian Stop helps you break them.")}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full border border-gs-border px-5 py-2.5 text-xs font-bold text-gs-muted hover:border-gs-gold/40 hover:text-gs-gold transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {lang === "es" ? "Reintentar" : "Try Again"}
        </button>
      </div>
    );
  }

  const current = questions[step];
  const answered = answers[step] !== undefined && answers[step] !== null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 md:py-28">
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gs-gold/20 bg-gs-gold/5 px-4 py-1.5 text-[10px] font-bold text-gs-gold tracking-wider">
          <HelpCircle className="h-3 w-3" />
          {lang === "es" ? "TEST DE MENTALIDAD" : "MINDSET TEST"}
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl font-display">
          {lang === "es" ? "VERDADERO O FALSO" : "TRUE OR FALSE"}
        </h2>
        <p className="mt-3 text-gs-muted max-w-xl mx-auto text-sm">
          {lang === "es"
            ? "7 mitos del trading que el 90% de los traders cree. Descubre cuántos aún te controlan."
            : "7 trading myths that 90% of traders believe. Discover how many still control you."}
        </p>
      </div>

      <div className="rounded-xl border border-gs-border/60 bg-gs-surface/30 p-6 md:p-8">
        {/* Progress */}
        <div className="mb-6 flex items-center justify-between">
          <span className="text-[10px] font-bold text-gs-muted uppercase tracking-wider">
            {lang === "es" ? "Pregunta" : "Question"} {step + 1} {lang === "es" ? "de" : "of"} {questions.length}
          </span>
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full ${
                  i < step ? "bg-gs-gold" : i === step ? "bg-gs-gold/60" : "bg-gs-border"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Question */}
        <p className="text-base font-bold text-white font-display leading-relaxed mb-6">
          {current.q}
        </p>

        {/* Options */}
        {!answered ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleAnswer(true)}
              className="flex items-center justify-center gap-2 rounded-lg border border-gs-border bg-gs-bg px-4 py-3 text-sm font-bold text-gs-text hover:border-gs-green/40 hover:text-gs-green transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              {lang === "es" ? "VERDADERO" : "TRUE"}
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className="flex items-center justify-center gap-2 rounded-lg border border-gs-border bg-gs-bg px-4 py-3 text-sm font-bold text-gs-text hover:border-gs-red/40 hover:text-gs-red transition-all"
            >
              <XCircle className="h-4 w-4" />
              {lang === "es" ? "FALSO" : "FALSE"}
            </button>
          </div>
        ) : (
          <div className={`rounded-lg border p-4 ${isCorrect ? "border-gs-green/30 bg-gs-green/[0.04]" : "border-gs-red/30 bg-gs-red/[0.04]"}`}>
            <div className="flex items-start gap-3">
              {isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-gs-green shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-gs-red shrink-0 mt-0.5" />
              )}
              <p className="text-sm leading-relaxed text-gs-muted">
                {isCorrect ? current.correct : current.wrong}
              </p>
            </div>
            {!isCorrect && (
              <p className="mt-2 pl-8 text-xs text-gs-gold">
                {current.correct}
              </p>
            )}
            <button
              onClick={goNext}
              className="mt-4 ml-8 inline-flex items-center gap-1 rounded-full bg-gs-gold px-4 py-2 text-xs font-bold text-gs-bg hover:bg-gs-gold-light transition-colors"
            >
              {step < questions.length - 1
                ? (lang === "es" ? "Siguiente" : "Next")
                : (lang === "es" ? "Ver Resultado" : "See Result")}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
