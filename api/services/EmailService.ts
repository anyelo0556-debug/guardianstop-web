interface WelcomeEmailParams {
  to: string;
  name: string;
  planType: "basic" | "trailing";
  periodDays: number;
  price: string;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams) {
  const planName = params.planType === "basic" ? "GUARDIAN BASIC" : "GUARDIAN TRAILING";
  const firstName = params.name.split(" ")[0];
  const subject = `Bienvenido a Guardian Stop, ${firstName} — tu protección ya está activa`;

  const html = `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0a0a0f;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;padding:24px 0;">
      <h1 style="color:#d4af37;letter-spacing:4px;margin:0;font-size:22px;">GUARDIAN STOP</h1>
      <p style="color:#8a8a95;font-size:12px;margin:6px 0 0;">Tu freno emocional automatizado</p>
    </div>
    <div style="background:#14141c;border:1px solid #26262e;border-radius:12px;padding:32px;">
      <h2 style="color:#ffffff;font-size:20px;margin:0 0 12px;">¡Bienvenido, ${params.name}!</h2>
      <p style="color:#b8b8c2;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Tu registro se completó con éxito y tu protección ya está <strong style="color:#d4af37;">ACTIVA</strong>.
        A partir de ahora, Guardian Stop monitorea tu cuenta cada 3 segundos y cierra tus posiciones
        automáticamente si alcanzas tus límites de pérdida.
      </p>
      <div style="background:#0a0a0f;border:1px solid #d4af3733;border-radius:8px;padding:16px;margin-bottom:20px;">
        <p style="color:#8a8a95;font-size:11px;margin:0 0 8px;letter-spacing:2px;">RESUMEN DE TU SUSCRIPCIÓN</p>
        <p style="color:#ffffff;font-size:14px;margin:0;"><strong>Plan:</strong> ${planName}</p>
        <p style="color:#ffffff;font-size:14px;margin:6px 0 0;"><strong>Duración:</strong> ${params.periodDays} días</p>
        <p style="color:#d4af37;font-size:14px;margin:6px 0 0;"><strong>Total:</strong> $${params.price} USD</p>
      </div>
      <div style="text-align:center;margin-bottom:20px;">
        <a href="https://guardianstop.com/panel" style="background:#d4af37;color:#0a0a0f;font-weight:bold;font-size:14px;padding:14px 32px;border-radius:50px;text-decoration:none;display:inline-block;">
          Ir a mi Panel
        </a>
      </div>
      <p style="color:#8a8a95;font-size:12px;line-height:1.6;margin:0;">
        ¿Necesitas ayuda? Responde a este correo o escríbenos por WhatsApp.
        Recuerda: la garantía de 7 días aplica desde hoy.
      </p>
    </div>
    <p style="color:#55555f;font-size:10px;text-align:center;margin-top:20px;">
      © ${new Date().getFullYear()} Guardian Stop · guardianstop.com
    </p>
  </div>
</body></html>`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[EMAIL-DEMO] Bienvenida a ${params.to} | Plan ${planName} ${params.periodDays}d`);
    return { sent: false, demo: true };
  }

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Guardian Stop <onboarding@resend.dev>",
      to: params.to,
      subject,
      html,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("[email] Resend error:", err);
    throw new Error("No se pudo enviar el correo de bienvenida");
  }
  return { sent: true, demo: false };
}
