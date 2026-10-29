import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import {
  Shield, Activity, Wallet, TrendingDown, TrendingUp,
  AlertTriangle, PowerOff, Lock, History, ArrowLeft,
  RefreshCw, Loader2, Settings, Terminal, Play, Zap,
  Server, Globe, CheckCircle,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  Broker Configurations
// ═══════════════════════════════════════════════════════════════

type BrokerId = "deriv" | "ig" | "none";

interface BrokerConfig {
  id: BrokerId;
  name: string;
  icon: string;
  authType: "token" | "oauth";
  hasDemo: boolean;
  envs: { label: string; value: string }[];
}

const BROKERS: BrokerConfig[] = [
  {
    id: "deriv",
    name: "Deriv",
    icon: "D",
    authType: "token",
    hasDemo: true,
    envs: [
      { label: "Demo", value: "demo" },
      { label: "Real", value: "real" },
    ],
  },
  {
    id: "ig",
    name: "IG Group",
    icon: "IG",
    authType: "oauth",
    hasDemo: true,
    envs: [
      { label: "Demo", value: "demo" },
      { label: "Real", value: "real" },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════

interface Position {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL" | string;
  size: number;
  openPrice: number;
  currentPrice?: number;
  profit: number;
  profitPct: number;
  dealId?: string;
  epic?: string;
  expiry?: string;
}

interface ProtectionLog {
  timestamp: Date;
  action: string;
  message: string;
  balance: number;
}

// Ledger entry for idempotent closed-trade tracking
interface ClosedTrade {
  dealId: string;
  closedAt: number; // timestamp ms
  pnl: number; // negative = loss, positive = profit
}

interface IGSession {
  cst: string;
  xSecurityToken: string;
  access_token?: string;
  refresh_token?: string;
  accountId: string;
  clientId: string;
}

// ═══════════════════════════════════════════════════════════════
//  Demo Data
// ═══════════════════════════════════════════════════════════════

const DEMO_BALANCE = 10247.85;
const DEMO_CURRENCY = "USD";
const DEMO_POSITIONS: Position[] = [
  { id: "1001", symbol: "EUR/USD", direction: "BUY", size: 0.5, openPrice: 1.0850, currentPrice: 1.0912, profit: 62.00, profitPct: 1.14 },
  { id: "1002", symbol: "GBP/USD", direction: "SELL", size: 0.3, openPrice: 1.2650, currentPrice: 1.2680, profit: -30.00, profitPct: -0.95 },
  { id: "1003", symbol: "XAU/USD", direction: "BUY", size: 0.1, openPrice: 2030.0, currentPrice: 2055.0, profit: 25.00, profitPct: 1.23 },
];
const DEMO_LOGS: ProtectionLog[] = [
  { timestamp: new Date(Date.now() - 1000 * 60 * 2), action: "TRAILING STOP", message: "Profit +1.2% alcanzado. Protegiendo 30% de ganancias.", balance: 10247.85 },
  { timestamp: new Date(Date.now() - 1000 * 60 * 15), action: "ALERTA", message: "Posición GBP/USD en -0.9%. Cerca del límite diario.", balance: 10187.35 },
  { timestamp: new Date(Date.now() - 1000 * 60 * 45), action: "AUTORIZADO", message: "Cuenta demo conectada. Balance: 10,000.00 USD", balance: 10000.00 },
];

// ═══════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════

export default function BrokerPanel() {
  // ─── Core State ─────────────────────────────────────────────
  const [selectedBroker, setSelectedBroker] = useState<BrokerId>("none");
  const [selectedEnv, setSelectedEnv] = useState("demo");
  const [isConnected, setIsConnected] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [positions, setPositions] = useState<Position[]>([]);
  const [logs, setLogs] = useState<ProtectionLog[]>([]);
  const [rawLog, setRawLog] = useState<string[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [totalPnL, setTotalPnL] = useState<number>(0);
  const [peakPnL, setPeakPnL] = useState<number>(0);
  const [initialBalance, setInitialBalance] = useState<number | null>(null);
  // Ledger: idempotent record of closed trades by dealId (survives reconnects)
  const [ledger, setLedger] = useState<Record<string, ClosedTrade>>({});
  const [trailingFired, setTrailingFired] = useState(false);

  const [protection, setProtection] = useState({
    dailyLimitPct: 1,
    weeklyLimitPct: 10,
    monthlyLimitPct: 30,
    trailingEnabled: true,
    trailingProtectPct: 30, // min 30%, configurable up to 90%
    limitsLocked: false,    // once saved, user can't change limits
    isActive: true,
  });

  // ─── Deriv State ────────────────────────────────────────────
  const [derivAppId, setDerivAppId] = useState("1");
  const [derivToken, setDerivToken] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const reqIdRef = useRef(1);

  // ─── IG State ───────────────────────────────────────────────
  const [igApiKey, setIgApiKey] = useState("");
  const [igUsername, setIgUsername] = useState("");
  const [igPassword, setIgPassword] = useState("");
  const [igAccountId, setIgAccountId] = useState("");
  const igSessionRef = useRef<IGSession | null>(null);
  const igRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const igPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPositionsRef = useRef<Position[]>([]);
  // Connection generation: increments on every connect/disconnect to invalidate stale async ops
  const connGenRef = useRef(0);

  // ─── Helpers ────────────────────────────────────────────────
  const addLog = useCallback((action: string, message: string) => {
    setLogs((prev) => [
      { timestamp: new Date(), action, message, balance: balance ?? 0 },
      ...prev.slice(0, 49),
    ]);
  }, [balance]);

  const addRaw = useCallback((msg: string) => {
    setRawLog((prev) => [msg, ...prev.slice(0, 99)]);
    console.log("[BrokerPanel]", msg);
  }, []);

  // ─── Trading Day Helper ─────────────────────────────────────
  // Forex trading day ends at 17:00 NY (22:00 UTC), not local midnight
  const getTradingDayKey = useCallback(() => {
    const now = new Date();
    // Convert to UTC, subtract 22 hours → find the "trading day" boundary
    const d = new Date(now.getTime() - 22 * 60 * 60 * 1000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }, []);

  // Derived: realized daily loss from SESSION ledger (only losses, idempotent)
  // Ledger is cleared on disconnect — each session starts fresh
  const realizedDailyLoss = useMemo(() => {
    return Object.values(ledger)
      .reduce((sum, entry) => sum + Math.max(0, -entry.pnl), 0);
  }, [ledger]);

  const clearConnection = useCallback(() => {
    connGenRef.current++; // invalidate all in-flight async ops
    wsRef.current?.close();
    wsRef.current = null;
    if (igRefreshTimerRef.current) clearTimeout(igRefreshTimerRef.current);
    if (igPollRef.current) clearInterval(igPollRef.current);
    igSessionRef.current = null;
    setIsConnected(false);
    setConnecting(false);
    setPositions([]);
    setBalance(null);
    setTotalPnL(0);
    setPeakPnL(0);
    setInitialBalance(null);
    setLedger({}); // SESSION ledger: cleared on disconnect
    prevPositionsRef.current = [];
    setTrailingFired(false);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  //  DEMO MODE
  // ═══════════════════════════════════════════════════════════════

  const startDemo = useCallback(() => {
    clearConnection();
    setIsDemo(true);
    setIsConnected(true);
    setErrorMsg(null);
    setBalance(DEMO_BALANCE);
    setCurrency(DEMO_CURRENCY);
    setInitialBalance(DEMO_BALANCE);
    const demoPnL = DEMO_POSITIONS.reduce((sum, p) => sum + p.profit, 0);
    setPositions(DEMO_POSITIONS);
    setTotalPnL(demoPnL);
    setPeakPnL(demoPnL);
    setLogs(DEMO_LOGS);
    addRaw("[DEMO] Modo demostración activado");
    addRaw("[DEMO] Datos simulados cargados");
  }, [clearConnection, addRaw]);

  const stopDemo = useCallback(() => {
    setIsDemo(false);
    setIsConnected(false);
    setBalance(null);
    setPositions([]);
    setLogs([]);
    addRaw("[DEMO] Modo demostración desactivado");
  }, [addRaw]);

  // ─── Trading day tick: force recalc of realizedDailyLoss at day boundary ───
  const [tradingDayTick, setTradingDayTick] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setTradingDayTick(Date.now()), 60000); // every minute
    return () => clearInterval(interval);
  }, []);

  // ─── tRPC: save credentials for Risk Engine ───────────────────
  const saveCredentials = trpc.credentials.save.useMutation();

  // ═══════════════════════════════════════════════════════════════
  //  DERIV CONNECTION
  // ═══════════════════════════════════════════════════════════════

  const connectDeriv = useCallback(async (appId: string, token: string) => {
    if (isDemo) stopDemo();
    clearConnection();
    setConnecting(true);
    setErrorMsg(null);
    setSelectedBroker("deriv");

    const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${appId}`;
    addRaw(`[DERIV] Connecting to ${wsUrl}`);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          const err = "TIMEOUT: Deriv no respondió en 10 segundos";
          addRaw(`[DERIV ERROR] ${err}`);
          setErrorMsg(err + "\n\nSugerencia: Usa el Modo Demo para ver cómo funciona Guardian Stop.");
          setConnecting(false);
          ws.close();
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        addRaw("[DERIV] WebSocket abierto");
        const authMsg = { authorize: token, req_id: reqIdRef.current++ };
        ws.send(JSON.stringify(authMsg));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        addRaw(`[DERIV RECV] ${Object.keys(data).join(", ")}`);

        if (data.error) {
          const errMsg = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
          setErrorMsg(`Error Deriv: ${errMsg}`);
          addLog("ERROR", errMsg);
          setConnecting(false);
          setIsConnected(false);
          return;
        }

        if (data.authorize) {
          const a = data.authorize;
          setIsConnected(true);
          setConnecting(false);
          setBalance(a.balance);
          setCurrency(a.currency || "USD");
          addRaw(`[DERIV AUTH] ${a.loginid} | Balance: ${a.balance} ${a.currency}`);
          addLog("AUTORIZADO", `${a.loginid} | Balance: ${a.balance} ${a.currency}`);
          ws.send(JSON.stringify({ balance: 1, subscribe: 1, req_id: reqIdRef.current++ }));
          ws.send(JSON.stringify({ portfolio: 1, req_id: reqIdRef.current++ }));
        }

        if (data.balance && typeof data.balance === "object") {
          setBalance(data.balance.balance);
        }

        if (data.portfolio && typeof data.portfolio === "object") {
          const contracts = data.portfolio.contracts || [];
          setPositions(contracts.map((c: any) => ({
            id: String(c.contract_id),
            symbol: c.symbol || "UNKNOWN",
            direction: c.contract_type || "-",
            size: 1,
            openPrice: c.buy_price || 0,
            currentPrice: c.bid_price || 0,
            profit: c.profit || 0,
            profitPct: c.profit_percentage || 0,
          })));
        }
      };

      ws.onerror = (err: any) => {
        clearTimeout(timeout);
        const errStr = err?.message || err?.type || "WebSocket error";
        setErrorMsg(`WebSocket error: ${errStr}\n\nSugerencia: Prueba el Modo Demo.`);
        setConnecting(false);
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        setIsConnected(false);
        setConnecting(false);
        if (event.code !== 1000 && !errorMsg) {
          setErrorMsg(`Conexión cerrada. Código: ${event.code}`);
        }
      };
    } catch (e: any) {
      addRaw(`[DERIV EXCEPTION] ${e.message}`);
      setErrorMsg(`Excepción: ${e.message}`);
      setConnecting(false);
    }
  }, [addLog, addRaw, clearConnection, errorMsg, isDemo, stopDemo]);

  // ═══════════════════════════════════════════════════════════════
  //  IG CONNECTION (OAuth 2.0 REST API)
  // ═══════════════════════════════════════════════════════════════

  // Standalone IG login (used by connectIG and by igRequest for auto-reconnect)
  const igLogin = useCallback(async (): Promise<boolean> => {
    try {
      const isDemoEnv = selectedEnv === "demo";
      const host = isDemoEnv ? "demo-api.ig.com" : "api.ig.com";

      const sessionRes = await fetch(`https://${host}/gateway/deal/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-IG-API-KEY": igApiKey,
          "Version": "2",
        },
        body: JSON.stringify({
          identifier: igUsername,
          password: igPassword,
          encryptedPassword: false,
        }),
      });

      const sessionText = await sessionRes.text();
      if (!sessionRes.ok) {
        addRaw(`[IG RELOGIN FAIL] HTTP ${sessionRes.status}: ${sessionText.slice(0, 200)}`);
        return false;
      }

      const cst = sessionRes.headers.get("CST") || sessionRes.headers.get("cst") || "";
      const xst = sessionRes.headers.get("X-SECURITY-TOKEN") || sessionRes.headers.get("x-security-token") || "";
      const sessionData = JSON.parse(sessionText);
      const oauth = sessionData.oauthToken || {};

      igSessionRef.current = {
        cst: cst || "fallback",
        xSecurityToken: xst || "fallback",
        access_token: oauth.access_token,
        refresh_token: oauth.refresh_token,
        accountId: sessionData.accountId || igAccountId || "",
        clientId: String(sessionData.clientId || ""),
      };

      addRaw(`[IG RELOGIN OK] CST=${cst ? "yes" : "no"}, XST=${xst ? "yes" : "no"}`);
      return true;
    } catch (e: any) {
      addRaw(`[IG RELOGIN ERROR] ${e.message}`);
      return false;
    }
  }, [igApiKey, igUsername, igPassword, selectedEnv, igAccountId, addRaw]);

  const igRequest = useCallback(async (path: string, method: string, body?: any, attempt: number = 1): Promise<any> => {
    const session = igSessionRef.current;
    if (!session) throw new Error("No hay sesión activa");

    const isDemoEnv = selectedEnv === "demo";
    const host = isDemoEnv ? "demo-api.ig.com" : "api.ig.com";
    const url = `https://${host}/gateway/deal${path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-IG-API-KEY": igApiKey,
      "CST": session.cst,
      "X-SECURITY-TOKEN": session.xSecurityToken,
      "Version": "1",
    };

    addRaw(`[IG REQ] ${method} ${path} (attempt ${attempt})`);

    // Timeout after 10 seconds to prevent infinite hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === "AbortError") {
        throw new Error(`IG TIMEOUT: ${method} ${path} — no response after 10s`);
      }
      throw new Error(`IG FETCH ERROR: ${fetchErr.message}`);
    }
    clearTimeout(timeoutId);

    const text = await res.text();

    // Handle session expiry — auto re-authenticate and retry once
    if (res.status === 401 || text.includes("error.security.invalid-details") || text.includes("error.security.api-key-missing")) {
      addRaw(`[IG SESSION EXPIRED] ${res.status}: ${text.slice(0, 200)}`);
      if (attempt <= 1) {
        addRaw("[IG] Attempting auto re-login...");
        const reconnected = await igLogin();
        if (reconnected) {
          addRaw("[IG] Re-login successful, retrying request...");
          return igRequest(path, method, body, attempt + 1);
        }
      }
    }

    if (!res.ok) {
      throw new Error(`IG HTTP ${res.status}: ${text.slice(0, 300)}`);
    }

    return text ? JSON.parse(text) : {};
  }, [igApiKey, selectedEnv, addRaw, igLogin]);

  const igRefreshSession = useCallback(async () => {
    const session = igSessionRef.current;
    if (!session?.cst) return false;

    try {
      addRaw("[IG] Refreshing session...");
      const isDemoEnv = selectedEnv === "demo";
      const host = isDemoEnv ? "demo-api.ig.com" : "api.ig.com";

      const res = await fetch(`https://${host}/gateway/deal/session/refresh-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-IG-API-KEY": igApiKey,
          "CST": session.cst,
          "X-SECURITY-TOKEN": session.xSecurityToken,
          "Version": "1",
        },
      });

      if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);

      // Capture new headers
      const newCst = res.headers.get("CST") || res.headers.get("cst") || session.cst;
      const newXst = res.headers.get("X-SECURITY-TOKEN") || res.headers.get("x-security-token") || session.xSecurityToken;

      const data = await res.json();
      igSessionRef.current = {
        ...session,
        cst: newCst,
        xSecurityToken: newXst,
        access_token: data.access_token || session.access_token,
        refresh_token: data.refresh_token || session.refresh_token,
      };

      addRaw(`[IG] Session refreshed. CST/XST updated.`);
      return true;
    } catch (e: any) {
      addRaw(`[IG REFRESH ERROR] ${e.message}`);
      return false;
    }
  }, [igApiKey, selectedEnv, addRaw]);

  const igStartRefreshTimer = useCallback(() => {
    if (igRefreshTimerRef.current) clearTimeout(igRefreshTimerRef.current);

    const timer = setTimeout(async () => {
      const ok = await igRefreshSession();
      if (ok) {
        igStartRefreshTimer(); // schedule next refresh
      } else {
        addRaw("[IG] Session refresh failed, trying to continue...");
      }
    }, 10 * 60 * 1000); // refresh every 10 minutes

    igRefreshTimerRef.current = timer;
  }, [igRefreshSession, addRaw]);

  const igFetchData = useCallback(async () => {
    const myGen = connGenRef.current; // capture generation at start
    const isStale = () => connGenRef.current !== myGen;

    try {
      // Fetch accounts
      const accountsRes = await igRequest("/accounts", "GET");
      if (isStale()) return; // abort if disconnected/reconnected
      addRaw(`[IG ACCOUNTS] ${JSON.stringify(accountsRes).slice(0, 400)}`);

      const accounts = accountsRes.accounts || [];
      const activeAccount = accounts.find((a: any) => a.accountId === igAccountId) || accounts[0];

      if (activeAccount) {
        const bal = Number(activeAccount.balance?.balance ?? activeAccount.balance?.available ?? 0);
        if (isStale()) return;
        setBalance(bal);
        setInitialBalance((prev) => {
          if (isStale()) return prev; // don't update if stale
          if (prev === null) {
            addRaw(`[IG] initialBalance SET to ${bal} ${activeAccount.currency || "USD"} (session start)`);
            return bal;
          }
          return prev;
        });
        if (isStale()) return;
        setCurrency(activeAccount.currency || "USD");
        addRaw(`[IG] Account ${activeAccount.accountId} | Balance: ${bal} ${activeAccount.currency}`);
      } else {
        addRaw(`[IG] No account found. Response: ${JSON.stringify(accountsRes).slice(0, 200)}`);
      }

      // Fetch positions
      const posRes = await igRequest("/positions", "GET");
      if (isStale()) return;
      addRaw(`[IG POSITIONS] ${JSON.stringify(posRes).slice(0, 400)}`);
      const posList = posRes.positions || [];
      let runningPnL = 0;
      const mappedPositions = posList.map((p: any) => {
        const market = p.market || {};
        const pos = p.position || {};
        const direction = (pos.direction || "BUY").toUpperCase();
        const size = Number(pos.dealSize || pos.size || pos.contractSize || 1);
        const openPrice = Number(pos.level ?? pos.openLevel ?? pos.openPrice ?? 0);
        const bid = Number(market.bid ?? 0);
        const offer = Number(market.offer ?? 0);
        const currentPrice = direction === "BUY" ? (bid || offer) : (offer || bid);
        const priceDiff = direction === "BUY" ? (currentPrice - openPrice) : (openPrice - currentPrice);
        const profit = priceDiff * size;
        const profitPct = openPrice > 0 ? (priceDiff / openPrice) * 100 : 0;
        runningPnL += profit;
        return {
          id: pos.dealId || pos.dealReference || String(Math.random()),
          symbol: market.instrumentName || market.epic || "UNKNOWN",
          direction,
          size,
          openPrice,
          currentPrice,
          profit,
          profitPct,
          dealId: pos.dealId || "",
          epic: market.epic || "",
          expiry: market.expiry || "-",
        };
      });
      if (isStale()) return;
      setPositions(mappedPositions);
      setTotalPnL(runningPnL);
      addRaw(`[IG] ${posList.length} posiciones | P&L Total: ${runningPnL.toFixed(2)} ${currency}`);
      if (isStale()) return;
      setLastUpdated(new Date());
    } catch (e: any) {
      addRaw(`[IG POLL ERROR] ${e.message}`);
    }
  }, [igRequest, igAccountId, addRaw]);

  const connectIG = useCallback(async () => {
    if (isDemo) stopDemo();
    clearConnection();
    setConnecting(true);
    setErrorMsg(null);
    setSelectedBroker("ig");

    try {
      addRaw("[IG] Starting OAuth login...");
      const ok = await igLogin();
      if (!ok) throw new Error("IG login failed");

      const session = igSessionRef.current;
      addRaw(`[IG] Session OK. CST=${session?.cst ? "yes" : "no"}, XST=${session?.xSecurityToken ? "yes" : "no"}`);
      addLog("AUTORIZADO", `IG ${session?.accountId || igAccountId} | Client: ${session?.clientId || ""}`);

      // Step 2: Fetch initial data
      setIsConnected(true);
      setConnecting(false);

      // Use account from response if user didn't specify
      if (!igAccountId && session?.accountId) {
        setIgAccountId(session.accountId);
      }

      // Save credentials for Python Risk Engine (accountId=1 for now)
      try {
        saveCredentials.mutate({
          accountId: 1,
          broker: "ig",
          igApiKey,
          igIdentifier: igUsername,
          igPassword,
        });
        addRaw("[CREDENTIALS] Saved to Risk Engine");
      } catch (e: any) {
        addRaw(`[CREDENTIALS] Save failed: ${e.message}`);
      }

      await igFetchData();

      // Step 3: Start auto-refresh and polling
      igStartRefreshTimer();
      igPollRef.current = setInterval(igFetchData, 3000); // Poll every 3 seconds

    } catch (e: any) {
      addRaw(`[IG ERROR] ${e.message}`);
      setErrorMsg(`Error IG: ${e.message}\n\nVerifica tu API Key, usuario y contraseña.`);
      setConnecting(false);
      setIsConnected(false);
    }
  }, [addLog, addRaw, clearConnection, igApiKey, igAccountId, igFetchData, igPassword, igStartRefreshTimer, igUsername, isDemo, selectedEnv, stopDemo]);

  // ═══════════════════════════════════════════════════════════════
  //  UNIVERSAL ACTIONS
  // ═══════════════════════════════════════════════════════════════

  const disconnect = useCallback(() => {
    if (isDemo) { stopDemo(); return; }
    clearConnection();
    addLog("DESCONECTADO", "Desconexión manual");
    addRaw("[DISCONNECT] Manual");
  }, [addLog, addRaw, clearConnection, isDemo, stopDemo]);

  const refreshData = useCallback(async () => {
    if (isDemo) {
      setBalance((prev) => prev ? prev + (Math.random() - 0.5) * 5 : prev);
      return;
    }
    if (!isConnected) return;

    if (selectedBroker === "deriv" && wsRef.current) {
      wsRef.current.send(JSON.stringify({ portfolio: 1, req_id: reqIdRef.current++ }));
      addRaw("[DERIV] Refresh requested");
    } else if (selectedBroker === "ig") {
      await igFetchData();
    }
  }, [isConnected, isDemo, selectedBroker, addRaw, igFetchData]);

  // NOTE: Position closing is handled by the Python risk engine.
  // This web panel is read-only for monitoring + configuration only.

  // Auto-connect on mount for Deriv (legacy behavior)
  useEffect(() => {
    // Don't auto-connect anymore — let user choose broker
    return () => { clearConnection(); };
  }, [clearConnection]);

  // Track peak PnL for trailing stop calculation
  useEffect(() => {
    if (totalPnL > peakPnL) {
      setPeakPnL(totalPnL);
    }
  }, [totalPnL, peakPnL]);

  // Track realized daily loss: idempotent ledger of closed trades by dealId
  // Survives reconnects — prevPositionsRef detects which trades disappeared
  useEffect(() => {
    const prevPositions = prevPositionsRef.current;
    const currentPositions = positions;

    if (prevPositions.length > 0 && currentPositions.length < prevPositions.length) {
      const currentIds = new Set(currentPositions.map(p => p.dealId || p.id));
      const closedPositions = prevPositions.filter(p => !currentIds.has(p.dealId || p.id));

      for (const closed of closedPositions) {
        const dealId = closed.dealId || closed.id;
        if (!dealId) continue;

        setLedger(prev => {
          if (dealId in prev) return prev; // idempotent — already recorded
          const entry: ClosedTrade = {
            dealId,
            closedAt: Date.now(),
            pnl: closed.profit, // profit positive = win, negative = loss
          };
          const loss = Math.max(0, -closed.profit);
          if (loss > 0.01) {
            addLog("SYSTEM", `Trade cerrado: ${closed.symbol} | Pérdida: ${loss.toFixed(2)} ${currency} | dealId: ${dealId.slice(0, 12)}...`);
          }
          return { ...prev, [dealId]: entry };
        });
      }
    }

    prevPositionsRef.current = currentPositions;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, currency, addLog]);

  // ═══════════════════════════════════════════════════════════════
  //  PROTECTION MONITOR — Web panel only DISPLAYS alerts.
  //  Actual position closing is handled by the Python risk engine.
  // ═══════════════════════════════════════════════════════════════
  const runProtectionCheck = useCallback(() => {
    if (!protection.isActive || !isConnected) return false;
    if (positions.length === 0) return false;

    // 1. DAILY LIMIT — show alert only
    if (initialBalance && balance !== null) {
      const dailyLimit = initialBalance * (protection.dailyLimitPct / 100);
      if (realizedDailyLoss >= dailyLimit) {
        addLog("ALERTA", `Límite diario alcanzado: ${realizedDailyLoss.toFixed(2)} / ${dailyLimit.toFixed(2)} ${currency}. El motor Python debe cerrar posiciones.`);
        return true;
      }
    }

    // 2. TRAILING STOP — show alert only
    if (protection.trailingEnabled && !trailingFired) {
      const threshold = balance ? balance * 0.01 : 0;
      if (totalPnL >= threshold && peakPnL > 0) {
        const stopLevel = peakPnL * (protection.trailingProtectPct / 100);
        if (totalPnL <= stopLevel) {
          setTrailingFired(true);
          addLog("ALERTA", `Trailing Stop activado: peak ${peakPnL.toFixed(2)} → actual ${totalPnL.toFixed(2)} ${currency}. El motor Python debe cerrar posiciones.`);
          return true;
        }
      }
    }
    return false;
  }, [protection, isConnected, initialBalance, balance, realizedDailyLoss, totalPnL, positions.length, currency, trailingFired, peakPnL, addLog]);

  // Show protection alerts whenever data changes
  useEffect(() => {
    runProtectionCheck();
  }, [balance, totalPnL, peakPnL, positions.length, runProtectionCheck]);

  // Auto-set initialBalance if null but balance is available
  useEffect(() => {
    if (initialBalance === null && balance !== null && isConnected) {
      addRaw(`[AUTO-SET] initialBalance was null, setting to ${balance.toFixed(2)}`);
      setInitialBalance(balance);
    }
  }, [initialBalance, balance, isConnected, addRaw]);

  // ═══════════════════════════════════════════════════════════════
  //  RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════

  const currentBroker = BROKERS.find((b) => b.id === selectedBroker);

  return (
    <div className="min-h-screen bg-gs-bg text-white">
      {/* Header */}
      <header className="border-b border-gs-gold/20 bg-gs-surface/40 px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-gs-gold" />
            <div>
              <h1 className="text-lg font-bold font-display">GUARDIAN STOP</h1>
              <p className="text-xs text-gs-muted">
                Panel de Control — {isDemo ? "Modo Demostración" : currentBroker ? currentBroker.name : "Selecciona Broker"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {!isConnected && !connecting && (
              <button onClick={startDemo}
                className="flex items-center gap-1 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/20 transition-colors">
                <Play className="h-3 w-3" /> Modo Demo
              </button>
            )}
            {isDemo && (
              <button onClick={stopDemo}
                className="flex items-center gap-1 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-500/20 transition-colors">
                <Zap className="h-3 w-3" /> Salir Demo
              </button>
            )}
            <button onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1 rounded-lg border border-gs-border/60 px-3 py-1.5 text-xs text-gs-muted hover:bg-gs-surface/30 transition-colors">
              <Settings className="h-3 w-3" /> Config
            </button>
            <button onClick={isConnected ? disconnect : undefined} disabled={connecting || (!isConnected && !selectedBroker)}
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

      {/* Broker Selector */}
      {!isConnected && !isDemo && (
        <div className="mx-auto max-w-6xl px-6 pt-6">
          <div className="rounded-xl border border-gs-gold/20 bg-gs-surface/20 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-gs-gold">
              <Globe className="h-4 w-4" /> SELECCIONA TU BROKER
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {BROKERS.map((broker) => (
                <button
                  key={broker.id}
                  onClick={() => setSelectedBroker(broker.id)}
                  className={`relative flex flex-col items-center gap-3 rounded-xl border p-5 transition-all ${
                    selectedBroker === broker.id
                      ? "border-gs-gold bg-gs-gold/10 shadow-glow-gold"
                      : "border-gs-border/40 bg-gs-bg hover:border-gs-gold/30"
                  }`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
                    selectedBroker === broker.id ? "bg-gs-gold text-gs-bg" : "bg-gs-surface text-gs-muted"
                  }`}>
                    {broker.icon}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{broker.name}</p>
                    <p className="text-[10px] text-gs-muted mt-1">
                      {broker.authType === "token" ? "WebSocket + Token" : "REST API + OAuth 2.0"}
                    </p>
                    {broker.hasDemo && (
                      <span className="mt-2 inline-block rounded bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400">
                        Demo disponible
                      </span>
                    )}
                  </div>
                  {selectedBroker === broker.id && (
                    <CheckCircle className="absolute top-3 right-3 h-4 w-4 text-gs-gold" />
                  )}
                </button>
              ))}
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gs-border/30 p-5">
                <Server className="h-8 w-8 text-gs-muted" />
                <p className="text-xs text-gs-muted text-center">
                  Más brokers próximamente.<br />Solicita tu broker favorito.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Demo Banner */}
      {isDemo && (
        <div className="mx-auto max-w-6xl px-6 pt-4">
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm font-bold text-green-400">Modo Demostración Activo</p>
                <p className="text-xs text-green-300">
                  Estás viendo datos simulados. Útil para probar la interfaz, hacer screenshots o grabar videos.
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
            <h3 className="text-sm font-bold text-gs-gold mb-3">
              Configuración de Conexión {currentBroker ? `— ${currentBroker.name}` : ""}
            </h3>

            {/* Environment selector */}
            <div className="mb-4">
              <label className="text-xs text-gs-muted">Entorno</label>
              <div className="mt-1 flex gap-2">
                {currentBroker?.envs.map((env) => (
                  <button
                    key={env.value}
                    onClick={() => setSelectedEnv(env.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      selectedEnv === env.value
                        ? "bg-gs-gold text-gs-bg"
                        : "border border-gs-border/60 text-gs-muted hover:bg-gs-surface/30"
                    }`}
                  >
                    {env.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Deriv Config */}
            {selectedBroker === "deriv" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gs-muted">App ID</label>
                  <input type="text" value={derivAppId} onChange={(e) => setDerivAppId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gs-border/60 bg-gs-bg px-3 py-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-xs text-gs-muted">API Token</label>
                  <input type="password" value={derivToken} onChange={(e) => setDerivToken(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gs-border/60 bg-gs-bg px-3 py-2 text-xs text-white font-mono" />
                </div>
                <div className="md:col-span-2">
                  <button onClick={() => connectDeriv(derivAppId, derivToken)} disabled={connecting}
                    className="rounded-lg bg-gs-gold px-4 py-2 text-xs font-bold text-gs-bg hover:bg-gs-gold-light transition-colors disabled:opacity-50">
                    {connecting ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null} Conectar Deriv
                  </button>
                </div>
              </div>
            )}

            {/* IG Config */}
            {selectedBroker === "ig" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gs-muted">API Key</label>
                  <input type="password" value={igApiKey} onChange={(e) => setIgApiKey(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gs-border/60 bg-gs-bg px-3 py-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-xs text-gs-muted">Account ID (opcional)</label>
                  <input type="text" value={igAccountId} onChange={(e) => setIgAccountId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gs-border/60 bg-gs-bg px-3 py-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-xs text-gs-muted">Usuario IG</label>
                  <input type="text" value={igUsername} onChange={(e) => setIgUsername(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gs-border/60 bg-gs-bg px-3 py-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-xs text-gs-muted">Contraseña IG</label>
                  <input type="password" value={igPassword} onChange={(e) => setIgPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gs-border/60 bg-gs-bg px-3 py-2 text-xs text-white font-mono" />
                </div>
                <div className="md:col-span-2">
                  <button onClick={connectIG} disabled={connecting}
                    className="rounded-lg bg-gs-gold px-4 py-2 text-xs font-bold text-gs-bg hover:bg-gs-gold-light transition-colors disabled:opacity-50">
                    {connecting ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null} Conectar IG
                  </button>
                </div>
              </div>
            )}
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
        {(() => {
          const effectiveBalance = initialBalance && balance !== null ? balance + totalPnL : 0;
          // Drawdown = how much we lost from initial balance (never negative = never show gains as drawdown)
          const sessionDrawdown = initialBalance && effectiveBalance > 0 ? Math.max(0, initialBalance - effectiveBalance) : 0;
          const sessionDrawdownPct = initialBalance && initialBalance > 0 ? (sessionDrawdown / initialBalance) * 100 : 0;
          const dailyLimitAmount = initialBalance ? initialBalance * protection.dailyLimitPct / 100 : 0;
          // Daily limit uses ONLY realized losses from closed trades (NOT floating P&L)
          const remainingDaily = Math.max(0, dailyLimitAmount - realizedDailyLoss);
          const dailyPctUsed = dailyLimitAmount > 0 ? Math.min((realizedDailyLoss / dailyLimitAmount) * 100, 100) : 0;

          return (
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Balance */}
              <div className="rounded-xl border border-gs-gold/20 bg-gs-surface/20 p-5">
                <div className="flex items-center gap-2 text-gs-muted mb-2">
                  <Wallet className="h-4 w-4" />
                  <span className="text-xs font-bold">BALANCE</span>
                  {isDemo && <span className="text-xs text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">DEMO</span>}
                  {isConnected && !isDemo && currentBroker && (
                    <span className="text-xs text-gs-gold bg-gs-gold/10 px-1.5 py-0.5 rounded">{currentBroker.name}</span>
                  )}
                  {lastUpdated && (
                    <span className="text-xs text-gs-muted ml-auto flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold font-mono text-gs-gold">
                  {balance !== null ? `${balance.toFixed(2)} ${currency}` : "--.--"}
                </div>
                {initialBalance && balance !== null && (
                  <p className={`mt-1 text-sm font-medium ${balance > initialBalance ? "text-green-400" : balance < initialBalance ? "text-red-400" : "text-gs-muted"}`}>
                    {balance > initialBalance ? "+" : balance < initialBalance ? "-" : ""}{Math.abs(balance - initialBalance).toFixed(2)} {currency} desde conexión
                  </p>
                )}
              </div>

              {/* P&L Total */}
              <div className={`rounded-xl border p-5 ${
                totalPnL > 0 ? "border-green-500/30 bg-green-500/10"
                : totalPnL < 0 ? "border-red-500/30 bg-red-500/10"
                : "border-gs-border/40 bg-gs-surface/20"
              }`}>
                <div className={`flex items-center gap-2 mb-2 ${
                  totalPnL > 0 ? "text-green-400" : totalPnL < 0 ? "text-red-400" : "text-gs-muted"
                }`}>
                  {totalPnL >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="text-xs font-bold">P&L FLOTANTE</span>
                  {positions.length > 0 && (
                    <span className="text-xs bg-gs-bg px-1.5 py-0.5 rounded">{positions.length} pos</span>
                  )}
                </div>
                <div className={`text-2xl font-bold font-mono ${
                  totalPnL > 0 ? "text-green-400" : totalPnL < 0 ? "text-red-400" : "text-gs-muted"
                }`}>
                  {totalPnL > 0 ? "+" : ""}{totalPnL.toFixed(2)} {currency}
                </div>
                <p className="mt-1 text-sm text-gs-muted">
                  {totalPnL > 0 ? "Posiciones en positivo" : totalPnL < 0 ? "Posiciones en negativo" : "Sin posiciones abiertas"}
                </p>
              </div>

              {/* Drawdown Session */}
              <div className={`rounded-xl border p-5 ${
                !initialBalance ? "border-gs-border/40 bg-gs-surface/20"
                : sessionDrawdownPct >= protection.dailyLimitPct ? "border-red-500/40 bg-red-500/10"
                : sessionDrawdownPct >= protection.dailyLimitPct * 0.7 ? "border-orange-500/30 bg-orange-500/10"
                : "border-yellow-500/20 bg-yellow-500/5"
              }`}>
                <div className="flex items-center gap-2 text-gs-muted mb-2">
                  <Activity className="h-4 w-4" />
                  <span className="text-xs font-bold">DRAWDOWN SESIÓN</span>
                  {sessionDrawdownPct >= protection.dailyLimitPct && initialBalance && (
                    <span className="text-xs text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded animate-pulse">¡ALERTA!</span>
                  )}
                </div>

                {!initialBalance ? (
                  <div>
                    <div className="text-2xl font-bold font-mono text-gs-muted">--.--</div>
                    <p className="mt-1 text-sm text-gs-muted">Calculando balance inicial...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono text-red-400">
                        {sessionDrawdown.toFixed(2)} {currency}
                      </span>
                      <span className={`text-lg font-bold ${
                        sessionDrawdownPct >= protection.dailyLimitPct ? "text-red-400"
                        : sessionDrawdownPct >= protection.dailyLimitPct * 0.7 ? "text-orange-400"
                        : sessionDrawdownPct > 0 ? "text-yellow-400"
                        : "text-green-400"
                      }`}>
                        ({sessionDrawdownPct.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-gs-bg overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        sessionDrawdownPct >= 100 ? "bg-red-500"
                        : sessionDrawdownPct >= 70 ? "bg-orange-500"
                        : sessionDrawdownPct > 0 ? "bg-yellow-500"
                        : "bg-green-500"
                      }`} style={{ width: `${Math.min(sessionDrawdownPct, 100)}%` }} />
                    </div>
                    <p className="mt-1 text-sm text-gs-muted">
                      {sessionDrawdownPct >= protection.dailyLimitPct
                        ? "¡DRAWDOWN ALTO! Monitoreando..."
                        : sessionDrawdown === 0
                        ? "Sin pérdidas en esta sesión"
                        : `Faltan ${Math.max(0, (protection.dailyLimitPct - sessionDrawdownPct) / 100 * initialBalance).toFixed(2)} ${currency} para alerta (${Math.max(0, protection.dailyLimitPct - sessionDrawdownPct).toFixed(0)}% libre)`}
                    </p>
                  </>
                )}
              </div>

              {/* Daily Limit — dynamic, tracks consumption in real time */}
              <div className={`rounded-xl border p-5 ${
                !initialBalance ? "border-red-500/20 bg-red-500/5"
                : dailyPctUsed >= 100 ? "border-red-500/40 bg-red-500/15"
                : dailyPctUsed >= 70 ? "border-orange-500/30 bg-orange-500/10"
                : "border-red-500/20 bg-red-500/5"
              }`}>
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-xs font-bold">LÍMITE DIARIO ({protection.dailyLimitPct}%)</span>
                  {dailyPctUsed >= 100 && initialBalance && (
                    <span className="text-xs text-white bg-red-500 px-1.5 py-0.5 rounded animate-pulse ml-auto">CERRANDO</span>
                  )}
                </div>

                {!initialBalance ? (
                  <>
                    <div className="text-2xl font-bold font-mono text-red-400">
                      {dailyLimitAmount.toFixed(2)} {currency}
                    </div>
                    <p className="mt-1 text-sm text-gs-muted">Máximo de pérdida diaria permitida</p>
                  </>
                ) : (
                  <>
                    {/* Big number: remaining or consumed */}
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold font-mono ${
                        dailyPctUsed >= 100 ? "text-red-400"
                        : dailyPctUsed >= 70 ? "text-orange-400"
                        : "text-red-400"
                      }`}>
                        {remainingDaily.toFixed(2)}
                      </span>
                      <span className="text-sm text-gs-muted">/ {dailyLimitAmount.toFixed(2)} {currency}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2 h-3 w-full rounded-full bg-gs-bg overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        dailyPctUsed >= 100 ? "bg-red-500"
                        : dailyPctUsed >= 70 ? "bg-orange-500"
                        : "bg-red-400"
                      }`} style={{ width: `${Math.min(dailyPctUsed, 100)}%` }} />
                    </div>

                    {/* Status text */}
                    <p className={`mt-2 text-sm font-medium ${
                      dailyPctUsed >= 100 ? "text-red-400"
                      : dailyPctUsed >= 70 ? "text-orange-400"
                      : "text-gs-muted"
                    }`}>
                      {dailyPctUsed >= 100
                        ? "¡Límite alcanzado! Cerrando posiciones..."
                        : `${dailyPctUsed.toFixed(0)}% consumido — ${remainingDaily.toFixed(2)} ${currency} disponibles`}
                    </p>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Protection Settings */}
          <div className="space-y-6">
            <div className="rounded-xl border border-gs-border/60 bg-gs-surface/20 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                <Lock className="h-4 w-4 text-gs-gold" />
                {protection.limitsLocked ? "PROTECCIÓN CONFIGURADA" : "CONFIGURAR PROTECCIÓN"}
                {protection.limitsLocked && (
                  <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full ml-auto">BLOQUEADO</span>
                )}
              </h2>

              {!protection.limitsLocked ? (
                /* ─── EDIT MODE ─── */
                <div className="space-y-4">
                  <div className="rounded-lg border border-gs-gold/20 bg-gs-gold/5 p-3 mb-2">
                    <p className="text-[11px] text-gs-gold">
                      ⚠️ Configura tus límites UNA SOLA VEZ. Al guardar, quedarán bloqueados para tu protección.
                    </p>
                  </div>

                  <div>
                    <label className="flex justify-between text-xs text-gs-muted mb-1">
                      <span>Límite diario de pérdida</span>
                      <span className="text-gs-gold font-bold">{protection.dailyLimitPct}%</span>
                    </label>
                    <input type="range" min="0.5" max="5" step="0.5" value={protection.dailyLimitPct}
                      onChange={(e) => setProtection({ ...protection, dailyLimitPct: parseFloat(e.target.value) })}
                      className="w-full accent-gs-gold" />
                    <p className="text-[10px] text-gs-muted mt-0.5">Máximo {balance ? (balance * protection.dailyLimitPct / 100).toFixed(2) : "0.00"} {currency}/día</p>
                  </div>

                  <div>
                    <label className="flex justify-between text-xs text-gs-muted mb-1">
                      <span>Límite semanal de pérdida</span>
                      <span className="text-gs-gold font-bold">{protection.weeklyLimitPct}%</span>
                    </label>
                    <input type="range" min="5" max="20" step="1" value={protection.weeklyLimitPct}
                      onChange={(e) => setProtection({ ...protection, weeklyLimitPct: parseFloat(e.target.value) })}
                      className="w-full accent-gs-gold" />
                    <p className="text-[10px] text-gs-muted mt-0.5">Máximo {balance ? (balance * protection.weeklyLimitPct / 100).toFixed(2) : "0.00"} {currency}/semana</p>
                  </div>

                  <div>
                    <label className="flex justify-between text-xs text-gs-muted mb-1">
                      <span>Límite mensual de pérdida</span>
                      <span className="text-gs-gold font-bold">{protection.monthlyLimitPct}%</span>
                    </label>
                    <input type="range" min="10" max="50" step="5" value={protection.monthlyLimitPct}
                      onChange={(e) => setProtection({ ...protection, monthlyLimitPct: parseFloat(e.target.value) })}
                      className="w-full accent-gs-gold" />
                    <p className="text-[10px] text-gs-muted mt-0.5">Máximo {balance ? (balance * protection.monthlyLimitPct / 100).toFixed(2) : "0.00"} {currency}/mes</p>
                  </div>

                  <div>
                    <label className="flex justify-between text-xs text-gs-muted mb-1">
                      <span>Trailing Stop — Protección de ganancias</span>
                      <span className="text-gs-gold font-bold">{protection.trailingProtectPct}%</span>
                    </label>
                    <input type="range" min="30" max="90" step="5" value={protection.trailingProtectPct}
                      onChange={(e) => setProtection({ ...protection, trailingProtectPct: parseFloat(e.target.value) })}
                      className="w-full accent-gs-gold" />
                    <p className="text-[10px] text-gs-muted mt-0.5">
                      Mínimo 30%. Se activa al ganar 1% del balance. Protege el {protection.trailingProtectPct}% de tu ganancia máxima. Ej: si ganas $1,000 y eliges 30%, cierra si caes a $300 (conservas $300, pierdes $700 del retroceso).
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-gs-border/40 bg-gs-bg px-4 py-3">
                    <span className="text-sm text-gs-text">Trailing Stop</span>
                    <button onClick={() => setProtection({ ...protection, trailingEnabled: !protection.trailingEnabled })}
                      className={`relative h-6 w-11 rounded-full transition-colors ${protection.trailingEnabled ? "bg-gs-gold" : "bg-gs-border"}`}>
                      <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${protection.trailingEnabled ? "translate-x-5" : ""}`} />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm("¿Guardar configuración? Los límites quedarán bloqueados y no podrás cambiarlos hasta renovar tu plan.")) {
                        setProtection({ ...protection, limitsLocked: true });
                        addLog("CONFIG", `Límites guardados: Diario ${protection.dailyLimitPct}%, Semanal ${protection.weeklyLimitPct}%, Mensual ${protection.monthlyLimitPct}%, Trailing ${protection.trailingProtectPct}%`);
                      }
                    }}
                    className="w-full rounded-lg bg-gs-gold px-4 py-2.5 text-xs font-bold text-gs-bg hover:bg-gs-gold-light transition-colors"
                  >
                    <Lock className="h-3 w-3 inline mr-1" /> GUARDAR Y BLOQUEAR CONFIGURACIÓN
                  </button>
                </div>
              ) : (
                /* ─── LOCKED VIEW ─── */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                      <p className="text-[10px] text-red-400">Límite diario</p>
                      <p className="text-lg font-mono font-bold text-red-400">{protection.dailyLimitPct}%</p>
                      <p className="text-[10px] text-gs-muted">{balance ? (balance * protection.dailyLimitPct / 100).toFixed(2) : "0.00"} {currency}</p>
                    </div>
                    <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                      <p className="text-[10px] text-orange-400">Límite semanal</p>
                      <p className="text-lg font-mono font-bold text-orange-400">{protection.weeklyLimitPct}%</p>
                      <p className="text-[10px] text-gs-muted">{balance ? (balance * protection.weeklyLimitPct / 100).toFixed(2) : "0.00"} {currency}</p>
                    </div>
                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                      <p className="text-[10px] text-yellow-400">Límite mensual</p>
                      <p className="text-lg font-mono font-bold text-yellow-400">{protection.monthlyLimitPct}%</p>
                      <p className="text-[10px] text-gs-muted">{balance ? (balance * protection.monthlyLimitPct / 100).toFixed(2) : "0.00"} {currency}</p>
                    </div>
                    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                      <p className="text-[10px] text-green-400">Trailing Stop</p>
                      <p className="text-lg font-mono font-bold text-green-400">{protection.trailingProtectPct}%</p>
                      <p className="text-[10px] text-gs-muted">Protege {protection.trailingProtectPct}% del pico</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gs-muted text-center">
                    Configuración bloqueada. Para cambiar, contacta soporte o renueva tu plan.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-400">
                <Shield className="h-4 w-4" /> ESTADO DEL MOTOR DE RIESGO
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={runProtectionCheck} disabled={!isConnected}
                  className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50">
                  <Shield className="h-4 w-4" /> Verificar protección
                </button>
                <button onClick={refreshData} disabled={!isConnected}
                  className="flex items-center justify-center gap-2 rounded-lg border border-gs-border/60 px-4 py-3 text-sm font-bold text-gs-muted hover:bg-gs-surface/30 transition-colors disabled:opacity-50">
                  <RefreshCw className="h-4 w-4" /> Refrescar datos
                </button>
              </div>
              <p className="mt-3 text-xs text-gs-muted">
                El cierre de posiciones lo realiza el motor Python en el servidor. Este panel solo monitorea y configura.
              </p>
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
                        <p className="text-xs font-bold text-white">{pos.symbol}</p>
                        <p className="text-[10px] text-gs-muted">{pos.direction} | Size: {pos.size}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-mono font-bold ${pos.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {pos.profit >= 0 ? "+" : ""}{pos.profit.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-gs-muted">{pos.profitPct.toFixed(2)}%</p>
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
                {/* Trailing Stop — protects X% of peak profit */}
                {(() => {
                  const threshold = balance ? balance * 0.01 : 0; // 1% to activate
                  const isActive = totalPnL >= threshold;
                  const drawdownFromPeak = peakPnL > 0 ? ((peakPnL - totalPnL) / peakPnL) * 100 : 0;
                  const stopLevel = peakPnL * (protection.trailingProtectPct / 100);
                  const isTriggered = isActive && totalPnL <= stopLevel;
                  const retreatAllowed = 100 - protection.trailingProtectPct; // e.g. 70% if protect=30%

                  return (
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h2 className="flex items-center gap-2 text-sm font-bold text-green-400">
                          <TrendingUp className="h-4 w-4" />
                          TRAILING STOP — PROTEGE EL {protection.trailingProtectPct}%
                        </h2>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                          isTriggered ? "bg-red-500/20 text-red-400"
                          : isActive ? "bg-green-500/20 text-green-400"
                          : "bg-gs-bg text-gs-muted"
                        }`}>
                          {isTriggered ? <><AlertTriangle className="h-3 w-3" /> ¡CIERRA AHORA!</>
                          : isActive ? <><Shield className="h-3 w-3" /> ACTIVO</>
                          : <><Activity className="h-3 w-3" /> ESPERANDO +{threshold.toFixed(2)} {currency}</>}
                        </span>
                      </div>

                      {/* Activation info */}
                      {!isActive && (
                        <div className="rounded-lg border border-gs-gold/20 bg-gs-gold/5 p-3">
                          <p className="text-sm text-gs-text">
                            Para activar: gana <span className="text-gs-gold font-bold">{threshold.toFixed(2)} {currency}</span> (1% de tu balance).
                            Una vez activo, protegerá el <span className="text-green-400 font-bold">{protection.trailingProtectPct}%</span> de tu ganancia máxima.
                          </p>
                        </div>
                      )}

                      {isActive && (
                        <>
                          {/* Three big numbers */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-lg bg-gs-bg/50 p-3 text-center">
                              <p className="text-xs text-gs-muted mb-1">GANANCIA MÁXIMA</p>
                              <p className="text-lg font-mono font-bold text-gs-gold">+{peakPnL.toFixed(2)}</p>
                              <p className="text-xs text-gs-muted">{currency}</p>
                            </div>
                            <div className="rounded-lg bg-gs-bg/50 p-3 text-center">
                              <p className="text-xs text-gs-muted mb-1">GANANCIA AHORA</p>
                              <p className={`text-lg font-mono font-bold ${totalPnL >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {totalPnL >= 0 ? "+" : ""}{totalPnL.toFixed(2)}
                              </p>
                              <p className="text-xs text-gs-muted">{currency}</p>
                            </div>
                            <div className="rounded-lg bg-gs-bg/50 p-3 text-center">
                              <p className="text-xs text-gs-muted mb-1">PROTEGER</p>
                              <p className="text-lg font-mono font-bold text-green-400">{protection.trailingProtectPct}%</p>
                              <p className="text-xs text-gs-muted">= +{stopLevel.toFixed(2)} {currency}</p>
                            </div>
                          </div>

                          {/* Visual bar: from peak down to stop level */}
                          <div className="rounded-lg bg-gs-bg/30 p-3">
                            <div className="flex justify-between text-xs text-gs-muted mb-2">
                              <span>Pico: +{peakPnL.toFixed(0)} {currency}</span>
                              <span className="text-red-400 font-bold">Cierra: +{stopLevel.toFixed(0)} {currency}</span>
                            </div>
                            {/* Bar from 0 to peak */}
                            <div className="relative h-6 w-full rounded-full bg-gs-bg overflow-hidden">
                              {/* Protected zone (green, from 0 to stopLevel) */}
                              <div
                                className="absolute left-0 top-0 h-full bg-green-600 rounded-l-full"
                                style={{ width: `${(stopLevel / peakPnL) * 100}%` }}
                              />
                              {/* Safe zone above stop level (yellow/gold) */}
                              <div
                                className="absolute top-0 h-full bg-gs-gold/60"
                                style={{ left: `${(stopLevel / peakPnL) * 100}%`, width: `${((peakPnL - stopLevel) / peakPnL) * 100}%` }}
                              />
                              {/* Current position marker */}
                              <div
                                className="absolute top-0 h-full w-1 bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)] transition-all duration-500"
                                style={{ left: `${Math.min((totalPnL / peakPnL) * 100, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs mt-2">
                              <span className="text-green-400">Protegido (+{stopLevel.toFixed(0)})</span>
                              <span className={totalPnL <= stopLevel * 1.2 ? "text-red-400 font-bold" : "text-gs-gold"}>
                                {totalPnL <= stopLevel ? "¡CIERRE ACTIVADO!" : `Puedes retroceder ${(retreatAllowed - drawdownFromPeak).toFixed(1)}% más`}
                              </span>
                            </div>
                          </div>

                          {/* Clear explanation */}
                          <div className="rounded-lg border border-gs-border/30 bg-gs-bg/30 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gs-muted">Retroceso actual desde el pico:</span>
                              <span className={`text-lg font-mono font-bold ${
                                drawdownFromPeak >= retreatAllowed * 0.8 ? "text-red-400"
                                : drawdownFromPeak >= retreatAllowed * 0.5 ? "text-orange-400"
                                : "text-green-400"
                              }`}>{drawdownFromPeak.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gs-muted">Retroceso máximo permitido:</span>
                              <span className="text-lg font-mono font-bold text-gs-gold">{retreatAllowed.toFixed(0)}%</span>
                            </div>
                            <div className="h-px bg-gs-border/30 my-1" />
                            <p className="text-sm text-gs-text leading-relaxed">
                              {isTriggered
                                ? <span className="text-red-400 font-bold">ALERTA: Tu ganancia cayó de +{peakPnL.toFixed(2)} a +{totalPnL.toFixed(2)} {currency}. Solo queda el {protection.trailingProtectPct}% del pico. Guardian Stop cierra TODO AHORA.</span>
                                : <span>Tu mejor ganancia fue <span className="text-gs-gold font-bold">+{peakPnL.toFixed(2)} {currency}</span>. El Trailing protege el <span className="text-green-400 font-bold">{protection.trailingProtectPct}%</span> de ese pico. Si tu ganancia cae a <span className="text-red-400 font-bold">+{stopLevel.toFixed(2)} {currency}</span> (retroceso del {retreatAllowed}%), cerramos todo automáticamente.</span>
                              }
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Debug Console */}
            <div className="rounded-xl border border-gs-border/60 bg-black/40 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-green-400">
                <Terminal className="h-4 w-4" /> CONSOLA DE DEBUG
              </h2>
              <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-[10px]">
                {rawLog.length === 0 ? (
                  <p className="text-gs-muted">Esperando conexión...</p>
                ) : (
                  rawLog.map((line, i) => (
                    <p key={i} className={
                      line.includes("ERROR") ? "text-red-400"
                      : line.includes("AUTH") || line.includes("OK") || line.includes("DEMO") ? "text-green-400"
                      : line.includes("OPEN") || line.includes("WS") ? "text-blue-400"
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
