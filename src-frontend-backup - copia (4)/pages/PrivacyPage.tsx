import { Link } from "react-router";
import { Shield, ArrowLeft, Lock, Eye, Server, Trash2, Mail } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gs-bg text-white">
      <header className="border-b border-gs-gold/20 bg-gs-surface/40 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
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

      <main className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl border border-gs-gold/20 bg-gs-surface/20 p-8">
          <h1 className="text-2xl font-bold text-gs-gold mb-2">Política de Privacidad</h1>
          <p className="text-xs text-gs-muted mb-8">Última actualización: Octubre 2026</p>

          <div className="space-y-8">
            <section>
              <h2 className="flex items-center gap-2 text-sm font-bold text-white mb-3">
                <Eye className="h-4 w-4 text-gs-gold" /> 1. Información que recopilamos
              </h2>
              <p className="text-sm text-gs-text leading-relaxed">
                Guardian Stop recopila únicamente la información necesaria para proporcionar el servicio de protección de riesgo:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-gs-muted list-disc list-inside">
                <li><strong>Tokens de API de bróker</strong> (Deriv, etc.) — almacenados encriptados con AES-256.</li>
                <li><strong>IDs de cuenta de trading</strong> — para identificar la cuenta protegida.</li>
                <li><strong>Logs de protección</strong> — registros de cuándo se activaron límites o se cerraron posiciones.</li>
                <li><strong>Datos de contacto</strong> — email para facturación y notificaciones.</li>
              </ul>
              <p className="mt-3 text-sm text-gs-text leading-relaxed">
                <strong>NO recopilamos:</strong> contraseñas de bróker, datos bancarios, documentos de identidad, ni historial de trading completo.
              </p>
            </section>

            <section>
              <h2 className="flex items-center gap-2 text-sm font-bold text-white mb-3">
                <Lock className="h-4 w-4 text-gs-gold" /> 2. Cómo usamos tu información
              </h2>
              <ul className="space-y-2 text-sm text-gs-muted list-disc list-inside">
                <li>Monitorear el balance y posiciones abiertas para aplicar límites de riesgo.</li>
                <li>Enviar alertas cuando se acerquen los límites configurados.</li>
                <li>Cerrar posiciones automáticamente cuando se alcance un límite de pérdida.</li>
                <li>Generar reportes de protección para el trader.</li>
                <li>Facturación y gestión de suscripción.</li>
              </ul>
            </section>

            <section>
              <h2 className="flex items-center gap-2 text-sm font-bold text-white mb-3">
                <Server className="h-4 w-4 text-gs-gold" /> 3. Almacenamiento y seguridad
              </h2>
              <p className="text-sm text-gs-text leading-relaxed">
                Todos los datos se almacenan en servidores con encriptación en tránsito (TLS 1.3) y en reposo (AES-256). Los tokens de API nunca se exponen en el frontend y se manejan únicamente server-side.
              </p>
              <p className="mt-2 text-sm text-gs-text leading-relaxed">
                No compartimos tus datos con terceros, excepto cuando sea requerido por ley o para cumplir con las políticas del bróker asociado.
              </p>
            </section>

            <section>
              <h2 className="flex items-center gap-2 text-sm font-bold text-white mb-3">
                <Trash2 className="h-4 w-4 text-gs-gold" /> 4. Retención y eliminación
              </h2>
              <p className="text-sm text-gs-text leading-relaxed">
                Los logs de protección se retienen por 90 días. Los datos de cuenta se eliminan automáticamente 30 días después de cancelar la suscripción. Puedes solicitar la eliminación inmediata de tus datos enviando un email a soporte.
              </p>
            </section>

            <section>
              <h2 className="flex items-center gap-2 text-sm font-bold text-white mb-3">
                <Mail className="h-4 w-4 text-gs-gold" /> 5. Contacto
              </h2>
              <p className="text-sm text-gs-text leading-relaxed">
                Para cualquier consulta sobre privacidad, ejercer tus derechos de acceso, rectificación o eliminación, contacta a:
              </p>
              <p className="mt-2 text-sm text-gs-gold font-mono">soporte-@guardianstop.com</p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
