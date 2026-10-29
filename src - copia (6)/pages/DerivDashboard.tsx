import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router";
import {
  Shield, Activity, Wallet, TrendingDown, TrendingUp,
  AlertTriangle, PowerOff, Lock, History, ArrowLeft,
  RefreshCw, Loader2, Settings, Terminal, Play, Zap,
} from "lucide-react";

// ─── Deriv Config ─────────────────────────────────────────────────
const DERIV_APP_ID = "1";
const DERIV_API_TOKEN = "pat_6d45bfd1288a64224d1262b39360ecd5800c01de1146da4e292f4953bdb0cc0e";
const DERIV_ACCOUNT = "VRTC41298507";

interface DerivPosition {
  contract_id: number;
  symbol: string;
  contract_type: string;
  buy_price: number;
  bid_price: number;
  profit: number;
  profit_percentage: number;
}

interface ProtectionLog {
  timestamp: Date;
  action: string;
  message: string;
  balance: number;
}

// ─── Demo Data (for presentation/evidence) ────────────────────────
const DEMO_BALANCE = 10247.85;
const DEMO_CURRENCY = "USD";
const DEMO_POSITIONS: DerivPosition[] = [
  { contract_id: 1001, symbol: "R_100", contract_type: "CALL", buy_price: 5000, bid_price: 5120, profit: 120.50, profit_percentage: 2.41 },
  { contract_id: 1002, symbol: "R_50", contract_type: "PUT", buy_price: 3000, bid_price: 2940, profit: -60.00, profit_percentage: -2.00 },
  { contract_id: 1003, symbol: "R_75", contract_type: "CALL", buy_price: 2000, bid_price: 2105, profit: 105.00, profit_percentage: 5.25 },
];
const DEMO_LOGS: ProtectionLog[] = [
  { timestamp: new Date(Date.now() - 1000 * 60 * 2), action: "TRAILING STOP", message: "Profit +1.2% alcanzado. Protegiendo 30% de ganancias.", balance: 10247.85 },
  { timestamp: new Date(Date.now() - 1000 * 60 * 15), action: "ALERTA", message: "Posición R_50 en -1.8%. Cerca del límite diario.", balance: 10187.35 },
  { timestamp: new Date(Date.now() - 1000 * 60 * 45), action: "AUTORIZADO", message: "VRTC41298507 conectado. Balance: 10,000.00 USD", balance: 10000.00 },
  { timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), action: "CONECTANDO", message: "Iniciando sesión en Deriv API...", balance: 0 },
];

