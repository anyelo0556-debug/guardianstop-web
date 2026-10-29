import { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  Ban,
  Skull,
  Lock,
  ShieldAlert,
  Play,
  RotateCcw,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FsmState = "MONITORING" | "STALE" | "BLOCKED" | "KILLING" | "LOCKED" | "LOCKED_WITH_RISK";

const states: { id: FsmState; label: string; icon: React.ElementType; color: string; desc: string }[] = [
  { id: "MONITORING", label: "MONITORING", icon: Activity, color: "text-gs-green border-gs-green bg-gs-green/10", desc: "Feed activo. Evaluando drawdown en tiempo real." },
  { id: "STALE", label: "STALE", icon: AlertTriangle, color: "text-gs-orange border-gs-orange bg-gs-orange/10", desc: "Feed degradado (>3s). Alerta sin bloqueo." },
  { id: "BLOCKED", label: "BLOCKED", icon: Ban, color: "text-gs-red border-gs-red bg-gs-red/10", desc: "Feed perdido (>8s). Bloqueo preventivo activado." },
  { id: "KILLING", label: "KILLING", icon: Skull, color: "text-gs-purple border-gs-purple bg-gs-purple/10", desc: "Breach detectado. Cierre de posiciones en ejecución." },
  { id: "LOCKED", label: "LOCKED", icon: Lock, color: "text-gs-cyan border-gs-cyan bg-gs-cyan/10", desc: "Cierre exitoso. Cuenta bloqueada hasta mañana." },
  { id: "LOCKED_WITH_RISK", label: "LOCKED_RISK", icon: ShieldAlert, color: "text-gs-red border-red-700 bg-red-950/30", desc: "Fallo crítico. Riesgo residual requiere intervención manual." },
];

const transitions: { from: FsmState; to: FsmState; label: string; trigger: string }[] = [
  { from: "MONITORING", to: "STALE", label: "Degradado", trigger: "Silencio >3s" },
  { from: "STALE", to: "MONITORING", label: "Recupera", trigger: "Balance recibido" },
  { from: "STALE", to: "BLOCKED", label: "Bloquea", trigger: "Silencio >8s" },
  { from: "MONITORING", to: "KILLING", label: "Kill", trigger: "Drawdown > límite" },
  { from: "KILLING", to: "LOCKED", label: "Éxito", trigger: "Cierre FULL" },
  { from: "KILLING", to: "KILLING", label: "Reintenta", trigger: "Partial / None" },
  { from: "KILLING", to: "LOCKED_WITH_RISK", label: "Fallo", trigger: "Max retries / Unreachable" },
  { from: "BLOCKED", to: "MONITORING", label: "Desbloquea", trigger: "Feed recuperado" },
  { from: "LOCKED", to: "MONITORING", label: "Unlock", trigger: "Operador manual" },
  { from: "LOCKED_WITH_RISK", to: "MONITORING", label: "Unlock", trigger: "Operador manual" },
];

export default function FsmVisualizer() {
  const [activeState, setActiveState] = useState<FsmState>("MONITORING");
  const [log, setLog] = useState<string[]>(["> FSM iniciado — Estado: MONITORING"]);
  const [simulating, setSimulating] = useState(false);

  const addLog = (line: string) => setLog((prev) => [line, ...prev].slice(0, 8));

  const simulate = () => {
    if (simulating) return;
    setSimulating(true);
    setLog([]);
    const sequence: { state: FsmState; msg: string; delay: number }[] = [
      { state: "MONITORING", msg: "> Estado: MONITORING — Feed estable", delay: 800 },
      { state: "MONITORING", msg: "> Drawdown calculado: 0.82%", delay: 1200 },
      { state: "KILLING", msg: "> BREACH: Drawdown 1.05% > límite 1.00%", delay: 1800 },
      { state: "KILLING", msg: "> CmdCloseAll emitido — op_id: kill-001", delay: 2200 },
      { state: "LOCKED", msg: "> CloseReport: FULL — 2 posiciones cerradas", delay: 3000 },
      { state: "LOCKED", msg: "> Cuenta bloqueada. Modo MONITORING mañana.", delay: 3400 },
    ];

    sequence.forEach(({ state, msg, delay }) => {
      setTimeout(() => {
        setActiveState(state);
        addLog(msg);
        if (state === "LOCKED") setSimulating(false);
      }, delay);
    });
  };

  useEffect(() => {
    if (!simulating && log.length === 0) {
      addLog("> Sistema listo. Presiona 'Simular breach' para ver el ciclo.");
    }
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl font-display">
          Motor FSM en Tiempo Real
        </h2>
        <p className="mt-3 text-gs-muted">
          Máquina de estados finita pura. Cada transición es determinista, trazable e irreversible sin autorización.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* State Diagram */}
        <Card className="col-span-2 border-gs-border bg-gs-surface/60">
          <CardHeader className="border-b border-gs-border pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-mono text-gs-muted">
              <Activity className="h-4 w-4 text-gs-gold" />
              DIAGRAMA DE ESTADOS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {states.map((s) => {
                const Icon = s.icon;
                const isActive = activeState === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveState(s.id);
                      addLog(`> Manual: cambio a ${s.id}`);
                    }}
                    className={`relative flex flex-col items-center gap-2 rounded-lg border p-4 transition-all ${
                      isActive
                        ? `${s.color} shadow-glow scale-[1.02]`
                        : "border-gs-border bg-gs-bg/50 text-gs-muted hover:border-gs-muted/50"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-xs font-bold font-mono">{s.label}</span>
                    {isActive && (
                      <span className="absolute -right-1 -top-1 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-current" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Transition lines info */}
            <div className="mt-6 grid gap-2 text-xs font-mono text-gs-muted">
              {transitions.map((t, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded px-2 py-1 transition-colors ${
                    activeState === t.from ? "bg-gs-gold/5 text-gs-text" : ""
                  }`}
                >
                  <span className="rounded bg-gs-surface px-1.5 py-0.5 border border-gs-border">{t.from}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="rounded bg-gs-surface px-1.5 py-0.5 border border-gs-border">{t.to}</span>
                  <span className="ml-auto text-gs-muted/60">{t.trigger}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Controls & Log */}
        <div className="flex flex-col gap-4">
          <Card className="border-gs-border bg-gs-surface/60">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-mono text-gs-muted">SIMULACIÓN</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gs-border text-xs"
                    onClick={() => {
                      setActiveState("MONITORING");
                      setLog([]);
                      setSimulating(false);
                    }}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" /> Reset
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gs-red text-white hover:bg-gs-red/90 text-xs"
                    onClick={simulate}
                    disabled={simulating}
                  >
                    <Play className="mr-1 h-3 w-3" />
                    {simulating ? "Ejecutando..." : "Simular breach"}
                  </Button>
                </div>
              </div>
              <div className="rounded bg-gs-bg p-3 font-mono text-[11px] leading-relaxed text-gs-muted border border-gs-border h-48 overflow-y-auto">
                {log.map((l, i) => (
                  <div key={i} className={l.includes("BREACH") ? "text-gs-red font-bold" : ""}>
                    {l}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gs-border bg-gs-surface/60">
            <CardContent className="p-4">
              <div className="flex items-start gap-2 text-xs text-gs-muted">
                <Info className="mt-0.5 h-4 w-4 text-gs-gold shrink-0" />
                <p>
                  El FSM es <strong className="text-gs-text">puro</strong>: no tiene side-effects. Recibe
                  inputs (balance, feed health, reportes) y emite comandos (close, reconcile, notify).
                  Toda transición se persiste en el ledger antes de ejecutar cualquier comando.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
