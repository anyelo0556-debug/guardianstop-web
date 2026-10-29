import { Link } from "react-router";
import {
  Shield, ArrowLeft, Server, Lock, Zap, Globe,
  Database, Code, RefreshCw, AlertTriangle, CheckCircle,
} from "lucide-react";

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-gs-bg text-white">
      <header className="border-b border-gs-gold/20 bg-gs-surface/40 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-gs-gold" />
            <h1 className="text-lg font-bold font-display">GUARDIAN STOP</h1>
          </div>
          <Link to="/"
            className="flex items-center gap-1 rounded-lg border border-gs-border/60 px-3 py-1.5 text-xs text-gs-muted hover:bg-gs-surface/30 transition-colors">
            <ArrowLeft className="h-3 w-3" /> Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gs-gold mb-2">Arquitectura Técnica</h1>
          <p className="text-sm text-gs-muted max-w-2xl mx-auto">
            Diseño de Guardian Stop orientado a seguridad, transparencia y cumplimiento regulatorio.
            Ningún dato sensible del trader queda expuesto.
          </p>
        </div>

        {/* Architecture Diagram */}
        <div className="rounded-xl border border-gs-gold/20 bg-gs-surface/20 p-6">
          <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
            <Globe className="h-4 w-4 text-gs-gold" /> Diagrama de Flujo
          </h2>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center">
            {/* Trader */}
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gs-border/40 bg-gs-bg w-full md:w-48">
              <div className="w-10 h-10 rounded-full bg-gs-gold/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-gs-gold" />
              </div>
              <p className="text-xs font-bold">Trader</p>
              <p className="text-[10px] text-gs-muted">Configura límites y conecta cuenta</p>
            </div>

            <Zap className="h-4 w-4 text-gs-gold hidden md:block" />
            <div className="md:hidden"><Zap className="h-4 w-4 text-gs-gold rotate-90" /></div>

            {/* Guardian Web */}
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gs-gold/40 bg-gs-gold/5 w-full md:w-48">
              <div className="w-10 h-10 rounded-full bg-gs-gold/20 flex items-center justify-center">
                <Code className="h-5 w-5 text-gs-gold" />
              </div>
              <p className="text-xs font-bold text-gs-gold">Guardian Stop Web</p>
              <p className="text-[10px] text-gs-muted">React + TypeScript</p>
            </div>

            <Zap className="h-4 w-4 text-gs-gold hidden md:block" />
            <div className="md:hidden"><Zap className="h-4 w-4 text-gs-gold rotate-90" /></div>

            {/* API Server */}
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-blue-500/40 bg-blue-500/5 w-full md:w-48">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Server className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-xs font-bold text-blue-400">API Server</p>
              <p className="text-[10px] text-gs-muted">tRPC + Hono + Node.js</p>
            </div>

            <Zap className="h-4 w-4 text-gs-gold hidden md:block" />
            <div className="md:hidden"><Zap className="h-4 w-4 text-gs-gold rotate-90" /></div>

            {/* Deriv API */}
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-red-500/40 bg-red-500/5 w-full md:w-48">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-xs font-bold text-red-400">Deriv API</p>
              <p className="text-[10px] text-gs-muted">WebSocket wss://ws.derivws.com</p>
            </div>
          </div>
        </div>

        {/* Security Layers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gs-border/60 bg-gs-surface/20 p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4 text-gs-gold" /> Capas de Seguridad
            </h2>
            <div className="space-y-3">
              {[
                { icon: Lock, text: "Tokens API encriptados AES-256 en reposo" },
                { icon: Server, text: "Comunicación TLS 1.3 entre todos los nodos" },
                { icon: Database, text: "Base de datos MySQL con acceso restringido" },
                { icon: Code, text: "Validación Zod en todas las entradas de API" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <item.icon className="h-3 w-3 text-gs-gold mt-0.5 shrink-0" />
                  <p className="text-xs text-gs-text">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gs-border/60 bg-gs-surface/20 p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-gs-gold" /> Permisos API (Mínimos)
            </h2>
            <div className="space-y-3">
              {[
                { ok: true, text: "READ — Consultar balance y posiciones abiertas" },
                { ok: true, text: "TRADE — Cerrar posiciones (NO abrir nuevas)" },
                { ok: false, text: "PAYMENTS — NO accede a depósitos ni retiros" },
                { ok: false, text: "ADMIN — NO accede a configuración de cuenta" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  {item.ok ? (
                    <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                  )}
                  <p className="text-xs text-gs-text">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Flow */}
        <div className="rounded-xl border border-gs-border/60 bg-gs-surface/20 p-5">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-gs-gold" /> Flujo de Protección (Automático)
          </h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Conexión", desc: "El trader autoriza Guardian Stop vía token API de solo lectura + cierre." },
              { step: "2", title: "Monitoreo", desc: "Cada 5 segundos se consulta balance y posiciones abiertas." },
              { step: "3", title: "Evaluación", desc: "Se compara pérdida acumulada vs límites configurados (diario/sem./mens.)." },
              { step: "4", title: "Acción", desc: "Si se alcanza un límite → cierra TODAS las posiciones inmediatamente." },
              { step: "5", title: "Notificación", desc: "Se registra el evento y se muestra alerta en el panel del trader." },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gs-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-gs-gold">{item.step}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{item.title}</p>
                  <p className="text-xs text-gs-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contingency Plan */}
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
          <h2 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Plan de Contingencia
          </h2>
          <ul className="space-y-2 text-xs text-gs-text">
            <li><strong>Caída de conexión:</strong> Si se pierde la conexión WebSocket, Guardian Stop NO toma acciones. El trader retiene el control total.</li>
            <li><strong>Error de API:</strong> Los errores se registran y se notifican. No se intentan operaciones ambiguas.</li>
            <li><strong>Límites no alcanzados:</strong> Si no hay posiciones abiertas, no hay acciones que tomar. El sistema permanece en espera.</li>
            <li><strong>Token revocado:</strong> Si el trader revoca el token, la conexión falla y se notifica inmediatamente.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
