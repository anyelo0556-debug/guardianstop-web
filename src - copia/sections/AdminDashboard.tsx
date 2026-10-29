import { useState } from "react";
import {
  Radar,
  Server,
  Users,
  Activity,
  Lock,
  Cpu,
  TrendingUp,
  TrendingDown,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/hooks/useLang";

interface Account {
  id: string;
  trader: string;
  avatar: string;
  state: string;
  nl: number;
  dd: number;
  latency: number;
  plan: string;
  nextPayment: string;
  score: number;
  pnl: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  trades: number;
  discipline: number;
}

const accounts: Account[] = [
  { id: "ACC-001", trader: "Trader A", avatar: "TA", state: "MONITORING", nl: 52430, dd: 0.82, latency: 124, plan: "Trailing 90d", nextPayment: "2026-11-15", score: 87, pnl: 1250, winRate: 62, profitFactor: 1.8, avgWin: 340, avgLoss: 190, trades: 45, discipline: 92 },
  { id: "ACC-002", trader: "Trader B", avatar: "TB", state: "STALE", nl: 31800, dd: 0.45, latency: 3200, plan: "Basic 60d", nextPayment: "2026-10-30", score: 45, pnl: -890, winRate: 38, profitFactor: 0.9, avgWin: 210, avgLoss: 230, trades: 28, discipline: 55 },
  { id: "ACC-003", trader: "Trader C", avatar: "TC", state: "LOCKED", nl: 121000, dd: 1.05, latency: 89, plan: "Trailing 180d", nextPayment: "2026-12-01", score: 91, pnl: 3400, winRate: 58, profitFactor: 2.1, avgWin: 520, avgLoss: 240, trades: 67, discipline: 88 },
  { id: "ACC-004", trader: "Trader D", avatar: "TD", state: "KILLING", nl: 45200, dd: 1.12, latency: 210, plan: "Basic 90d", nextPayment: "2026-11-05", score: 34, pnl: -1200, winRate: 41, profitFactor: 0.8, avgWin: 180, avgLoss: 220, trades: 33, discipline: 40 },
  { id: "ACC-005", trader: "Trader E", avatar: "TE", state: "MONITORING", nl: 89000, dd: 0.20, latency: 98, plan: "Trailing 360d", nextPayment: "2027-01-10", score: 95, pnl: 5600, winRate: 71, profitFactor: 2.8, avgWin: 480, avgLoss: 170, trades: 82, discipline: 96 },
];

const stateColors: Record<string, string> = {
  MONITORING: "bg-gs-green/10 text-gs-green border-gs-green/30",
  STALE: "bg-gs-orange/10 text-gs-orange border-gs-orange/30",
  BLOCKED: "bg-gs-red/10 text-gs-red border-gs-red/30",
  KILLING: "bg-gs-purple/10 text-gs-purple border-gs-purple/30 animate-pulse",
  LOCKED: "bg-gs-teal/10 text-gs-teal border-gs-teal/30",
  LOCKED_WITH_RISK: "bg-red-950/30 text-red-400 border-red-800",
};

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "text-gs-green" : score >= 50 ? "text-gs-gold" : "text-gs-red";
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-16 w-16">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
          <path className="text-gs-border" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
          <path className={color} strokeDasharray={`${score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold font-mono ${color}`}>{score}</span>
        </div>
      </div>
      <span className="mt-1 text-[9px] text-gs-muted uppercase tracking-wider">{label}</span>
    </div>
  );
}

