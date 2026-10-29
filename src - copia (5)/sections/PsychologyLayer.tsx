import { useState } from "react";
import { Brain, MessageCircle, Quote, HeartPulse } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const quotes = [
  {
    text: "El trading no es un juego de certezas, sino de probabilidades. Tu única ventaja es seguir tu sistema sin que tus emociones lo sabotee.",
    author: "Mark Douglas",
    tag: "Disciplina",
  },
  {
    text: "El mercado puede permanecer irracional más tiempo del que tú puedes permanecer solvente. Define tu riesgo antes de operar.",
    author: "John Maynard Keynes / Adaptado",
    tag: "Riesgo",
  },
  {
    text: "La paciencia es la virtud más subestimada en el trading. No operar es también una posición.",
    author: "Warren Buffett — Adaptado",
    tag: "Paciencia",
  },
  {
    text: "La consistencia no viene de ganar más, sino de perder menos cuando tu sistema dice que debes parar.",
    author: "Guardian Stop",
    tag: "Consistencia",
  },
];

const alertExamples = [
  {
    type: "BREACH",
    title: "Drawdown alcanzado — Cierre ejecutado",
    body: "Guardian Stop acaba de cerrar tus posiciones. Tu límite era 1.0% y lo alcanzaste. No es una derrota, es tu sistema protegiéndote. Descansa. Mañana es otro día.",
    quote: "La disciplina pesa gramos; el arrepentimiento pesa toneladas. — Jocko Willink",
  },
  {
    type: "STALE",
    title: "Feed degradado — Precaución",
    body: "No recibimos datos de tu bróker desde hace 4 segundos. Si supera los 8s, bloquearemos preventivamente. No opere ciegamente.",
    quote: "Operar sin datos es apostar. Apostar no es trading. — Guardian Stop",
  },
  {
    type: "LOCKED",
    title: "Cuenta bloqueada — Modo recuperación",
    body: "Tu cuenta está en LOCKED hasta la apertura de la siguiente sesión. Este bloqueo es voluntario y contractual. Respeta tu plan.",
    quote: "El mejor trade que harás hoy es no tradear. — Mark Douglas",
  },
];

export default function PsychologyLayer() {
  const [activeQuote, setActiveQuote] = useState(0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl font-display">
          Capa Conductual
        </h2>
        <p className="mt-3 text-gs-muted max-w-2xl mx-auto">
          La tecnología frena la cuenta. La psicología frena la mente. Combinadas, crean un trader invencible.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quotes carousel */}
        <Card className="border-gs-border bg-gs-surface/60">
          <CardHeader className="border-b border-gs-border pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-mono text-gs-muted">
              <Brain className="h-4 w-4 text-gs-purple" />
              PRINCIPIOS DE TRADING
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="relative rounded-lg border border-gs-border bg-gs-bg p-6">
              <Quote className="absolute left-3 top-3 h-6 w-6 text-gs-muted/20" />
              <div className="mb-4 text-sm italic leading-relaxed text-gs-text">
                "{quotes[activeQuote].text}"
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">{quotes[activeQuote].author}</div>
                  <div className="text-[10px] text-gs-muted">{quotes[activeQuote].tag}</div>
                </div>
                <div className="flex gap-1">
                  {quotes.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveQuote(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === activeQuote ? "w-6 bg-gs-purple" : "w-3 bg-gs-border"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {quotes.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setActiveQuote(i)}
                  className={`rounded border px-2 py-2 text-left text-[10px] transition-all ${
                    i === activeQuote
                      ? "border-gs-purple/40 bg-gs-purple/10 text-gs-purple"
                      : "border-gs-border bg-gs-bg text-gs-muted hover:border-gs-muted/40"
                  }`}
                >
                  {q.tag}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp alerts preview */}
        <Card className="border-gs-border bg-gs-surface/60">
          <CardHeader className="border-b border-gs-border pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-mono text-gs-muted">
              <MessageCircle className="h-4 w-4 text-gs-green" />
              ALERTAS WHATSAPP + PSICOLOGÍA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {alertExamples.map((alert, i) => (
              <div
                key={i}
                className="rounded-lg border border-gs-border bg-gs-bg p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold font-mono ${
                      alert.type === "BREACH"
                        ? "bg-gs-red/10 text-gs-red border border-gs-red/20"
                        : alert.type === "STALE"
                        ? "bg-gs-orange/10 text-gs-orange border border-gs-orange/20"
                        : "bg-gs-cyan/10 text-gs-cyan border border-gs-cyan/20"
                    }`}
                  >
                    {alert.type}
                  </span>
                  <span className="text-xs font-bold text-white">{alert.title}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-gs-muted mb-2">
                  {alert.body}
                </p>
                <div className="rounded border-l-2 border-gs-purple bg-gs-purple/5 pl-2 py-1 text-[10px] italic text-gs-muted">
                  {alert.quote}
                </div>
              </div>
            ))}

            <div className="flex items-center gap-2 rounded border border-gs-border bg-gs-bg p-2">
              <HeartPulse className="h-4 w-4 text-gs-red shrink-0" />
              <div className="text-[10px] text-gs-muted">
                Las alertas se envían <strong className="text-gs-text">antes, durante y después</strong> del evento crítico
                para anclar la mente del trader en su plan, no en su adrenalina.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
