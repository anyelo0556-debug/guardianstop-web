import { useState, lazy, Suspense } from "react";
import { Link } from "react-router";
import {
  Menu,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLang } from "@/hooks/useLang";
import Hero from "@/sections/Hero";
import About from "@/sections/About";
import WhoIsItFor from "@/sections/WhoIsItFor";
import HowItWorks from "@/sections/HowItWorks";
import Plans from "@/sections/Plans";
// import CandleBackground from "@/components/CandleBackground";
import GuardianoFAB from "@/components/GuardianoFAB";

const MindsetQuiz = lazy(() => import("@/sections/MindsetQuiz"));
const Vault = lazy(() => import("@/sections/Vault"));
const Guardiano = lazy(() => import("@/sections/Guardiano"));
const FAQ = lazy(() => import("@/sections/FAQ"));
const RiskSimulator = lazy(() => import("@/sections/RiskSimulator"));
const QuoteOfDay = lazy(() => import("@/sections/QuoteOfDay"));
const Contact = lazy(() => import("@/sections/Contact"));
const Brokers = lazy(() => import("@/sections/Brokers"));

const publicNav = (t: any, lang: string) => [
  { id: "about", label: t.nav.about || "Sobre Nosotros" },
  { id: "how", label: t.nav.how },
  { id: "plans", label: t.nav.plans },
  { id: "brokers", label: lang === "es" ? "Brokers" : "Brokers" },
  { id: "guardiano", label: "Guardiano" },
  { id: "quiz", label: "Test" },
  { id: "faq", label: "FAQ" },
  { id: "simulator", label: lang === "es" ? "Simulador" : "Simulator" },
  { id: "contact", label: t.nav.contact },
];

export default function HomePage() {
  const { lang, setLang, t } = useLang();
  const [active, setActive] = useState("hero");
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (id: string) => {
    setActive(id);
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-gs-bg text-gs-text font-body selection:bg-gs-gold/30">
      {/* <CandleBackground /> */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gs-border/40 bg-gs-bg/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <span className="text-lg font-bold tracking-[0.12em] text-gs-gold font-display cursor-pointer" onClick={() => scrollTo("hero")}>
            GUARDIAN STOP
          </span>

          <nav className="hidden items-center gap-8 md:flex">
            {publicNav(t, lang).map((n) => {
              const isActive = active === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => scrollTo(n.id)}
                  className={`text-[13px] font-medium tracking-wide transition-all relative pb-1 ${
                    isActive
                      ? "text-white"
                      : "text-gs-muted hover:text-white"
                  }`}
                >
                  {n.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gs-gold" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-gs-muted hover:text-gs-gold transition-colors"
            >
              <Globe className="h-3 w-3" />
              {lang.toUpperCase()}
            </button>
            <button
              onClick={() => scrollTo("plans")}
              className="rounded-full bg-gs-gold px-5 py-2 text-[12px] font-bold text-gs-bg hover:bg-gs-gold-light transition-colors"
            >
              {t.nav.protect}
            </button>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-gs-text">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="border-gs-border bg-gs-bg w-64">
                <div className="mt-6 flex flex-col gap-1">
                  {publicNav(t, lang).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => scrollTo(n.id)}
                      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                        active === n.id
                          ? "text-gs-gold"
                          : "text-gs-muted hover:text-gs-text"
                      }`}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="pt-16">
        <section id="hero"><Hero onNavigate={scrollTo} /></section>
        <section id="about" className="border-t border-gs-border/40"><About /></section>
        <section id="who" className="border-t border-gs-border/40"><WhoIsItFor /></section>
        <Suspense fallback={<div className="h-40" />}>
          <section id="quiz" className="border-t border-gs-border/40"><MindsetQuiz /></section>
        </Suspense>
        <section id="how" className="border-t border-gs-border/40"><HowItWorks /></section>
        <Suspense fallback={<div className="h-40" />}>
          <section id="vault" className="border-t border-gs-border/40"><Vault /></section>
          <section id="guardiano" className="border-t border-gs-border/40"><Guardiano /></section>
        </Suspense>
        <section id="plans" className="border-t border-gs-border/40"><Plans /></section>
        <Suspense fallback={<div className="h-40" />}>
          <section id="brokers" className="border-t border-gs-border/40"><Brokers /></section>
          <section id="faq" className="border-t border-gs-border/40"><FAQ /></section>
          <section id="simulator" className="border-t border-gs-border/40"><RiskSimulator /></section>
          <section id="quote" className="border-t border-gs-border/40"><QuoteOfDay /></section>
          <section id="contact" className="border-t border-gs-border/40"><Contact /></section>
        </Suspense>
      </main>

      <footer className="border-t border-gs-border/40 bg-gs-bg py-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center text-center">
            <p className="tracking-widest text-gs-gold font-display text-xl mb-3">
              GUARDIAN STOP
            </p>
            <div className="flex items-center gap-4 mb-4">
              <Link to="/privacy" className="text-[10px] text-gs-muted hover:text-gs-gold transition-colors">Privacidad</Link>
              <span className="text-gs-border">|</span>
              <Link to="/architecture" className="text-[10px] text-gs-muted hover:text-gs-gold transition-colors">Arquitectura Técnica</Link>
              <span className="text-gs-border">|</span>
              <Link to="/deriv" className="text-[10px] text-gs-muted hover:text-gs-gold transition-colors">Panel Deriv</Link>
            </div>
            <p className="max-w-3xl text-[10px] text-gs-muted font-mono leading-relaxed mb-4 opacity-70">
              {t.footer.disclaimer}
            </p>
            <p className="text-gs-muted/40 text-[10px]">© {new Date().getFullYear()} Guardian Stop. {t.footer.rights}</p>
          </div>
        </div>
      </footer>

      {/* Floating Guardiano chat button */}
      <GuardianoFAB />
    </div>
  );
}
