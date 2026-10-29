import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, HelpCircle, BookOpen, Server } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const knowledge = [
  {
    q: "¿Cómo conecto Rithmic?",
    a: "Necesitas generar un token API de Rithmic con scope 'read' + 'flatten'. Ve a Rithmic API Portal → Create Token → Selecciona tu cuenta → Copia el token en Guardian Stop. NUNCA uses un token universal.",
  },
  {
    q: "¿Qué es el ledger?",
    a: "Es tu registro inmutable de vida. Cada decisión del motor (balance, kill, reconcile) se guarda con SHA-256 encadenado. Si alguien pregunta '¿por qué se cerró mi cuenta?', le mostramos el ledger. Es evidencia, no opinión.",
  },
  {
    q: "¿Puedo cambiar mi límite de drawdown?",
    a: "Sí, pero solo antes de la sesión activa. Una vez en MONITORING, el límite se congela hasta el cierre del día. Esto evita que emocionalmente subas el límite en medio de una racha perdedora.",
  },
  {
    q: "¿Qué pasa si se cae el feed?",
    a: "Fail-closed: si no recibimos datos en 8 segundos, bloqueamos. No asumimos. No esperamos. Tu cuenta está protegida incluso si nuestro servidor pierde conexión con el bróker.",
  },
  {
    q: "¿Cómo funciona la Cuenta Bóveda?",
    a: "Es un acuerdo voluntario: bloqueas retiros por 60, 90 o 180 días. Tu capital crece sin que la dopamina te obligue a retirar prematuramente. Al final del plazo, liberas con un solo clic.",
  },
];

const quickQuestions = [
  "¿Cómo conecto Rithmic?",
  "¿Qué es el ledger?",
  "¿Puedo cambiar mi límite de drawdown?",
  "¿Qué pasa si se cae el feed?",
  "¿Cómo funciona la Cuenta Bóveda?",
];

export default function GuardianoAI() {
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: "Soy Guardiano, tu soporte operativo 24/7. Pregúntame sobre brókers, configuración, riesgo o psicología de trading." },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");

    setTimeout(() => {
      const match = knowledge.find((k) => k.q.toLowerCase().includes(text.toLowerCase().slice(0, 20)));
      const reply = match
        ? match.a
        : "Entiendo tu pregunta. Para una respuesta precisa sobre ese tema, contáctame por WhatsApp o revisa la documentación técnica. Mi base de conocimiento crece cada semana.";
      setMessages((prev) => [...prev, { role: "bot", text: reply }]);
    }, 600);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl font-display">
          Guardiano AI
        </h2>
        <p className="mt-3 text-gs-muted max-w-2xl mx-auto">
          Soporte operativo entrenado con toda la documentación técnica, manuales de brókers
          y protocolos de configuración. Disponible 24/7.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat */}
        <Card className="col-span-2 flex flex-col border-gs-border bg-gs-surface/60 h-[520px]">
          <div className="flex items-center gap-2 border-b border-gs-border px-4 py-3">
            <Bot className="h-5 w-5 text-gs-gold" />
            <span className="text-sm font-bold text-white">Guardiano</span>
            <span className="ml-auto flex items-center gap-1.5 text-[10px] text-gs-green">
              <span className="h-1.5 w-1.5 rounded-full bg-gs-green animate-pulse" />
              ONLINE
            </span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "bot" && (
                  <div className="mt-1 h-6 w-6 shrink-0 rounded-full bg-gs-gold/10 flex items-center justify-center border border-gs-gold/20">
                    <Bot className="h-3.5 w-3.5 text-gs-gold" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-gs-gold text-white"
                      : "bg-gs-bg border border-gs-border text-gs-muted"
                  }`}
                >
                  {m.text}
                </div>
                {m.role === "user" && (
                  <div className="mt-1 h-6 w-6 shrink-0 rounded-full bg-gs-green/10 flex items-center justify-center border border-gs-green/20">
                    <User className="h-3.5 w-3.5 text-gs-green" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-gs-border p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
                placeholder="Pregunta sobre Rithmic, Tradovate, configuración..."
                className="flex-1 rounded-md border border-gs-border bg-gs-bg px-3 py-2 text-xs text-gs-text placeholder:text-gs-muted focus:outline-none focus:ring-1 focus:ring-gs-gold"
              />
              <Button
                size="sm"
                className="bg-gs-gold text-white hover:bg-gs-gold/90"
                onClick={() => handleSend(input)}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Sidebar: topics */}
        <div className="flex flex-col gap-4">
          <Card className="border-gs-border bg-gs-surface/60">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold text-gs-muted uppercase">
                <HelpCircle className="h-3.5 w-3.5" /> Preguntas rápidas
              </div>
              <div className="flex flex-col gap-2">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="rounded border border-gs-border bg-gs-bg px-3 py-2 text-left text-[11px] text-gs-muted transition-colors hover:border-gs-gold/40 hover:text-gs-text"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gs-border bg-gs-surface/60">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold text-gs-muted uppercase">
                <BookOpen className="h-3.5 w-3.5" /> Base de conocimiento
              </div>
              <div className="space-y-2 text-[11px] text-gs-muted">
                <div className="flex items-center gap-2">
                  <Server className="h-3 w-3 text-gs-gold" />
                  APIs: Rithmic, Tradovate, IBKR
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3 w-3 text-gs-green" />
                  Configuración de tokens
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3 w-3 text-gs-orange" />
                  Protocolos MT5 Bridge
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3 w-3 text-gs-purple" />
                  Psicología de trading
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