function MiniBar({ label, value, max, colorClass }: { label: string; value: number; max: number; colorClass: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[9px] text-gs-muted mb-0.5">
        <span>{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gs-border">
        <div className={`h-1.5 rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useLang();
  const [selected, setSelected] = useState<Account>(accounts[0]);

  const lockedCount = accounts.filter((a) => a.state === "LOCKED").length;
  const totalNL = accounts.reduce((a, b) => a + b.nl, 0);
  const totalPnL = accounts.reduce((a, b) => a + b.pnl, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white font-display tracking-wide">{t.admin.title}</h1>
      </div>

      {/* Global stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="border-gs-border/60 bg-gs-surface/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-gs-muted mb-1">
              <Users className="h-3.5 w-3.5" /> {t.admin.accounts}
            </div>
            <div className="text-2xl font-bold text-white font-mono">{accounts.length}</div>
          </CardContent>
        </Card>
        <Card className="border-gs-border/60 bg-gs-surface/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-gs-muted mb-1">
              <Activity className="h-3.5 w-3.5" /> {t.admin.capital}
            </div>
            <div className="text-2xl font-bold text-white font-mono">${(totalNL / 1000).toFixed(1)}k</div>
          </CardContent>
        </Card>
        <Card className="border-gs-border/60 bg-gs-surface/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-gs-muted mb-1">
              <Lock className="h-3.5 w-3.5" /> {t.admin.blocked}
            </div>
            <div className="text-2xl font-bold text-gs-teal font-mono">{lockedCount}</div>
          </CardContent>
        </Card>
        <Card className="border-gs-border/60 bg-gs-surface/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-gs-muted mb-1">
              <Server className="h-3.5 w-3.5" /> {t.admin.healthy}
            </div>
            <div className="text-2xl font-bold text-gs-green font-mono">{accounts.length}/5</div>
          </CardContent>
        </Card>
      </div>

      {/* Total P&L banner */}
      <div className={`mb-6 flex items-center justify-between rounded-xl border px-5 py-3 ${totalPnL >= 0 ? 'border-gs-green/20 bg-gs-green/5' : 'border-gs-red/20 bg-gs-red/5'}`}>
        <div className="flex items-center gap-2">
          {totalPnL >= 0 ? <TrendingUp className="h-4 w-4 text-gs-green" /> : <TrendingDown className="h-4 w-4 text-gs-red" />}
          <span className="text-xs font-bold text-gs-muted uppercase tracking-wider">P&L Total del Mes</span>
        </div>
        <span className={`text-lg font-bold font-mono ${totalPnL >= 0 ? 'text-gs-green' : 'text-gs-red'}`}>
          {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Account list */}
        <Card className="col-span-2 border-gs-border/60 bg-gs-surface/40">
          <CardHeader className="border-b border-gs-border/40 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-mono text-gs-muted">
              <Radar className="h-4 w-4 text-gs-gold" />
              CUENTAS SUPERVISADAS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-12 gap-2 border-b border-gs-border/40 px-4 py-2 text-[9px] font-bold text-gs-muted uppercase">
              <span className="col-span-2">{t.admin.table.id}</span>
              <span className="col-span-2">{t.admin.table.trader}</span>
              <span className="col-span-2">{t.admin.table.state}</span>
              <span className="col-span-2 text-right">{t.admin.table.netliq}</span>
              <span className="col-span-2">{t.admin.table.plan}</span>
              <span className="col-span-2 text-right">{t.admin.table.pnl}</span>
            </div>
            {accounts.map((acc) => (
              <div
                key={acc.id}
                onClick={() => setSelected(acc)}
                className={`grid cursor-pointer grid-cols-12 items-center gap-2 border-b border-gs-border/30 px-4 py-2.5 text-xs font-mono transition-colors hover:bg-gs-bg ${
                  selected.id === acc.id ? "bg-gs-gold/5" : ""
                }`}
              >
                <span className="col-span-2 text-gs-text">{acc.id}</span>
                <div className="col-span-2 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gs-gold/10 text-[9px] font-bold text-gs-gold border border-gs-gold/20">
                    {acc.avatar}
                  </div>
                  <span className="text-gs-muted">{acc.trader}</span>
                </div>
                <div className="col-span-2">
                  <Badge variant="outline" className={`text-[9px] font-mono ${stateColors[acc.state] || ""}`}>
                    {acc.state}
                  </Badge>
                </div>
                <span className="col-span-2 text-right text-white">${acc.nl.toLocaleString()}</span>
                <span className="col-span-2 text-[10px] text-gs-gold">{acc.plan}</span>
                <span className={`col-span-2 text-right ${acc.pnl >= 0 ? "text-gs-green" : "text-gs-red"}`}>
                  {acc.pnl >= 0 ? "+" : ""}${acc.pnl.toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Detail panel */}
        <div className="space-y-4">
          {/* Profile header */}
          <Card className="border-gs-border/60 bg-gs-surface/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gs-gold/10 text-sm font-bold text-gs-gold border-2 border-gs-gold/30">
                  {selected.avatar}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{selected.trader}</div>
                  <div className="text-[10px] text-gs-muted">{selected.plan}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[10px] text-gs-muted">{t.admin.table.nextPayment}</div>
                  <div className="text-xs font-mono text-gs-gold">{selected.nextPayment}</div>
                </div>
              </div>

              <div className={`flex items-center justify-between rounded-lg border px-3 py-2 mb-3 ${selected.pnl >= 0 ? 'border-gs-green/20 bg-gs-green/5' : 'border-gs-red/20 bg-gs-red/5'}`}>
                <span className="text-[10px] text-gs-muted">P&L Mes</span>
                <span className={`text-sm font-bold font-mono ${selected.pnl >= 0 ? 'text-gs-green' : 'text-gs-red'}`}>
                  {selected.pnl >= 0 ? "+" : ""}${selected.pnl.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gs-muted">Net Liq</span>
                <span className="text-white font-mono">${selected.nl.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gs-muted">DD%</span>
                <span className={`font-mono ${selected.dd >= 1.0 ? "text-gs-red" : "text-gs-green"}`}>{selected.dd}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gs-muted">Latencia</span>
                <span className={`font-mono ${selected.latency > 3000 ? "text-gs-red" : "text-gs-green"}`}>{selected.latency}ms</span>
              </div>
            </CardContent>
          </Card>

          {/* Score rings */}
          <Card className="border-gs-border/60 bg-gs-surface/40">
            <CardHeader className="border-b border-gs-border/40 pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-mono text-gs-muted">
                <Award className="h-3.5 w-3.5 text-gs-gold" />
                {t.admin.metrics.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex justify-around mb-4">
                <ScoreRing score={selected.score} label={t.admin.table.score} />
                <ScoreRing score={selected.discipline} label={t.admin.metrics.discipline} />
                <ScoreRing score={selected.winRate} label={t.admin.metrics.winRate} />
              </div>
              <MiniBar label={t.admin.metrics.profitFactor} value={selected.profitFactor} max={3} colorClass="bg-gs-gold" />
              <MiniBar label={t.admin.metrics.trades} value={selected.trades} max={100} colorClass="bg-gs-teal" />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="rounded-lg bg-gs-bg p-2 border border-gs-border/40 text-center">
                  <div className="text-[9px] text-gs-muted">{t.admin.metrics.avgWin}</div>
                  <div className="text-xs font-mono text-gs-green">${selected.avgWin}</div>
                </div>
                <div className="rounded-lg bg-gs-bg p-2 border border-gs-border/40 text-center">
                  <div className="text-[9px] text-gs-muted">{t.admin.metrics.avgLoss}</div>
                  <div className="text-xs font-mono text-gs-red">${selected.avgLoss}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Worker status */}
          <Card className="border-gs-border/60 bg-gs-surface/40">
            <CardContent className="p-4">
              <div className="text-[10px] text-gs-muted uppercase mb-2">Worker Status</div>
              <div className="flex items-center gap-2 text-xs">
                <Cpu className="h-3.5 w-3.5 text-gs-green" />
                <span className="text-gs-green font-mono">{t.admin.running}</span>
                <span className="text-gs-muted">— {selected.latency}ms</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
