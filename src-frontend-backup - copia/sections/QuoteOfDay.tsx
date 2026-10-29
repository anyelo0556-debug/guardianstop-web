import { useState } from "react";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLang } from "@/hooks/useLang";
import { quotes } from "@/data/quotes";

export default function QuoteOfDay() {
  const { lang, t } = useLang();
  const [index, setIndex] = useState(0);

  const q = quotes[index][lang];

  const prev = () => setIndex((i) => (i === 0 ? quotes.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === quotes.length - 1 ? 0 : i + 1));

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl font-display">
          {t.quote.title}
        </h2>
        <p className="mt-4 text-gs-muted max-w-2xl mx-auto text-sm md:text-base">
          {t.quote.subtitle}
        </p>
      </div>

      <Card className="border-gs-border/60 bg-gs-surface/40 max-w-3xl mx-auto">
        <CardContent className="p-8 md:p-10 relative">
          <Quote className="absolute left-6 top-6 h-10 w-10 text-gs-gold/10" />

          <div className="text-center">
            <div className="text-lg italic leading-relaxed text-gs-text md:text-xl mb-8 font-display">
              "{q.text}"
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="h-px w-20 bg-gs-gold/30" />
              <span className="text-sm font-bold text-gs-gold font-display tracking-wider">
                {q.author.toUpperCase()}
              </span>
              <span className="rounded-full bg-gs-gold/10 px-4 py-1 text-[10px] font-mono text-gs-gold border border-gs-gold/20">
                {q.tag.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={prev}
              className="flex items-center gap-1 rounded-full border border-gs-border px-4 py-2 text-xs text-gs-muted hover:border-gs-gold/40 hover:text-gs-gold transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> {lang === "es" ? "Anterior" : "Previous"}
            </button>
            <span className="text-[10px] font-mono text-gs-muted">
              {index + 1} / {quotes.length}
            </span>
            <button
              onClick={next}
              className="flex items-center gap-1 rounded-full border border-gs-border px-4 py-2 text-xs text-gs-muted hover:border-gs-gold/40 hover:text-gs-gold transition-colors"
            >
              {lang === "es" ? "Siguiente" : "Next"} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
