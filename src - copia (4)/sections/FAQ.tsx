import { useState } from "react";
import { ChevronDown, MessageCircle, Bot } from "lucide-react";
import { useLang } from "@/hooks/useLang";

export default function FAQ() {
  const { lang } = useLang();
  const [open, setOpen] = useState<number | null>(0);

  const faqEs = [
    {
      q: "¿Qué es Guardian Stop exactamente?",
      a: "Guardian Stop es tu freno emocional automatizado. No operamos por ti, no damos señales, no somos bróker. Somos un sistema de protección que vigila tu cuenta 24/7 y cierra todo cuando cruzas tus límites de pérdida o cuando el trailing protege tus ganancias.",
    },
    {
      q: "¿Qué logro realmente con Guardian Stop?",
      a: "Un currículum de disciplina. Cada mes que cumples tu contrato sin cruzar tus límites, Guardian Stop genera un registro auditable de tu consistencia: tu Score de Disciplina, tu historial de protección, tu capacidad de gestionar riesgo bajo presión. Ese track record es tu carta de presentación ante futuros inversores. Guardian Stop no solo te protege: te convierte en un trader que atrae capital.",
    },
    {
      q: "¿Puedo retirar mi capital cuando quiera?",
      a: "No. TODAS las cuentas Guardian Stop son Cuenta Bóveda. Una vez que contratas tu plan (30, 90, 180 o 365 días), tu capital queda comprometido hasta que termine el período. No hay retiros anticipados. Esa es la disciplina que te protege de ti mismo cuando sientes pánico o euforia.",
    },
    {
      q: "¿El trailing stop realmente me protege las ganancias?",
      a: "Sí. Apenas ganes tu primer 1%, el trailing se activa y siempre resguarda el 30% de tu profit acumulado. Si ganas 2%, protege el 30% de esas ganancias. Si subes a 5%, ahora protege el 30% de ese 5%. Si el mercado se da la vuelta y toca el umbral protegido, todas tus operaciones se cierran automáticamente por ese día. No devuelvas lo ganado al mercado.",
    },
    {
      q: "¿Qué pasa si cruzo mi límite de pérdida?",
      a: "Todas tus posiciones se cierran al instante y tu cuenta se bloquea hasta las 00:00 del día siguiente. Sin negociación. Sin 'solo una más'. Es un cierre quirúrgico ejecutado por el sistema, no por tus emociones. Al día siguiente puedes operar de nuevo con tu plan intacto.",
    },
    {
      q: "¿Puedo mostrar mi Score de Disciplina públicamente?",
      a: "Sí. Después de tu primer mes completo de compromiso sin cruzar límites, se activa tu Score de Disciplina. Puedes configurar tu avatar o foto de perfil como prefieras y hacer público tu track record. Es tu carta de presentación: muestra tu consistencia, tu historial de protección y tu capacidad de gestionar riesgo ante cualquier inversor que quiera verificar tu disciplina antes de confiarte capital.",
    },
    {
      q: "¿Guardian Stop me ayuda con el overtrading?",
      a: "Absolutamente. El overtrading es una de las principales razones por las que los traders queman cuentas. Al establecer límites diarios (1%), semanales (10%) y mensuales (30%), Guardian Stop te impide seguir operando cuando ya has perdido lo permitido. También Guardiano, tu asistente IA, te alerta cuando detecta patrones de sobre-operación.",
    },
    {
      q: "¿Qué es Guardiano y cómo me ayuda?",
      a: "Guardiano es tu asistente de inteligencia artificial entrenado en psicología del trading, gestión de riesgo y control de overtrading. Está disponible 24/7 para ayudarte a configurar tus límites, recordarte por qué empezaste cuando sientas FOMO, explicarte tu Score de Disciplina y guiarte si tu cuenta se bloquea.",
    },
    {
      q: "¿Los planes mensuales se renuevan automáticamente?",
      a: "No. Contratas un período fijo: 30, 90, 180 o 365 días. Pagas una sola vez por adelantado. Al finalizar, puedes renovar o no. No hay cargos recurrentes sorpresa. Ofrecemos garantía de 7 días: si no sientes la protección, reembolso total. A partir del día 8 se confirma tu suscripción.",
    },
    {
      q: "¿Qué broker necesito usar?",
      a: "Guardian Stop se conecta a tu cuenta de futuros o forex independientemente del bróker que uses. Solo necesitas autorizar el monitoreo de tu cuenta. No movemos tu capital, no operamos por ti, solo vigilamos y cerramos cuando es necesario.",
    },
  ];

  const faqEn = [
    {
      q: "What exactly is Guardian Stop?",
      a: "Guardian Stop is your automated emotional brake. We don't trade for you, we don't give signals, we are not a broker. We are a protection system that monitors your account 24/7 and closes everything when you cross your loss limits or when trailing protects your profits.",
    },
    {
      q: "What do I really achieve with Guardian Stop?",
      a: "A discipline résumé. Every month you complete your contract without crossing your limits, Guardian Stop generates an auditable record of your consistency: your Discipline Score, your protection history, your ability to manage risk under pressure. That track record is your presentation card to future investors. Guardian Stop doesn't just protect you: it turns you into a trader who attracts capital.",
    },
    {
      q: "Can I withdraw my capital whenever I want?",
      a: "No. ALL Guardian Stop accounts are Vault Accounts. Once you contract your plan (30, 90, 180 or 365 days), your capital is committed until the period ends. No early withdrawals. That is the discipline that protects you from yourself when you feel panic or euphoria.",
    },
    {
      q: "Does the trailing stop really protect my profits?",
      a: "Yes. As soon as you earn your first 1%, trailing activates and always safeguards 30% of your accumulated profit. If you gain 2%, it protects 30% of those gains. If you climb to 5%, it now protects 30% of that 5%. If the market turns around and hits the protected threshold, all your trades close automatically for that day. Don't give your profits back to the market.",
    },
    {
      q: "What happens if I cross my loss limit?",
      a: "All your positions close instantly and your account locks until 00:00 the next day. No negotiation. No 'just one more'. It's a surgical closure executed by the system, not your emotions. The next day you can trade again with your plan intact.",
    },
    {
      q: "Can I show my Discipline Score publicly?",
      a: "Yes. After your first full month of commitment without crossing limits, your Discipline Score activates. You can configure your avatar or profile photo as you like and make your track record public. It's your presentation card: it shows your consistency, your protection history and your ability to manage risk to any investor who wants to verify your discipline before trusting you with capital.",
    },
    {
      q: "Does Guardian Stop help with overtrading?",
      a: "Absolutely. Overtrading is one of the main reasons traders blow up accounts. By setting daily (1%), weekly (10%) and monthly (30%) limits, Guardian Stop prevents you from continuing to trade when you've already lost what's allowed. Guardiano, your AI assistant, also alerts you when it detects overtrading patterns.",
    },
    {
      q: "What is Guardiano and how does it help me?",
      a: "Guardiano is your artificial intelligence assistant trained in trading psychology, risk management and overtrading control. Available 24/7 to help you configure your limits, remind you why you started when you feel FOMO, explain your Discipline Score and guide you if your account gets blocked.",
    },
    {
      q: "Do monthly plans auto-renew?",
      a: "No. You contract a fixed period: 30, 90, 180 or 365 days. You pay once upfront. At the end, you can renew or not. No surprise recurring charges. We offer a 7-day guarantee: if you don't feel the protection, full refund. From day 8 your subscription is confirmed.",
    },
    {
      q: "What broker do I need to use?",
      a: "Guardian Stop connects to your futures or forex account regardless of which broker you use. You only need to authorize account monitoring. We don't move your capital, we don't trade for you, we just watch and close when necessary.",
    },
  ];

  const items = lang === "es" ? faqEs : faqEn;

  return (
    <div className="mx-auto max-w-4xl px-4 py-20 md:py-28">
      <div className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gs-teal/20 bg-gs-teal/5 px-4 py-1.5 text-[10px] font-bold text-gs-teal tracking-wider">
          <Bot className="h-3 w-3" />
          {lang === "es" ? "GUARDIANO RESPONDE" : "GUARDIAN ANSWERS"}
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl font-display">
          {lang === "es" ? "PREGUNTAS FRECUENTES" : "FREQUENTLY ASKED QUESTIONS"}
        </h2>
        <p className="mt-4 text-gs-muted max-w-2xl mx-auto text-sm md:text-base">
          {lang === "es"
            ? "Tus dudas, resueltas por Guardiano. Sin jerga, sin complicaciones."
            : "Your questions, answered by Guardian. No jargon, no complications."}
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className={`rounded-xl border transition-all duration-300 ${
              open === i
                ? "border-gs-gold/30 bg-gs-gold/[0.03]"
                : "border-gs-border/60 bg-gs-surface/30 hover:border-gs-border"
            }`}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="h-4 w-4 text-gs-gold shrink-0" />
                <span className="text-sm font-bold text-white font-display tracking-wide">
                  {item.q}
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-gs-muted shrink-0 transition-transform duration-300 ${
                  open === i ? "rotate-180" : ""
                }`}
              />
            </button>
            {open === i && (
              <div className="px-5 pb-4 pt-0">
                <div className="flex gap-3 pl-7">
                  <div className="mt-1 h-6 w-6 shrink-0 rounded-full border border-gs-teal/30 bg-gs-teal/10 flex items-center justify-center">
                    <Bot className="h-3 w-3 text-gs-teal" />
                  </div>
                  <p className="text-sm leading-relaxed text-gs-muted">
                    {item.a}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
