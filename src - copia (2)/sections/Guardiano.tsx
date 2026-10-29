import { Bot, MessageCircle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/useLang";

export default function Guardiano() {
  const { t } = useLang();

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
      <div className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gs-teal/20 bg-gs-teal/5 px-4 py-1.5 text-[10px] font-bold text-gs-teal tracking-wider">
          <Bot className="h-3 w-3" />
          IA 24/7
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl font-display">
          {t.guardiano.title}
        </h2>
        <p className="mt-4 text-gs-muted max-w-2xl mx-auto text-sm md:text-base">
          {t.guardiano.subtitle}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 items-center">
        <Card className="border-gs-border/60 bg-gs-surface/40">
          <CardContent className="p-6 space-y-4">
            {t.guardiano.features.map((feat: string, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gs-teal/10">
                  <ChevronRight className="h-3 w-3 text-gs-teal" />
                </div>
                <span className="text-sm text-gs-text leading-relaxed">{feat}</span>
              </div>
            ))}
            <Button className="w-full mt-2 rounded-full bg-gs-teal text-gs-bg hover:bg-teal-400 font-bold tracking-wide text-xs">
              <MessageCircle className="mr-2 h-3.5 w-3.5" />
              {t.guardiano.cta}
            </Button>
          </CardContent>
        </Card>

        {/* Guardiano character */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gs-teal/10 blur-3xl scale-150" />
            <img
              src="/guardiano-avatar.png"
              alt="Guardiano"
              className="relative h-56 w-auto md:h-72 lg:h-80 object-contain drop-shadow-[0_0_40px_rgba(45,212,191,0.25)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
