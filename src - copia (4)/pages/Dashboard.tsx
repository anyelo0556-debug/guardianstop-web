import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import {
  Shield, Activity, TrendingUp, TrendingDown, Lock,
  ArrowLeft, Server, Clock, Bell, History, BarChart3,
  AlertTriangle,
} from "lucide-react";

export default function Dashboard() {
  const [accountId] = useState(1); // Default account

  // tRPC queries
  const workerStatus = trpc.ig.workerStatus.useQuery();
  const accountStatus = trpc.ig.getAccountStatus.useQuery({ accountId }, {
    enabled: accountId > 0,
    refetchInterval: 3000,
  });
  const sessionStats = trpc.ig.getSessionStats.useQuery({ accountId }, {
    enabled: accountId > 0,
  });
  const protectionHistory = trpc.ig.getProtectionHistory.useQuery({ accountId, limit: 50 }, {
    enabled: accountId > 0,
  });

  const stats = sessionStats.data;
  const account = accountStatus.data?.account;

  return (
    <div className="min-h-screen bg-[#0B1426] text-[#F5F5DC]">
      {/* Header */}
      <header className="border-b border-[#C9A84C]/20 bg-[#111B2E] px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-[#C9A84C] hover:text-[#F5F5DC] transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-semibold">Volver</span>
            </Link>
            <div className="h-6 w-px bg-[#C9A84C]/20" />
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-[#C9A84C]" />
              <div>
                <h1 className="text-lg font-bold tracking-wide">GUARDIAN STOP</h1>
                <p className="text-xs text-[#F5F5DC]/50">Dashboard Histórico 24/7</p>
              </div>
            </div>
          </div>

          {/* Worker Status */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
              workerStatus.data?.running
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              <Server className="h-3.5 w-3.5" />
              {workerStatus.data?.running ? "WORKER ACTIVO" : "WORKER INACTIVO"}
            </div>
            {workerStatus.data?.running && (
              <div className="flex items-center gap-1.5 text-xs text-[#F5F5DC]/40">
                <Clock className="h-3 w-3" />
                {workerStatus.data.pollInterval / 1000}s
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
            <StatCard
              label="Total Trades"
              value={stats.totalTrades}
              icon={<BarChart3 className="h-5 w-5 text-[#C9A84C]" />}
            />
            <StatCard
              label="Win Rate"
              value={`${stats.winRate}%`}
              icon={<TrendingUp className="h-5 w-5 text-green-400" />}
            />
            <StatCard
              label="P&L Total"
              value={`$${Number(stats.totalPnL).toFixed(2)}`}
              color={stats.totalPnL >= 0 ? "text-green-400" : "text-red-400"}
              icon={stats.totalPnL >= 0
                ? <TrendingUp className="h-5 w-5 text-green-400" />
                : <TrendingDown className="h-5 w-5 text-red-400" />
              }
            />
            <StatCard
              label="Eventos Protección"
              value={stats.totalProtectionEvents}
              icon={<Shield className="h-5 w-5 text-orange-400" />}
            />
          </div>
        )}

        {/* Account Status */}
        {account && (
          <div className="mb-8 rounded-xl border border-[#C9A84C]/20 bg-[#111B2E] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#C9A84C]" />
                Estado de Cuenta
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                account.isLocked
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "bg-green-500/10 text-green-400 border border-green-500/20"
              }`}>
                {account.isLocked ? "BLOQUEADA" : "ACTIVA"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-[#0B1426] p-4">
                <p className="text-xs text-[#F5F5DC]/50 mb-1">Balance</p>
                <p className="text-xl font-mono font-bold">${Number(account.currentBalance).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-[#0B1426] p-4">
                <p className="text-xs text-[#F5F5DC]/50 mb-1">Límite Diario</p>
                <p className="text-xl font-mono font-bold text-orange-400">{account.dailyLimit}%</p>
              </div>
              <div className="rounded-lg bg-[#0B1426] p-4">
                <p className="text-xs text-[#F5F5DC]/50 mb-1">Límite Semanal</p>
                <p className="text-xl font-mono font-bold text-orange-400">{account.weeklyLimit}%</p>
              </div>
              <div className="rounded-lg bg-[#0B1426] p-4">
                <p className="text-xs text-[#F5F5DC]/50 mb-1">Trailing Stop</p>
                <p className="text-xl font-mono font-bold text-[#C9A84C]">
                  {account.trailingEnabled ? "ON" : "OFF"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Protection History */}
        <div className="rounded-xl border border-[#C9A84C]/20 bg-[#111B2E] p-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-[#C9A84C]" />
            Historial de Protección
          </h2>

          {protectionHistory.data && protectionHistory.data.length > 0 ? (
            <div className="space-y-3">
              {protectionHistory.data.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg bg-[#0B1426] p-4 border border-[#C9A84C]/10"
                >
                  <div className="flex items-center gap-3">
                    {log.triggerType === "daily_limit" && (
                      <Lock className="h-5 w-5 text-red-400" />
                    )}
                    {log.triggerType === "trailing_profit" && (
                      <TrendingDown className="h-5 w-5 text-orange-400" />
                    )}
                    {log.triggerType === "weekly_limit" && (
                      <AlertTriangle className="h-5 w-5 text-orange-400" />
                    )}
                    {log.triggerType === "monthly_limit" && (
                      <Lock className="h-5 w-5 text-red-400" />
                    )}
                    {log.triggerType === "auto_unlock" && (
                      <Bell className="h-5 w-5 text-green-400" />
                    )}

                    <div>
                      <p className="text-sm font-semibold capitalize">
                        {log.triggerType.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-[#F5F5DC]/50">
                        {new Date(log.createdAt).toLocaleString("es-ES")}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {log.profitLossAtTrigger && (
                      <p className={`text-sm font-mono font-bold ${
                        Number(log.profitLossAtTrigger) >= 0 ? "text-green-400" : "text-red-400"
                      }`}>
                        ${Number(log.profitLossAtTrigger).toFixed(2)}
                      </p>
                    )}
                    {log.profitLossPctAtTrigger && (
                      <p className="text-xs text-[#F5F5DC]/50">
                        {Number(log.profitLossPctAtTrigger).toFixed(2)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-[#F5F5DC]/30">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay eventos de protección registrados</p>
              <p className="text-xs mt-1">El historial se llenará automáticamente cuando el worker esté activo</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color = "text-[#F5F5DC]",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-[#C9A84C]/20 bg-[#111B2E] p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#F5F5DC]/50">{label}</span>
        {icon}
      </div>
      <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}
