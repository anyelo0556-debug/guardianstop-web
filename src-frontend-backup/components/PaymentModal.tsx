import { useState, useEffect, useRef } from "react";
import { X, CreditCard, Wallet, Bitcoin, Loader2, CheckCircle, Copy } from "lucide-react";
import { useLang } from "@/hooks/useLang";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planType: "basic" | "trailing";
  periodDays: number;
  price: string;
}

// ─── CONFIGURACIÓN DE PAGOS (reemplaza con tus datos reales) ───
const PAYMENT_CONFIG = {
  stripe: {
    // Crea Payment Links en tu dashboard de Stripe y pega las URLs aquí
    basic30: "https://buy.stripe.com/test_basic30_placeholder",
    basic90: "https://buy.stripe.com/test_basic90_placeholder",
    basic180: "https://buy.stripe.com/test_basic180_placeholder",
    basic365: "https://buy.stripe.com/test_basic365_placeholder",
    trailing30: "https://buy.stripe.com/test_trailing30_placeholder",
    trailing90: "https://buy.stripe.com/test_trailing90_placeholder",
    trailing180: "https://buy.stripe.com/test_trailing180_placeholder",
    trailing365: "https://buy.stripe.com/test_trailing365_placeholder",
  },
  crypto: {
    // Reemplaza con tus direcciones reales de wallet
    usdc: "0x1234567890123456789012345678901234567890", // ETH/BSC
    usdt: "0x1234567890123456789012345678901234567890", // ETH/BSC
  },
  paypal: {
    // Tu Client ID de PayPal (sandbox o live)
    clientId: "AfW_2kcBmXe5Z1JlkFBWWz5lmfYtLtEQaBi5hM0EsBqxS7Oan5f1oSPfXyJwc6FtdE-bLyg5FPF9VrBn",
  },
};

