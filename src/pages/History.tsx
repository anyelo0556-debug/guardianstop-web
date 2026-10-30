import { useState, useEffect } from "react";
import { Clock, TrendingUp, TrendingDown, Shield, AlertTriangle } from "lucide-react";

interface TradeRecord {
  time: string;
  date: string;
  instrument: string;
  direction: string;
  size: number;
  profit: number;
  close_reason: string;
}

export default function History() {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar historial desde localStorage (simulado) o API
    // En producción, esto vendría de la base de datos
    const mockData: TradeRecord[] = [
      { time: "14:32:15", date: "2026-10-30", instrument: "EUR/USD", direction: "BUY", size: 2, profit: -45.50, close_reason: "LÍMITE DIARIO" },
      { time: "12:15:08", date: "2026-10-30", instrument: "US Tech 100", direction: "SELL", size: 5, profit: -120.00, close_reason: "TRAILING STOP" },
      { time: "10:45:22", date: "2026-10-30", instrument: "GBP/USD", direction: "BUY", size: 3, profit: 32.80, close_reason: "CIERRE MANUAL" },
      { time: "09:20:11", date: "2026-10-29", instrument: "Gold", direction: "BUY", size: 1, profit: -89.20, close_reason: "LÍMITE DIARIO" },
    ];
    setTrades(mockData);
    setLoading(false);
  }, []);

  const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  const wins = trades.filter(t => t.profit > 0).length;
  const losses = trades.filter(t => t.profit < 0).length;

  return (
    <div className="min-h-screen bg-gs-bg text-white p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Historial de Operaciones</h1>
            <p className="mt-1 text-sm text-gs-muted">Registro de trades cerrados por Guardian Stop</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-lg bg-gs-surface px-4 py-2 text-center">
              <p className="text-xs text-gs-muted">Total Trades</p>
              <p className="text-xl font-bold">{trades.length}</p>
            </div>
            <div className="rounded-lg bg-gs-surface px-4 py-2 text-center">
              <p className="text-xs text-gs-muted">P&L Total</p>
              <p className={`text-xl font-bold ${totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                {totalProfit >= 0 ? "+" : ""}{totalProfit.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg bg-gs-surface px-4 py-2 text-center">
              <p className="text-xs text-gs-muted">Win / Loss</p>
              <p className="text-xl font-bold text-gs-gold">{wins} / {losses}</p>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-xl border border-gs-border/60 bg-gs-surface/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gs-border/60 bg-gs-surface/40">
                <th className="px-4 py-3 text-left font-semibold text-gs-muted">Fecha / Hora</th>
                <th className="px-4 py-3 text-left font-semibold text-gs-muted">Instrumento</th>
                <th className="px-4 py-3 text-center font-semibold text-gs-muted">Dir</th>
                <th className="px-4 py-3 text-center font-semibold text-gs-muted">Tamaño</th>
                <th className="px-4 py-3 text-right font-semibold text-gs-muted">P&L</th>
                <th className="px-4 py-3 text-left font-semibold text-gs-muted">Razón de Cierre</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gs-muted">Cargando...</td></tr>
              ) : trades.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gs-muted">Sin trades registrados</td></tr>
              ) : (
                trades.map((t, i) => (
                  <tr key={i} className="border-b border-gs-border/30 hover:bg-gs-surface/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-gs-muted" />
                        <span>{t.date} {t.time}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{t.instrument}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${t.direction === "BUY" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{t.size}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span className={t.profit >= 0 ? "text-green-400" : "text-red-400"}>
                        {t.profit >= 0 ? "+" : ""}{t.profit.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {t.close_reason.includes("LÍMITE") ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                        ) : t.close_reason.includes("TRAILING") ? (
                          <Shield className="h-3.5 w-3.5 text-yellow-400" />
                        ) : (
                          <TrendingUp className="h-3.5 w-3.5 text-gs-muted" />
                        )}
                        <span className="text-xs">{t.close_reason}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <p className="mt-4 text-center text-xs text-gs-muted">
          Los datos se sincronizan desde el motor de riesgo cada vez que se cierra una posición.
        </p>
      </div>
    </div>
  );
}