export default function DerivDashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [positions, setPositions] = useState<DerivPosition[]>([]);
  const [logs, setLogs] = useState<ProtectionLog[]>([]);
  const [protection, setProtection] = useState({
    dailyLimitPct: 1,
    weeklyLimitPct: 10,
    monthlyLimitPct: 30,
    trailingEnabled: true,
    isActive: true,
  });
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [appIdInput, setAppIdInput] = useState(DERIV_APP_ID);
  const [tokenInput, setTokenInput] = useState(DERIV_API_TOKEN);
  const [rawLog, setRawLog] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reqIdRef = useRef(1);

  const addLog = useCallback((action: string, message: string) => {
    setLogs((prev) => [
      { timestamp: new Date(), action, message, balance: balance ?? 0 },
      ...prev.slice(0, 49),
    ]);
  }, [balance]);

  const addRaw = useCallback((msg: string) => {
    setRawLog((prev) => [msg, ...prev.slice(0, 99)]);
    console.log("[Deriv]", msg);
  }, []);

  // ─── Demo Mode ────────────────────────────────────────────────────
  const startDemo = useCallback(() => {
    setIsDemo(true);
    setIsConnected(true);
    setConnecting(false);
    setErrorMsg(null);
    setBalance(DEMO_BALANCE);
    setCurrency(DEMO_CURRENCY);
    setPositions(DEMO_POSITIONS);
    setLogs(DEMO_LOGS);
    addRaw("[DEMO] Modo demostración activado");
    addRaw("[DEMO] Datos simulados cargados");
    addRaw("[DEMO] Balance: 10,247.85 USD | 3 posiciones abiertas");
  }, [addRaw]);

  const stopDemo = useCallback(() => {
    setIsDemo(false);
    setIsConnected(false);
    setBalance(null);
    setPositions([]);
    setLogs([]);
    addRaw("[DEMO] Modo demostración desactivado");
  }, [addRaw]);

  // ─── Real Connection ──────────────────────────────────────────────
  const connect = useCallback(async (appId: string, token: string) => {
    if (isDemo) stopDemo();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    setConnecting(true);
    setErrorMsg(null);
    setIsConnected(false);

    const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${appId}`;
    addRaw(`[INIT] Connecting to ${wsUrl}`);
    addLog("CONECTANDO", `URL: wss://ws.derivws.com/websockets/v3?app_id=${appId}`);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          const err = "TIMEOUT: Deriv no respondió en 10 segundos";
          addRaw(`[TIMEOUT] ${err}`);
          setErrorMsg(err + "\n\nSugerencia: Prueba el Modo Demo para ver cómo funciona Guardian Stop.");
          addLog("ERROR", err);
          setConnecting(false);
          ws.close();
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        addRaw("[WS OPEN] WebSocket abierto exitosamente");
        addLog("WS ABIERTO", "Conexión establecida, enviando autorización...");

        const authMsg = { authorize: token, req_id: reqIdRef.current++ };
        addRaw(`[SEND] authorize req_id=${authMsg.req_id}`);
        ws.send(JSON.stringify(authMsg));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const keys = Object.keys(data).join(", ");
        addRaw(`[RECV] keys: ${keys} | raw: ${JSON.stringify(data).slice(0, 300)}`);

        if (data.error) {
          const errMsg = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
          addRaw(`[AUTH ERROR] ${errMsg}`);
          setErrorMsg(`Error Deriv: ${errMsg}\n\nSugerencia: Prueba el Modo Demo para ver cómo funciona Guardian Stop.`);
          addLog("ERROR", errMsg);
          setConnecting(false);
          setIsConnected(false);
          return;
        }

        if (data.authorize) {
          const auth = data.authorize;
          setIsConnected(true);
          setConnecting(false);
          setBalance(auth.balance);
          setCurrency(auth.currency || "USD");
          addRaw(`[AUTH OK] loginid=${auth.loginid}, balance=${auth.balance}, currency=${auth.currency}`);
          addLog("AUTORIZADO", `${auth.loginid} | Balance: ${auth.balance} ${auth.currency}`);

          ws.send(JSON.stringify({ balance: 1, subscribe: 1, req_id: reqIdRef.current++ }));
          ws.send(JSON.stringify({ portfolio: 1, req_id: reqIdRef.current++ }));
          return;
        }

        if (data.balance && typeof data.balance === "object") {
          setBalance(data.balance.balance);
          addRaw(`[BALANCE UPDATE] ${data.balance.balance}`);
        }

        if (data.portfolio && typeof data.portfolio === "object") {
          setPositions(data.portfolio.contracts || []);
          addRaw(`[PORTFOLIO] ${(data.portfolio.contracts || []).length} positions`);
        }
      };

      ws.onerror = (err: any) => {
        clearTimeout(timeout);
        const errStr = err?.message || err?.type || JSON.stringify(err);
        addRaw(`[WS ERROR] ${errStr}`);
        setErrorMsg(`WebSocket error: ${errStr}\n\nPosibles causas:\n1. Token expirado\n2. Token sin permisos de 'Trade'\n3. Deriv bloquea tu región\n4. App ID inválido\n\nSugerencia: Prueba el Modo Demo para ver cómo funciona Guardian Stop.`);
        addLog("ERROR", errStr);
        setConnecting(false);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        addRaw(`[WS CLOSE] code=${event.code}, reason="${event.reason}", wasClean=${event.wasClean}`);
        setIsConnected(false);
        setConnecting(false);
        if (event.code !== 1000 && !errorMsg) {
          setErrorMsg(`Conexión cerrada inesperadamente. Código: ${event.code}\n\nSugerencia: Prueba el Modo Demo.`);
        }
      };
    } catch (e: any) {
      addRaw(`[EXCEPTION] ${e.message}`);
      setErrorMsg(`Excepción: ${e.message}\n\nSugerencia: Prueba el Modo Demo.`);
      addLog("ERROR", e.message);
      setConnecting(false);
    }
  }, [addLog, addRaw, errorMsg, isDemo, stopDemo]);

  const disconnect = useCallback(() => {
    if (isDemo) {
      stopDemo();
      return;
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
    setPositions([]);
    addLog("DESCONECTADO", "Desconexión manual");
    addRaw("[DISCONNECT] Manual");
  }, [addLog, addRaw, isDemo, stopDemo]);

  const refreshData = useCallback(() => {
    if (isDemo) {
      // Simulate small balance changes in demo
      setBalance((prev) => prev ? prev + (Math.random() - 0.5) * 5 : prev);
      return;
    }
    if (!isConnected || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ portfolio: 1, req_id: reqIdRef.current++ }));
    addRaw("[SEND] portfolio refresh");
  }, [isConnected, addRaw, isDemo]);

  const closeAllPositions = useCallback(async () => {
    if (!isConnected || positions.length === 0) return;
    if (!confirm(`¿Cerrar ${positions.length} posiciones abiertas?`)) return;

    if (isDemo) {
      addLog("CIERRE", `Cerradas ${positions.length} posiciones (DEMO)`);
      setPositions([]);
      return;
    }

    let closed = 0;
    for (const pos of positions) {
      try {
        wsRef.current?.send(JSON.stringify({ sell: pos.contract_id, price: 0, req_id: reqIdRef.current++ }));
        closed++;
      } catch {
        addLog("ERROR", `No se pudo cerrar posición ${pos.contract_id}`);
      }
    }
    addLog("CIERRE", `Cerradas ${closed} posiciones manualmente`);
    setTimeout(refreshData, 1000);
  }, [isConnected, positions, addLog, refreshData, isDemo]);

  // Auto-connect on mount (real)
  useEffect(() => {
    connect(DERIV_APP_ID, DERIV_API_TOKEN);
    return () => {
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll portfolio every 5 seconds when connected
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [isConnected, refreshData]);

  const dailyLoss = balance ? (balance * protection.dailyLimitPct / 100).toFixed(2) : "0.00";
  const weeklyLoss = balance ? (balance * protection.weeklyLimitPct / 100).toFixed(2) : "0.00";

  return (
    <div className="min-h-screen bg-gs-bg text-white">
      {/* Header */}
      <header className="border-b border-gs-gold/20 bg-gs-surface/40 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-gs-gold" />
            <div>
              <h1 className="text-lg font-bold font-display">GUARDIAN STOP</h1>
              <p className="text-xs text-gs-muted">
                Panel Deriv — {isDemo ? "Modo Demostración" : "Prueba Piloto"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isConnected && !connecting && (
              <button
                onClick={startDemo}
                className="flex items-center gap-1 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/20 transition-colors"
              >
                <Play className="h-3 w-3" />
                Modo Demo
              </button>
            )}
            {isDemo && (
              <button
                onClick={stopDemo}
                className="flex items-center gap-1 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-500/20 transition-colors"
              >
                <Zap className="h-3 w-3" />
                Salir Demo
              </button>
            )}
            <button onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1 rounded-lg border border-gs-border/60 px-3 py-1.5 text-xs text-gs-muted hover:bg-gs-surface/30 transition-colors">
              <Settings className="h-3 w-3" />
              Config
            </button>
            <button onClick={isConnected ? disconnect : () => connect(appIdInput, tokenInput)} disabled={connecting}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                isConnected ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                : connecting ? "bg-yellow-500/10 text-yellow-500"
                : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
              }`}>
              {connecting ? <Loader2 className="h-3 w-3 animate-spin" />
                : isConnected ? <Activity className="h-3 w-3" />
                : <PowerOff className="h-3 w-3" />}
              {connecting ? "CONECTANDO..." : isConnected ? "CONECTADO" : "DESCONECTADO"}
            </button>
            <Link to="/"
              className="flex items-center gap-1 rounded-lg border border-gs-border/60 px-3 py-1.5 text-xs text-gs-muted hover:bg-gs-surface/30 transition-colors">
              <ArrowLeft className="h-3 w-3" /> Volver
            </Link>
          </div>
        </div>
      </header>

      {/* Demo Banner */}
      {isDemo && (
        <div className="mx-auto max-w-6xl px-6 pt-4">
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm font-bold text-green-400">Modo Demostración Activo</p>
                <p className="text-xs text-green-300">
                  Estás viendo datos simulados. Esto es útil para probar la interfaz, hacer screenshots o grabar videos de demostración.
                  Presiona "Salir Demo" para intentar conectar con tu cuenta real.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Config Panel */}
      {showConfig && (
        <div className="mx-auto max-w-6xl p-4">
          <div className="rounded-xl border border-gs-gold/30 bg-gs-surface/40 p-4">
            <h3 className="text-sm font-bold text-gs-gold mb-3">Configuración de Conexión Deriv</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gs-muted">App ID</label>
                <input type="text" value={appIdInput} onChange={(e) => setAppIdInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gs-border/60 bg-gs-bg px-3 py-2 text-xs text-white font-mono" />
              </div>
              <div>
                <label className="text-xs text-gs-muted">API Token</label>
                <input type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gs-border/60 bg-gs-bg px-3 py-2 text-xs text-white font-mono" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => connect(appIdInput, tokenInput)} disabled={connecting}
                className="rounded-lg bg-gs-gold px-4 py-2 text-xs font-bold text-gs-bg hover:bg-gs-gold-light transition-colors disabled:opacity-50">
                {connecting ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null} Conectar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && !isDemo && (
        <div className="mx-auto max-w-6xl px-6 pt-4">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-400">Error de conexión</p>
                <pre className="mt-1 text-xs text-red-300 whitespace-pre-wrap font-mono">{errorMsg}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl p-6">
        {/* Account Info Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gs-gold/20 bg-gs-surface/20 p-5">
            <div className="flex items-center gap-2 text-gs-muted mb-2">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-bold">BALANCE</span>
              {isDemo && <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">DEMO</span>}
            </div>
            <div className="text-3xl font-bold font-mono text-gs-gold">
              {balance !== null ? `${balance.toFixed(2)} ${currency}` : "--.--"}
            </div>
            <p className="mt-1 text-xs text-gs-muted">Cuenta Demo {DERIV_ACCOUNT}</p>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs font-bold">LÍMITE DIARIO ({protection.dailyLimitPct}%)</span>
            </div>
            <div className="text-2xl font-bold font-mono text-red-400">
              -{dailyLoss} {currency}
            </div>
            <p className="mt-1 text-xs text-gs-muted">Cierra todo si se alcanza</p>
          </div>

          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
            <div className="flex items-center gap-2 text-orange-400 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-bold">LÍMITE SEMANAL ({protection.weeklyLimitPct}%)</span>
            </div>
            <div className="text-2xl font-bold font-mono text-orange-400">
              -{weeklyLoss} {currency}
            </div>
            <p className="mt-1 text-xs text-gs-muted">Bloquea cuenta si se alcanza</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Protection Settings */}
          <div className="space-y-6">
            <div className="rounded-xl border border-gs-border/60 bg-gs-surface/20 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                <Lock className="h-4 w-4 text-gs-gold" /> CONFIGURACIÓN DE PROTECCIÓN
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="flex justify-between text-xs text-gs-muted mb-1">
                    <span>Límite diario (%)</span>
                    <span className="text-gs-gold font-bold">{protection.dailyLimitPct}%</span>
                  </label>
                  <input type="range" min="0.1" max="10" step="0.1" value={protection.dailyLimitPct}
                    onChange={(e) => setProtection({ ...protection, dailyLimitPct: parseFloat(e.target.value) })}
                    className="w-full accent-gs-gold" />
                </div>
                <div>
                  <label className="flex justify-between text-xs text-gs-muted mb-1">
                    <span>Límite semanal (%)</span>
                    <span className="text-gs-gold font-bold">{protection.weeklyLimitPct}%</span>
                  </label>
                  <input type="range" min="1" max="50" step="1" value={protection.weeklyLimitPct}
                    onChange={(e) => setProtection({ ...protection, weeklyLimitPct: parseFloat(e.target.value) })}
                    className="w-full accent-gs-gold" />
                </div>
                <div>
                  <label className="flex justify-between text-xs text-gs-muted mb-1">
                    <span>Límite mensual (%)</span>
                    <span className="text-gs-gold font-bold">{protection.monthlyLimitPct}%</span>
                  </label>
                  <input type="range" min="5" max="100" step="5" value={protection.monthlyLimitPct}
                    onChange={(e) => setProtection({ ...protection, monthlyLimitPct: parseFloat(e.target.value) })}
                    className="w-full accent-gs-gold" />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gs-border/40 bg-gs-bg px-4 py-3">
                  <span className="text-sm text-gs-text">Trailing Stop</span>
                  <button onClick={() => setProtection({ ...protection, trailingEnabled: !protection.trailingEnabled })}
                    className={`relative h-6 w-11 rounded-full transition-colors ${protection.trailingEnabled ? "bg-gs-gold" : "bg-gs-border"}`}>
                    <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${protection.trailingEnabled ? "translate-x-5" : ""}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gs-border/40 bg-gs-bg px-4 py-3">
                  <span className="text-sm text-gs-text">Protección activa</span>
                  <button onClick={() => setProtection({ ...protection, isActive: !protection.isActive })}
                    className={`relative h-6 w-11 rounded-full transition-colors ${protection.isActive ? "bg-green-500" : "bg-red-500"}`}>
                    <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${protection.isActive ? "translate-x-5" : ""}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-red-400">
                <AlertTriangle className="h-4 w-4" /> CONTROLES DE EMERGENCIA
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={closeAllPositions} disabled={!isConnected || positions.length === 0}
                  className="flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-sm font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                  <Lock className="h-4 w-4" /> Cerrar todo
                </button>
                <button onClick={refreshData} disabled={!isConnected}
                  className="flex items-center justify-center gap-2 rounded-lg border border-gs-border/60 px-4 py-3 text-sm font-bold text-gs-muted hover:bg-gs-surface/30 transition-colors disabled:opacity-50">
                  <RefreshCw className="h-4 w-4" /> Refrescar
                </button>
              </div>
            </div>
          </div>

          {/* Right: Positions, Logs & Debug */}
          <div className="space-y-6">
            <div className="rounded-xl border border-gs-border/60 bg-gs-surface/20 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                <Activity className="h-4 w-4 text-gs-gold" /> POSICIONES ABIERTAS ({positions.length})
              </h2>
              {positions.length === 0 ? (
                <p className="text-center text-sm text-gs-muted py-4">No hay posiciones abiertas</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {positions.map((pos, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-gs-border/40 bg-gs-bg px-3 py-2">
                      <div>
                        <p className="text-xs font-bold text-white">{pos.symbol || "UNKNOWN"}</p>
                        <p className="text-[10px] text-gs-muted">{pos.contract_type || "Option"}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-mono font-bold ${(pos.profit || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {(pos.profit || 0) >= 0 ? "+" : ""}{pos.profit?.toFixed(2) || "0.00"}
                        </p>
                        <p className="text-[10px] text-gs-muted">{pos.profit_percentage?.toFixed(2) || "0.00"}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gs-border/60 bg-gs-surface/20 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                <History className="h-4 w-4 text-gs-gold" /> HISTORIAL DE PROTECCIÓN
              </h2>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="rounded-lg border border-gs-border/40 bg-gs-bg px-3 py-2">
                    <p className="text-xs text-gs-muted">Esperando conexión...</p>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="rounded-lg border border-gs-border/40 bg-gs-bg px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gs-gold">{log.action}</span>
                        <span className="text-[10px] text-gs-muted">{log.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <p className="mt-1 text-xs text-gs-text">{log.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {protection.trailingEnabled && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-green-400">
                  <TrendingUp className="h-4 w-4" /> TRAILING STOP ACTIVO
                </h2>
                <p className="text-xs text-gs-muted">
                  Al alcanzar +1% de profit, protege el 30% de las ganancias acumuladas. Si el mercado retrocede, cierra todo automáticamente.
                </p>
              </div>
            )}

            {/* Debug Console */}
            <div className="rounded-xl border border-gs-border/60 bg-black/40 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-green-400">
                <Terminal className="h-4 w-4" /> DEBUG
              </h2>
              <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-[10px]">
                {rawLog.length === 0 ? (
                  <p className="text-gs-muted">Esperando conexión...</p>
                ) : (
                  rawLog.map((line, i) => (
                    <p key={i} className={
                      line.includes("[ERROR]") || line.includes("[AUTH ERROR]") ? "text-red-400"
                      : line.includes("[AUTH OK]") || line.includes("[DEMO]") ? "text-green-400"
                      : line.includes("[WS OPEN]") ? "text-blue-400"
                      : "text-gs-muted"
                    }>{line}</p>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
