/**
 * Deriv WebSocket API Client
 * Conexión en tiempo real para lectura de cuenta y ejecución de protección
 */

export interface DerivConfig {
  appId: string;
  apiToken: string;
  accountId: string;
}

export interface AccountInfo {
  balance: number;
  currency: string;
  email: string;
  loginid: string;
  is_virtual: boolean;
}

export interface OpenPosition {
  contract_id: number;
  symbol: string;
  contract_type: string;
  buy_price: number;
  bid_price: number;
  profit: number;
  profit_percentage: number;
  purchase_time: number;
  expiry_time: number;
}

export interface ProtectionState {
  dailyLimitPct: number;
  weeklyLimitPct: number;
  monthlyLimitPct: number;
  trailingEnabled: boolean;
  trailingActivationPct: number;
  trailingProtectionPct: number;
  isActive: boolean;
}

export interface ProtectionLog {
  timestamp: Date;
  action: "LIMIT_BREACH" | "TRAILING_ACTIVATED" | "POSITION_CLOSED" | "ACCOUNT_BLOCKED" | "RESET";
  message: string;
  balanceBefore: number;
  balanceAfter: number;
  details: string;
}

class DerivAPI {
  private ws: WebSocket | null = null;
  private config: DerivConfig;
  private authorized = false;
  private messageId = 1;
  private pendingMessages: Map<number, { resolve: Function; reject: Function }> = new Map();
  private onBalanceUpdate: ((balance: number) => void) | null = null;
  private onPositionsUpdate: ((positions: OpenPosition[]) => void) | null = null;
  private reconnectTimer: any = null;
  private isConnecting = false;

  constructor(config: DerivConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) return true;
    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${this.config.appId}`);

        this.ws.onopen = async () => {
          try {
            const authResult = await this.authorize();
            this.authorized = authResult;
            this.isConnecting = false;
            resolve(authResult);
          } catch (e) {
            this.isConnecting = false;
            reject(e);
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };

        this.ws.onclose = () => {
          this.authorized = false;
          this.isConnecting = false;
          this.scheduleReconnect();
        };

        this.ws.onerror = (err) => {
          this.isConnecting = false;
          reject(err);
        };
      } catch (e) {
        this.isConnecting = false;
        reject(e);
      }
    });
  }

  private async authorize(): Promise<boolean> {
    const response = await this.sendMessage({ authorize: this.config.apiToken });
    return response.authorize !== undefined;
  }

  private sendMessage(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not connected"));
        return;
      }

      const id = this.messageId++;
      const message = { ...data, req_id: id };
      this.pendingMessages.set(id, { resolve, reject });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error("Request timeout"));
        }
      }, 10000);

      this.ws.send(JSON.stringify(message));
    });
  }

  private handleMessage(data: any) {
    const reqId = data.req_id;
    if (reqId && this.pendingMessages.has(reqId)) {
      const { resolve, reject } = this.pendingMessages.get(reqId)!;
      this.pendingMessages.delete(reqId);

      if (data.error) {
        reject(new Error(data.error.message));
      } else {
        resolve(data);
      }
      return;
    }

    // Handle subscriptions
    if (data.balance) {
      this.onBalanceUpdate?.(data.balance.balance);
    }
    if (data.portfolio) {
      this.onPositionsUpdate?.(data.portfolio.contracts || []);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {});
    }, 5000);
  }

  async getAccountInfo(): Promise<AccountInfo> {
    const response = await this.sendMessage({ authorize: this.config.apiToken });
    return response.authorize;
  }

  async subscribeBalance(callback: (balance: number) => void) {
    this.onBalanceUpdate = callback;
    await this.sendMessage({ balance: 1, subscribe: 1, account: "current" });
  }

  async getPortfolio(): Promise<OpenPosition[]> {
    const response = await this.sendMessage({ portfolio: 1 });
    return response.portfolio?.contracts || [];
  }

  async subscribePortfolio(callback: (positions: OpenPosition[]) => void) {
    this.onPositionsUpdate = callback;
    await this.sendMessage({ portfolio: 1, subscribe: 1 });
  }

  async closePosition(contractId: number): Promise<any> {
    return this.sendMessage({ sell: contractId, price: 0 });
  }

  async closeAllPositions(): Promise<number> {
    const positions = await this.getPortfolio();
    let closed = 0;
    for (const pos of positions) {
      try {
        await this.closePosition(pos.contract_id);
        closed++;
      } catch (e) {
        console.error(`Failed to close position ${pos.contract_id}:`, e);
      }
    }
    return closed;
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.authorized = false;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.authorized;
  }
}

export default DerivAPI;
