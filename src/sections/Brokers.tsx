import { Handshake } from "lucide-react";
import { useLang } from "@/hooks/useLang";

export default function Brokers() {
  const { lang } = useLang();
  const isEs = lang === "es";

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
      <div className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gs-gold/20 bg-gs-gold/5 px-4 py-1.5 text-[10px] font-bold text-gs-gold tracking-wider">
          <Handshake className="h-3 w-3" />
          {isEs ? "PARA BROKERS" : "FOR BROKERS"}
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl font-display">
          {isEs ? "ALIANZAS ESTRATÉGICAS" : "STRATEGIC ALLIANCES"}
        </h2>
        <p className="mt-6 text-gs-muted max-w-3xl mx-auto text-sm md:text-base leading-relaxed">
          {isEs
            ? "Estamos en conversaciones con los principales brokers del mercado. Pronto anunciaremos nuestros partners oficiales."
            : "We are in conversations with the leading brokers in the market. We will soon announce our official partners."}
        </p>
      </div>

      {/* Placeholder grid for broker logos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex h-28 items-center justify-center rounded-xl border border-dashed border-gs-border/40 bg-gs-surface/20"
          >
            <span className="text-xs text-gs-muted/50 font-medium">
              {isEs ? "Próximamente" : "Coming soon"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
