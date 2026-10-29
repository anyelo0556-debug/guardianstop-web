import { useState } from "react";
import { Lock, ShieldCheck, FileText, Link2, Eye, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function generateHashChain(count: number) {
  const entries = [];
  let prev = "GENESIS";
  for (let i = 1; i <= count; i++) {
    const payload = JSON.stringify({ state: i === 3 ? "KILLING" : i === 4 ? "LOCKED" : "MONITORING", drawdown: (0.2 + i * 0.15).toFixed(2) + "%" });
    const hash = Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
    const full = `${i}|ACC-001|${prev}|${payload}`;
    entries.push({ seq: i, prev, hash, payload: JSON.parse(payload), full });
    prev = hash;
  }
  return entries;
}

export default function LedgerAudit() {
  const [chain] = useState(() => generateHashChain(5));
  const [revealed, setRevealed] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl font-display">
          Auditoría Criptográfica
        </h2>
        <p className="mt-3 text-gs-muted max-w-2xl mx-auto">
          Ledger append-only con encadenamiento SHA-256. Cada entrada depende criptográficamente de la anterior.
          Imposible de alterar sin romper la cadena.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hash chain visualization */}
        <Card className="border-gs-border bg-gs-surface/60">
          <CardHeader className="border-b border-gs-border pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-mono text-gs-muted">
              <Hash className="h-4 w-4 text-gs-green" />
              CADENA HASH — ACC-001
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {chain.map((entry) => (
              <div
                key={entry.seq}
                className="rounded border border-gs-border bg-gs-bg p-3 transition-all hover:border-gs-green/40 cursor-pointer"
                onClick={() => setRevealed(revealed === entry.seq ? null : entry.seq)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gs-muted bg-gs-surface px-1.5 py-0.5 rounded border border-gs-border">
                      #{entry.seq.toString().padStart(4, "0")}
                    </span>
                    <span className={`text-xs font-bold font-mono ${
                      entry.payload.state === "KILLING" ? "text-gs-purple" :
                      entry.payload.state === "LOCKED" ? "text-gs-cyan" : "text-gs-green"
                    }`}>
                      {entry.payload.state}
                    </span>
                  </div>
                  <Eye className="h-3 w-3 text-gs-muted" />
                </div>
                <div className="font-mono text-[10px] text-gs-muted truncate">
                  PREV: {entry.prev === "GENESIS" ? "GENESIS" : entry.prev.slice(0, 24) + "..."}
                </div>
                <div className="font-mono text-[10px] text-gs-green truncate mt-0.5">
                  HASH: {entry.hash.slice(0, 28)}...
                </div>
                {revealed === entry.seq && (
                  <div className="mt-2 rounded bg-gs-surface p-2 text-[10px] font-mono text-gs-muted border border-gs-border">
                    <div className="mb-1 text-gs-gold">Datos hasheados:</div>
                    <div>{entry.full}</div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Explanation */}
        <div className="flex flex-col gap-4">
          <Card className="border-gs-border bg-gs-surface/60">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded bg-gs-green/10 p-2 border border-gs-green/20">
                  <Lock className="h-4 w-4 text-gs-green" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Append-Only</h3>
                  <p className="text-xs text-gs-muted mt-1">
                    No existe operación de update ni delete. El ledger solo crece. Esto garantiza que
                    cualquier auditor puede reconstruir la historia completa desde el primer evento.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 rounded bg-gs-gold/10 p-2 border border-gs-gold/20">
                  <Link2 className="h-4 w-4 text-gs-gold" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Encadenamiento SHA-256</h3>
                  <p className="text-xs text-gs-muted mt-1">
                    Cada entrada incluye el hash de la anterior. Si un atacante modifica una entrada histórica,
                    el hash cambia y invalida toda la cadena posterior.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 rounded bg-gs-cyan/10 p-2 border border-gs-cyan/20">
                  <FileText className="h-4 w-4 text-gs-cyan" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Evidencia Legal</h3>
                  <p className="text-xs text-gs-muted mt-1">
                    En disputas trader-bróker, el ledger actúa como registro inquebrantable. Muestra exactamente
                    cuándo se detectó el breach, cuándo se emitió el comando de cierre y cuál fue la respuesta.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 rounded bg-gs-purple/10 p-2 border border-gs-purple/20">
                  <ShieldCheck className="h-4 w-4 text-gs-purple" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Verificación Independiente</h3>
                  <p className="text-xs text-gs-muted mt-1">
                    Cualquier parte (trader, bróker, regulador) puede descargar el ledger y verificar
                    la integridad de la cadena con una función SHA-256 estándar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="rounded border border-gs-border bg-gs-bg p-4 font-mono text-[10px] text-gs-muted">
            <div className="mb-2 text-gs-gold">// Fórmula de hash</div>
            <div className="text-gs-text">
              SHA256(seq | account_id | prev_hash | payload)
            </div>
            <div className="mt-2 text-gs-muted">
              Ejemplo: SHA256(0001|ACC-001|GENESIS|{"{"}state:"MONITORING"{"}"})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
