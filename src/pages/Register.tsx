import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Shield, ArrowLeft, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/providers/trpc";

export default function Register() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const planType = (params.get("plan") === "basic" ? "basic" : "trailing") as "basic" | "trailing";
  const days = Number(params.get("days") || 90);
  const price = params.get("price") || "62.99";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const mutation = trpc.register.register.useMutation({
    onSuccess: () => navigate(`/bienvenida?plan=${planType}&days=${days}&price=${price}`),
    onError: (e) => setError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    mutation.mutate({ name, email, password, planType, periodDays: days, price });
  };

  return (
    <div className="min-h-screen bg-gs-bg flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-gs-muted hover:text-gs-gold mb-6">
          <ArrowLeft className="h-3 w-3" /> Volver al sitio
        </Link>

        <div className="rounded-xl border border-gs-gold/30 bg-gs-surface/30 p-6">
          <div className="text-center mb-6">
            <Shield className="h-8 w-8 text-gs-gold mx-auto mb-2" />
            <h1 className="text-lg font-bold text-white font-display tracking-wide">CREA TU CUENTA</h1>
          </div>

          <div className="mb-6 rounded-lg border border-gs-gold/20 bg-gs-gold/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gs-muted tracking-wider">PLAN SELECCIONADO</div>
                <div className="text-sm font-bold text-white">
                  {planType === "basic" ? "GUARDIAN BASIC" : "GUARDIAN TRAILING"} · {days} días
                </div>
              </div>
              <div className="text-xl font-bold text-gs-gold font-mono">${price}</div>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs text-gs-muted">Nombre completo</label>
              <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gs-border bg-gs-bg px-3 py-2.5 text-sm text-white focus:border-gs-gold/50 outline-none"
                placeholder="Tu nombre" />
            </div>
            <div>
              <label className="text-xs text-gs-muted">Correo electrónico</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gs-border bg-gs-bg px-3 py-2.5 text-sm text-white focus:border-gs-gold/50 outline-none"
                placeholder="tu@email.com" />
            </div>
            <div>
              <label className="text-xs text-gs-muted">Contraseña (mín. 6 caracteres)</label>
              <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gs-border bg-gs-bg px-3 py-2.5 text-sm text-white focus:border-gs-gold/50 outline-none"
                placeholder="••••••••" />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <Button type="submit" disabled={mutation.isPending}
              className="w-full rounded-full bg-gs-gold text-gs-bg font-bold hover:bg-gs-gold-light">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              ACTIVAR MI PROTECCIÓN
            </Button>
          </form>

          <p className="mt-4 text-[10px] text-gs-muted/60 text-center">
            Garantía de 7 días. Tu suscripción se activa de inmediato.
          </p>
        </div>
      </div>
    </div>
  );
}
