import { useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ClientDashboard() {
  const [ddPct] = useState(0.82);
  const [ddLimit] = useState(1.0);
  const [nl] = useState(52430.0);
  const [dayStart] = useState(52865.0);
  const [positions] = useState([
    { symbol: "ESU4", side: "LONG" as const, qty: 2, entry: 5523.5, pnl: -320.0 },
    { symbol: "NQU4", side: "LONG" as const, qty: 1, entry: 19850.0, pnl: -115.0 },
  ]);

  const ddProgress = (ddPct / ddLimit) * 100;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <div className="mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl font-display">
          Dashboard del Trader
        </h2>
        <p className="mt-2 text-gs-muted">
          Tu centro de comando. Drawdown, posiciones y estado de protección en tiempo real.
        </p>
      </div>

      {/* Top stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="border-gs-border bg-gs-surface/60">
          <CardContent className="p-4">
            <div className="text-xs text-gs-muted mb-1">Net Liquidation</div>
            <div className="text-xl font-bold font-mono text-white">
              ${nl.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-1 text-[10px] text-gs-muted">
              Apertura: ${dayStart.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-gs-border bg-gs-surface/60">
          <CardContent className="p-4">
            <div className="text-xs text-gs-muted mb-1">Drawdown Hoy</div>
            <div className={`text-xl font-bold font-mono ${ddPct >= ddLimit * 0.8 ? "text-gs-orange" : "text-gs-green"}`}>
              {ddPct.toFixed(2)}%
            </div>
            <div className="mt-1 text-[10px] text-gs-muted">
              Límite: {ddLimit.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        <Card className="border-gs-border bg-gs-surface/60">
          <CardContent className="p-4">
            <div className="text-xs text-gs-muted mb-1">P&L No Realizado</div>
            <div className="text-xl font-bold font-mono text-gs-red">
              -${Math.abs(positions.reduce((a, p) => a + p.pnl, 0)).toFixed(2)}
            </div>
            <div className="mt-1 text-[10px] text-gs-muted">
              {positions.length} posiciones abiertas
            </div>
          </CardContent>
        </Card>
        <Card className="border-gs-border bg-gs-surface/60">
          <CardContent className="p-4">
            <div className="text-xs text-gs-muted mb-1">Estado Guardián</div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-gs-green animate-pulse" />
              <span className="text-sm font-bold text-gs-green font-mono">MONITORING</span>
            </div>
            <div className="mt-1 text-[10px] text-gs-muted">
              Feed: <span className="text-gs-green">LIVE</span> — 124ms
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Drawdown gauge */}
        <Card className="col-span-2 border-gs-border bg-gs-surface/60">
          <CardHeader className="border-b border-gs-border pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-mono text-gs-muted">
              <Activity className="h-4 w-4 text-gs-gold" />
              MÉTRICA DE RIESGO — DRAWDOWN
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-gs-muted">0%</span>
              <span className="text-gs-orange font-bold">{ddPct.toFixed(2)}%</span>
              <span className="text-gs-red font-bold">{ddLimit.toFixed(2)}% LÍMITE</span>
            </div>
            <div className="h-3 w-full rounded-full bg-gs-bg border border-gs-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-gs-green via-gs-orange to-gs-red"
                style={{ width: `${Math.min(ddProgress, 100)}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded bg-gs-bg p-2 border border-gs-border">
                <div className="text-[10px] text-gs-muted">Distancia al límite</div>
                <div className="text-sm font-bold text-gs-orange font-mono">
                  {(ddLimit - ddPct).toFixed(2)}%
                </div>
              </div>
              <div className="rounded bg-gs-bg p-2 border border-gs-border">
                <div className="text-[10px] text-gs-muted">Pérdida restante permitida</div>
                <div className="text-sm font-bold text-white font-mono">
                  ${((nl * (ddLimit - ddPct)) / 100).toFixed(0)}
                </div>
              </div>
              <div className="rounded bg-gs-bg p-2 border border-gs-border">
                <div className="text-[10px] text-gs-muted">Score Disciplina (30d)</div>
                <div className="text-sm font-bold text-gs-green font-mono">98.4</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Positions table */}
        <Card className="border-gs-border bg-gs-surface/60">
          <CardHeader className="border-b border-gs-border pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-mono text-gs-muted">
              <BarChart3 className="h-4 w-4 text-gs-cyan" />
              POSICIONES
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {positions.map((p) => (
              <div
                key={p.symbol}
                className="flex items-center justify-between border-b border-gs-border px-4 py-3 last:border-0"
              >
                <div>
                  <div className="text-sm font-bold text-white font-mono">{p.symbol}</div>
                  <div className="text-[10px] text-gs-muted">
                    {p.qty} @ {p.entry.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono ${
                      p.side === "LONG"
                        ? "border-gs-green/30 text-gs-green bg-gs-green/10"
                        : "border-gs-red/30 text-gs-red bg-gs-red/10"
                    }`}
                  >
                    {p.side}
                  </Badge>
                  <div className={`mt-1 text-xs font-mono ${p.pnl >= 0 ? "text-gs-green" : "text-gs-red"}`}>
                    {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(0)}
                  </div>
                </div>
              </div>
            ))}
            {positions.length === 0 && (
              <div className="p-6 text-center text-xs text-gs-muted">
                Sin posiciones abiertas
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert banner */}
      <div className="mt-6 flex items-center gap-3 rounded-lg border border-gs-orange/30 bg-gs-orange/5 px-4 py-3">
        <AlertCircle className="h-5 w-5 text-gs-orange shrink-0" />
        <div className="text-xs text-gs-muted">
          <span className="font-bold text-gs-orange">Precaución:</span> Estás al {(ddPct/ddLimit*100).toFixed(0)}% de tu límite de drawdown. 
          Si alcanzas {ddLimit.toFixed(2)}%, Guardian Stop cerrará automáticamente todas las posiciones y bloqueará la cuenta.
        </div>
      </div>
    </div>
  );
}
