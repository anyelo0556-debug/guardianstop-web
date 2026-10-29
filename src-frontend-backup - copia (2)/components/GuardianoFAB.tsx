import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles } from "lucide-react";
import { useLang } from "@/hooks/useLang";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const responses: Record<string, string[]> = {
  es: [
    "Hola, soy Guardiano. Puedo ayudarte con dudas sobre protección de capital, límites de riesgo y cómo funciona nuestro sistema.",
    "Guardian Stop protege tu cuenta con límites automáticos: 1% diario, 10% semanal, 30% mensual. El trailing stop activa al 1% de profit.",
    "La Cuenta Bóveda bloquea retiros por 30, 90, 180 o 365 días. Durante ese período, Guardian Stop protege tu capital automáticamente.",
    "Tenemos dos planes: GUARDIAN BASIC ($19.99/mes) y GUARDIAN TRAILING ($22.99/mes). Ambos incluyen protección 24/7.",
    "Si superas el límite diario del 1%, la cuenta se bloquea automáticamente hasta las 00:00 UTC del día siguiente. Ni el broker ni soporte pueden desbloquearla.",
    "Puedes contactar a nuestro equipo en soporte-@guardianstop.com para consultas específicas sobre partnerships con brokers.",
  ],
  en: [
    "Hello, I'm Guardiano. I can help with questions about capital protection, risk limits, and how our system works.",
    "Guardian Stop protects your account with automatic limits: 1% daily, 10% weekly, 30% monthly. The trailing stop activates at 1% profit.",
    "The Vault Account locks withdrawals for 30, 90, 180 or 365 days. During that period, Guardian Stop automatically protects your capital.",
    "We have two plans: GUARDIAN BASIC ($19.99/month) and GUARDIAN TRAILING ($22.99/month). Both include 24/7 protection.",
    "If you exceed the 1% daily limit, the account locks automatically until 00:00 UTC the next day. Neither broker nor support can unlock it.",
    "You can contact our team at soporte-@guardianstop.com for specific inquiries about broker partnerships.",
  ],
};

const keywords: Record<string, { keys: string[]; respIndex: number }[]> = {
  es: [
    { keys: ["precio", "plan", "costo", "cuanto", "mensual"], respIndex: 3 },
    { keys: ["limite", "riesgo", "proteccion", "porcentaje", "bloqueo"], respIndex: 1 },
    { keys: ["boveda", "vault", "retiro", "bloquear", "dias"], respIndex: 2 },
    { keys: ["desbloquear", "desbloqueo", "quitar", "sacar"], respIndex: 4 },
    { keys: ["broker", "partner", "alianza", "contacto", "correo"], respIndex: 5 },
  ],
  en: [
    { keys: ["price", "plan", "cost", "how much", "monthly"], respIndex: 3 },
    { keys: ["limit", "risk", "protection", "percentage", "block"], respIndex: 1 },
    { keys: ["vault", "withdrawal", "lock", "days"], respIndex: 2 },
    { keys: ["unlock", "unblock", "remove"], respIndex: 4 },
    { keys: ["broker", "partner", "contact", "email"], respIndex: 5 },
  ],
};

export default function GuardianoFAB() {
  const { lang } = useLang();
  const isEs = lang === "es";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const t = {
    placeholder: isEs ? "Escribe tu pregunta..." : "Type your question...",
    welcome: isEs ? "Hola, soy Guardiano. ¿En qué puedo ayudarte?" : "Hello, I'm Guardiano. How can I help you?",
    send: isEs ? "Enviar" : "Send",
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const getResponse = (text: string): string => {
    const lower = text.toLowerCase();
    const kws = keywords[isEs ? "es" : "en"];
    for (const kw of kws) {
      if (kw.keys.some((k) => lower.includes(k))) {
        return responses[isEs ? "es" : "en"][kw.respIndex];
      }
    }
    return responses[isEs ? "es" : "en"][0];
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: getResponse(userMsg) },
      ]);
    }, 800 + Math.random() * 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => {
          setOpen(!open);
          if (messages.length === 0) {
            setMessages([{ role: "assistant", text: t.welcome }]);
          }
        }}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${
          open
            ? "bg-gs-gold text-gs-bg rotate-0"
            : "bg-gs-gold text-gs-bg animate-bounce-slow hover:shadow-[0_0_30px_rgba(201,168,76,0.5)]"
        }`}
        style={{
          boxShadow: open
            ? "0 0 20px rgba(201,168,76,0.4)"
            : "0 0 20px rgba(201,168,76,0.3), 0 4px 15px rgba(0,0,0,0.3)",
        }}
        aria-label="Guardiano Chat"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <Bot className="h-7 w-7" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
            </span>
          </div>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[90vw] max-w-[360px] rounded-2xl border border-gs-gold/30 bg-gs-bg/95 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col"
          style={{
            height: "480px",
            boxShadow: "0 0 40px rgba(201,168,76,0.15), 0 10px 40px rgba(0,0,0,0.4)",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-gs-gold/20 bg-gs-gold/10 px-4 py-3">
            <div className="relative">
              <img
                src="/guardiano-avatar.png"
                alt="Guardiano"
                className="h-9 w-9 rounded-full object-cover"
              />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-gs-bg bg-green-500"></span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Guardiano</p>
              <p className="text-[10px] text-gs-gold">
                {isEs ? "IA de Guardian Stop" : "Guardian Stop AI"}
              </p>
            </div>
            <Sparkles className="h-4 w-4 text-gs-gold" />
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gs-gold text-gs-bg rounded-br-md"
                      : "bg-gs-surface/60 text-gs-text border border-gs-border/40 rounded-bl-md"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl bg-gs-surface/60 border border-gs-border/40 px-4 py-3 rounded-bl-md">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gs-gold" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gs-gold" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gs-gold" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gs-gold/20 bg-gs-bg/80 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.placeholder}
                className="flex-1 rounded-full border border-gs-border/60 bg-gs-surface/40 px-4 py-2 text-sm text-gs-text placeholder:text-gs-muted/50 focus:outline-none focus:border-gs-gold/50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gs-gold text-gs-bg transition-all hover:bg-gs-gold-light disabled:opacity-40 disabled:hover:bg-gs-gold"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
