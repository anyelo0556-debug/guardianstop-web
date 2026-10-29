import { useState } from "react";
import {
  Radar,
  Server,
  Users,
  Activity,
  AlertTriangle,
  Lock,
  Cpu,
  Wifi,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const accounts = [
  { id: "ACC-001", trader: "Trader A", state: "MONITORING" as const, nl: 52430, dd: 0.82, latency: 124, workers: 1 },
  { id: "ACC-002", trader: "Trader B", state: "STALE" as const, nl: 31800, dd: 0.45, latency: 3200, workers: 1 },
  { id: "ACC-003", trader: "Trader C", state: "LOCKED" as const, nl: 121000, dd: 1.05, latency: 89, workers: 1 },
  { id: "ACC-004", trader: "Trader D", state: "KILLING" as const, nl: 45200, dd: 1.12, latency: 210, workers: 1 },
  { id: "ACC-005", trader: "Trader E", state: "MONITORING" as const, nl: 89000, dd: 0.20, latency: 98, workers: 1 },
];

const stateColors: Record<string, string> = {
  MONITORING: "bg-gs-green/10 text-gs-green border-gs-green/30",
  STALE: "bg-gs-orange/10 text-gs-orange border-gs-orange/30",
  BLOCKED: "bg-gs-red/10 text-gs-red border-gs-red/30",
  KILLING: "bg-gs-purple/10 text-gs-purple border-gs-purple/30 animate-pulse",
  LOCKED: "bg-gs-cyan/10 text-gs-cyan border-gs-cyan/30",
  LOCKED_WITH_RISK: "bg-red-950/30 text-red-400 border-red-800",
};

export default function MasterDashboard() {
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]);

  const lockedCount = accounts.filter((a) => a.state === "LOCKED").length;
  const totalNL = accounts.reduce((a, b) => a + b.nl, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <div className="mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl font-display">
          Master Dashboard
        </h2>
        <p className="mt-2 text-gs-muted">
          Visión global de todas las cuentas protegidas, salud de workers y telemetría en tiempo real.
        </p>
      </div>

      {/* Global stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="border-gs-border bg-gs-surface/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-gs-muted mb-1">
              <Users className="h-3.5 w-3.5" /> Cuentas Activas
            </div>
            <div className="text-2xl font-bold text-white font-mono">{accounts.length}</div>
          </CardContent>
        </Card>
        <Card className="border-gs-border bg-gs-surface/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-gs-muted mb-1">
              <DollarSign className="h-3.5 w-3.5" /> Capital Protegido
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              ${(totalNL / 1000).toFixed(1)}k
            </div>
          </CardContent>
        </Card>
        <Card className="border-gs-border bg-gs-surface/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-gs-muted mb-1">
              <Lock className="h-3.5 w-3.5" /> Cuentas Bloqueadas Hoy
            </div>
            <div className="text-2xl font-bold text-gs-cyan font-mono">{lockedCount}</div>
          </CardContent>
        </Card>
        <Card className="border-gs-border bg-gs-surface/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-gs-muted mb-1">
              <Server className="h-3.5 w-3.5" /> Workers Saludables
            </div>
            <div className="text-2xl font-bold text-gs-green font-mono">{accounts.length}/5</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Account list */}
        <Card className="col-span-2 border-gs-border bg-gs-surface/60">
          <CardHeader className="border-b border-gs-border pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-mono text-gs-muted">
              <Radar className="h-4 w-4 text-gs-gold" />
              CUENTAS SUPERVISADAS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-6 gap-2 border-b border-gs-border px-4 py-2 text-[10px] font-bold text-gs-muted uppercase">
              <span>ID</span>
              <span>Trader</span>
              <span>Estado</span>
              <span className="text-right">Net Liq</span>
              <span className="text-right">DD%</span>
              <span className="text-right">Latencia</span>
            </div>
            {accounts.map((acc) => (
              <div
                key={acc.id}
                onClick={() => setSelectedAccount(acc)}
                className={`grid cursor-pointer grid-cols-6 items-center gap-2 border-b border-gs-border px-4 py-2.5 text-xs font-mono transition-colors hover:bg-gs-bg ${
                  selectedAccount.id === acc.id ? "bg-gs-gold/5" : ""
                }`}
              >
                <span className="text-gs-text">{acc.id}</span>
                <span className="text-gs-muted">{acc.trader}</span>
                <Badge
                  variant="outline"
                  className={`w-fit text-[10px] font-mono ${stateColors[acc.state] || ""}`}
                >
                  {acc.state}
                </Badge>
                <span className="text-right text-white">${acc.nl.toLocaleString()}</span>
                <span className={`text-right ${acc.dd >= 1.0 ? "text-gs-red" : "text-gs-green"}`}>
                  {acc.dd.toFixed(2)}%
                </span>
                <span className="text-right text-gs-muted">{acc.latency}ms</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Selected account detail */}
        <Card className="border-gs-border bg-gs-surface/60">
          <CardHeader className="border-b border-gs-border pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-mono text-gs-muted">
              <Activity className="h-4 w-4 text-gs-cyan" />
              DETALLE — {selectedAccount.id}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <div className="text-[10px] text-gs-muted uppercase">Estado FSM</div>
              <div className={`mt-1 inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm font-bold font-mono ${stateColors[selectedAccount.state]}`}>
                {selectedAccount.state === "MONITORING" && <Wifi className="h-3.5 w-3.5" />}
                {selectedAccount.state === "KILLING" && <AlertTriangle className="h-3.5 w-3.5" />}
                {selectedAccount.state === "LOCKED" && <Lock className="h-3.5 w-3.5" />}
                {selectedAccount.state}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-gs-muted uppercase">Drawdown</div>
              <div className="mt-1 flex items-center gap-2">
                <Progress value={(selectedAccount.dd / 1.5) * 100} className="h-2 bg-gs-bg" />
                <span className={`text-xs font-mono font-bold ${selectedAccount.dd >= 1.0 ? "text-gs-red" : "text-gs-orange"}`}>
                  {selectedAccount.dd.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded bg-gs-bg p-2 border border-gs-border">
                <div className="text-[10px] text-gs-muted">Net Liq</div>
                <div className="text-sm font-mono text-white">${selectedAccount.nl.toLocaleString()}</div>
              </div>
              <div className="rounded bg-gs-bg p-2 border border-gs-border">
                <div className="text-[10px] text-gs-muted">Latencia Feed</div>
                <div className={`text-sm font-mono ${selectedAccount.latency > 3000 ? "text-gs-red" : "text-gs-green"}`}>
                  {selectedAccount.latency}ms
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-gs-muted uppercase">Worker Salud</div>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <Cpu className="h-3.5 w-3.5 text-gs-green" />
                <span className="text-gs-green font-mono">RUNNING</span>
                <span className="text-gs-muted">— PID isolated</span>
              </div>
            </div>

            <div className="rounded bg-gs-bg p-2 border border-gs-border text-[10px] font-mono text-gs-muted">
              <div className="mb-1 text-gs-gold">Último evento ledger:</div>
              <div>#0042 — STATE_TRANSITION → {selectedAccount.state}</div>
              <div>Hash: a3f7...9e2d</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DollarSign(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
