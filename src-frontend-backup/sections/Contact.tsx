import { Mail, Clock, Send } from "lucide-react";
import { useLang } from "@/hooks/useLang";

export default function Contact() {
  const { t } = useLang();

  const cards = [
    { icon: Mail, title: t.contact.email, val: "soporte-@guardianstop.com", sub: "24-48h response" },
    { icon: Clock, title: t.contact.hours, val: t.contact.hoursVal, sub: "EST timezone" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl font-display">
          {t.contact.title}
        </h2>
        <p className="mt-4 text-gs-muted max-w-2xl mx-auto text-sm md:text-base">
          {t.contact.subtitle}
        </p>
      </div>

      {/* 2 horizontal contact cards */}
      <div className="grid gap-5 lg:grid-cols-2 mb-8 max-w-3xl mx-auto">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-gs-border/60 bg-gs-surface/30 p-5 hover:border-gs-gold/30 transition-all"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gs-gold/20 bg-gs-gold/5">
                <Icon className="h-5 w-5 text-gs-gold" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">{c.title}</h3>
                <p className="text-sm text-gs-muted">{c.val}</p>
                <p className="text-[10px] text-gs-muted/60">{c.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contact form - horizontal layout */}
      <div className="rounded-xl border border-gs-border/60 bg-gs-surface/30 p-6 max-w-3xl mx-auto">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gs-muted uppercase tracking-wider">{t.contact.form.name}</label>
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-gs-border bg-gs-bg px-3 py-2.5 text-sm text-gs-text focus:outline-none focus:border-gs-gold/50"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gs-muted uppercase tracking-wider">{t.contact.form.email}</label>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-gs-border bg-gs-bg px-3 py-2.5 text-sm text-gs-text focus:outline-none focus:border-gs-gold/50"
                placeholder="john@example.com"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gs-muted uppercase tracking-wider">{t.contact.form.message}</label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-gs-border bg-gs-bg px-3 py-2.5 text-sm text-gs-text focus:outline-none focus:border-gs-gold/50 resize-none"
              placeholder={t.contact.form.message}
            />
          </div>
          <button className="w-full rounded-full bg-gs-gold px-6 py-3 text-sm font-bold text-gs-bg hover:bg-gs-gold-light transition-colors flex items-center justify-center gap-2">
            <Send className="h-3.5 w-3.5" />
            {t.contact.form.send}
          </button>
        </div>
      </div>
    </div>
  );
}