// Cargar script de PayPal dinámicamente
function loadPayPalScript(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById("paypal-script")) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "paypal-script";
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription&components=buttons`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("PayPal SDK failed"));
    document.body.appendChild(script);
  });
}

export default function PaymentModal({ isOpen, onClose, planType, periodDays, price }: PaymentModalProps) {
  const { lang } = useLang();
  const isEs = lang === "es";
  const [method, setMethod] = useState<"stripe" | "paypal" | "crypto_usdc" | "crypto_usdt" | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const paypalRef = useRef<HTMLDivElement>(null);

  const t = {
    title: isEs ? "Selecciona método de pago" : "Select payment method",
    stripe: isEs ? "Tarjeta de crédito/débito" : "Credit/Debit card",
    paypal: "PayPal",
    crypto: isEs ? "Criptomonedas" : "Cryptocurrency",
    usdc: "USDC (ERC-20 / BEP-20)",
    usdt: "USDT (ERC-20 / BEP-20)",
    processing: isEs ? "Procesando..." : "Processing...",
    cryptoInstructions: isEs
      ? "Envía el monto exacto a la siguiente dirección. Tu suscripción se activará manualmente tras confirmar el pago (máx 24h)."
      : "Send the exact amount to the following address. Your subscription will be manually activated after payment confirmation (max 24h).",
    copy: isEs ? "Copiar dirección" : "Copy address",
    copied: isEs ? "¡Copiado!" : "Copied!",
    amount: isEs ? "Monto a enviar" : "Amount to send",
    address: isEs ? "Dirección de pago" : "Payment address",
    close: isEs ? "Cerrar" : "Close",
    plan: isEs ? "Plan" : "Plan",
    period: isEs ? "Período" : "Period",
    stripeNote: isEs
      ? "Serás redirigido a Stripe para pagar de forma segura."
      : "You will be redirected to Stripe to pay securely.",
    paypalNote: isEs
      ? "Completa el pago con tu cuenta PayPal."
      : "Complete payment with your PayPal account.",
  };

  const planKey = `${planType}${periodDays}` as keyof typeof PAYMENT_CONFIG.stripe;
  const stripeUrl = PAYMENT_CONFIG.stripe[planKey];

  // ─── PAYPAL SETUP ────────────────────────────────────────────────
  useEffect(() => {
    if (method === "paypal" && paypalRef.current && window.paypal) {
      paypalRef.current.innerHTML = "";
      window.paypal
        .Buttons({
          style: { shape: "pill", color: "gold", layout: "vertical" },
          createSubscription: (_data: any, actions: any) => {
            const planId = planType === "basic"
              ? (periodDays === 30 ? "P-BASIC-30" : periodDays === 90 ? "P-BASIC-90" : periodDays === 180 ? "P-BASIC-180" : "P-BASIC-365")
              : (periodDays === 30 ? "P-TRAILING-30" : periodDays === 90 ? "P-TRAILING-90" : periodDays === 180 ? "P-TRAILING-180" : "P-TRAILING-365");
            return actions.subscription.create({ plan_id: planId });
          },
          onApprove: (_data: any, _actions: any) => {
            window.location.href = `${window.location.origin}/payment/success`;
          },
          onCancel: () => {
            window.location.href = `${window.location.origin}/payment/cancel`;
          },
          onError: (err: any) => {
            console.error("PayPal error:", err);
            alert(isEs ? "Error con PayPal. Intenta otro método." : "PayPal error. Try another method.");
          },
        })
        .render(paypalRef.current);
    }
  }, [method, planType, periodDays, isEs]);

  const handleStripe = () => {
    if (stripeUrl && !stripeUrl.includes("placeholder")) {
      window.location.href = stripeUrl;
    } else {
      alert(isEs
        ? "Stripe aún no está configurado. Contacta a soporte."
        : "Stripe not configured yet. Contact support.");
    }
  };

  const handlePayPal = async () => {
    setLoading(true);
    try {
      await loadPayPalScript(PAYMENT_CONFIG.paypal.clientId);
      setPaypalLoaded(true);
    } catch (e) {
      alert(isEs ? "Error cargando PayPal. Intenta de nuevo." : "Error loading PayPal. Try again.");
    }
    setLoading(false);
  };

  const cryptoData = method === "crypto_usdc"
    ? { address: PAYMENT_CONFIG.crypto.usdc, currency: "USDC", amount: price }
    : method === "crypto_usdt"
    ? { address: PAYMENT_CONFIG.crypto.usdt, currency: "USDT", amount: price }
    : null;

  const copyAddress = () => {
    if (cryptoData?.address) {
      navigator.clipboard.writeText(cryptoData.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-gs-gold/30 bg-gs-bg/95 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gs-gold/20 px-6 py-4">
          <h3 className="text-lg font-bold text-white font-display">{t.title}</h3>
          <button onClick={onClose} className="text-gs-muted hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Plan Summary */}
        <div className="bg-gs-gold/5 px-6 py-3 border-b border-gs-gold/10">
          <div className="flex justify-between text-sm">
            <span className="text-gs-muted">{t.plan}:</span>
            <span className="text-white font-bold">
              {planType === "basic" ? "GUARDIAN BASIC" : "GUARDIAN TRAILING"}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gs-muted">{t.period}:</span>
            <span className="text-gs-gold font-bold">{periodDays} días</span>
          </div>
          <div className="flex justify-between text-lg mt-2 pt-2 border-t border-gs-gold/20">
            <span className="text-gs-muted font-bold">Total:</span>
            <span className="text-gs-gold font-bold font-display">${price} USD</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {cryptoData ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-gs-gold/20 bg-gs-surface/30 p-4">
                <p className="text-sm text-gs-muted mb-3">{t.cryptoInstructions}</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gs-gold font-bold">{t.amount}</label>
                    <div className="mt-1 flex items-center gap-2 rounded-lg border border-gs-border/60 bg-gs-bg px-3 py-2">
                      <span className="text-white font-mono font-bold">{cryptoData.amount}</span>
                      <span className="text-gs-gold text-sm">{cryptoData.currency}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gs-gold font-bold">{t.address}</label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 rounded-lg border border-gs-border/60 bg-gs-bg px-3 py-2 text-xs text-white font-mono break-all">
                        {cryptoData.address}
                      </code>
                      <button
                        onClick={copyAddress}
                        className="flex items-center gap-1 rounded-lg bg-gs-gold px-3 py-2 text-xs font-bold text-gs-bg hover:bg-gs-gold-light transition-colors"
                      >
                        {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? t.copied : t.copy}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full rounded-lg border border-gs-border/60 py-3 text-sm font-bold text-gs-muted hover:bg-gs-surface/30 transition-colors"
              >
                {t.close}
              </button>
            </div>
          ) : method === "paypal" && paypalLoaded ? (
            <div className="space-y-4">
              <p className="text-sm text-gs-muted text-center">{t.paypalNote}</p>
              <div ref={paypalRef} className="paypal-button-container" />
              <button
                onClick={() => { setMethod(null); setPaypalLoaded(false); }}
                className="w-full rounded-lg border border-gs-border/60 py-3 text-sm font-bold text-gs-muted hover:bg-gs-surface/30 transition-colors"
              >
                {t.close}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Stripe */}
              <button
                onClick={() => { setMethod("stripe"); handleStripe(); }}
                disabled={loading}
                className="flex w-full items-center gap-4 rounded-xl border border-gs-border/60 bg-gs-surface/20 p-4 text-left transition-all hover:border-gs-gold/40 hover:bg-gs-gold/5 disabled:opacity-50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#635BFF]/10">
                  <CreditCard className="h-6 w-6 text-[#635BFF]" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{t.stripe}</p>
                  <p className="text-xs text-gs-muted">Visa, Mastercard, Amex</p>
                </div>
                <span className="text-gs-gold font-bold">→</span>
              </button>

              {/* PayPal */}
              <button
                onClick={() => { setMethod("paypal"); handlePayPal(); }}
                disabled={loading}
                className="flex w-full items-center gap-4 rounded-xl border border-gs-border/60 bg-gs-surface/20 p-4 text-left transition-all hover:border-[#003087]/40 hover:bg-[#003087]/5 disabled:opacity-50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#003087]/10">
                  <Wallet className="h-6 w-6 text-[#0070BA]" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{t.paypal}</p>
                  <p className="text-xs text-gs-muted">PayPal balance / Tarjeta</p>
                </div>
                {loading && method === "paypal" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gs-gold" />
                ) : (
                  <span className="text-gs-gold font-bold">→</span>
                )}
              </button>

              {/* Crypto */}
              <div className="rounded-xl border border-gs-border/60 bg-gs-surface/20 p-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                    <Bitcoin className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{t.crypto}</p>
                    <p className="text-xs text-gs-muted">USDC / USDT</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMethod("crypto_usdc")}
                    className="rounded-lg border border-gs-border/40 bg-gs-bg py-2.5 text-sm font-bold text-white hover:border-gs-gold/40 transition-colors"
                  >
                    {t.usdc}
                  </button>
                  <button
                    onClick={() => setMethod("crypto_usdt")}
                    className="rounded-lg border border-gs-border/40 bg-gs-bg py-2.5 text-sm font-bold text-white hover:border-gs-gold/40 transition-colors"
                  >
                    {t.usdt}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
