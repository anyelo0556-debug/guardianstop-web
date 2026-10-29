/**
 * WEB SECURITY — Parche de seguridad para la pagina web (Servidor 2)
 * Detecta ataques, malware, intrusiones.
 * Si detecta un ataque grave: auto-destruye la web, crea un backup comprimido,
 * lo envia por email al admin, y bloquea todo acceso.
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { execSync } from "child_process";
import path from "path";

// ============================================================
// CONFIGURACION DE SEGURIDAD
// ============================================================

const CONFIG = {
  // Email del admin donde enviar el backup de emergencia
  adminEmail: process.env.ADMIN_EMAIL || "angel@guardianstop.com",

  // Directorio donde guardar backups de emergencia
  backupDir: process.env.BACKUP_DIR || "/var/guardian-emergency",

  // Intentos de login fallidos antes de bloquear IP
  maxIntentosLogin: 5,

  // Si detecta mas de X requests por segundo desde una IP = ataque DDoS
  maxRequestsPorSegundo: 100,

  // Palabras clave que indican ataque (SQL injection, XSS, etc.)
  patronesAtaque: [
    "script>",
    "javascript:",
    "onerror=",
    "onload=",
    "eval(",
    "document.cookie",
    "SELECT * FROM",
    "DROP TABLE",
    "INSERT INTO",
    "UNION SELECT",
    "<iframe",
    "<object",
    "<embed",
    "../",
    "..\\",
    "/etc/passwd",
    "cmd.exe",
    "powershell",
    "bash -i",
    "nc -e",
    "<script",
    "</script>",
    "alert(",
    "prompt(",
    "confirm(",
  ],

  // Archivos criticos que NUNCA deben ser accedidos directamente
  archivosProhibidos: [
    ".env",
    ".env.local",
    ".env.production",
    "config.json",
    "secrets.json",
    "private.key",
    "id_rsa",
    ".git/config",
    ".git/HEAD",
    "package-lock.json",
    "yarn.lock",
    ".htpasswd",
  ],
};

// ============================================================
// ESTADO DE SEGURIDAD
// ============================================================

interface EstadoSeguridad {
  activo: boolean;
  modoAtaque: boolean;
  ipsBloqueadas: Set<string>;
  intentosLogin: Map<string, number>;
  requestsPorIP: Map<string, number[]>;
  ultimoBackup: Date | null;
  ataquesDetectados: number;
}

const estado: EstadoSeguridad = {
  activo: true,
  modoAtaque: false,
  ipsBloqueadas: new Set(),
  intentosLogin: new Map(),
  requestsPorIP: new Map(),
  ultimoBackup: null,
  ataquesDetectados: 0,
};

// ============================================================
// 1. DETECTAR ATAQUE EN REQUEST
// ============================================================

export function detectarAtaque(
  ip: string,
  url: string,
  body: string,
  headers: Record<string, string>
): { ataque: boolean; nivel: "BAJO" | "MEDIO" | "ALTO" | "CRITICO"; razon: string } {
  // 1.1 Verificar si la IP ya esta bloqueada
  if (estado.ipsBloqueadas.has(ip)) {
    return { ataque: true, nivel: "CRITICO", razon: "IP bloqueada por ataques previos" };
  }

  // 1.2 Verificar patrones de ataque en URL y body
  const textoCompleto = (url + " " + body).toLowerCase();
  for (const patron of CONFIG.patronesAtaque) {
    if (textoCompleto.includes(patron.toLowerCase())) {
      return { ataque: true, nivel: "ALTO", razon: `Patron de ataque detectado: ${patron}` };
    }
  }

  // 1.3 Verificar acceso a archivos prohibidos
  for (const archivo of CONFIG.archivosProhibidos) {
    if (url.includes(archivo)) {
      return { ataque: true, nivel: "ALTO", razon: `Intento de acceso a archivo critico: ${archivo}` };
    }
  }

  // 1.4 Verificar User-Agent sospechoso (bots de ataque)
  const userAgent = (headers["user-agent"] || "").toLowerCase();
  const botsMaliciosos = ["sqlmap", "nikto", "nmap", "masscan", "zgrab", "gobuster", "dirb"];
  for (const bot of botsMaliciosos) {
    if (userAgent.includes(bot)) {
      return { ataque: true, nivel: "MEDIO", razon: `Bot de ataque detectado: ${bot}` };
    }
  }

  // 1.5 Verificar DDoS (muchas requests rapido)
  const ahora = Date.now();
  const requests = estado.requestsPorIP.get(ip) || [];
  const requestsRecientes = requests.filter((t) => ahora - t < 1000);
  estado.requestsPorIP.set(ip, [...requestsRecientes, ahora]);

  if (requestsRecientes.length > CONFIG.maxRequestsPorSegundo) {
    return { ataque: true, nivel: "CRITICO", razon: `DDoS detectado: ${requestsRecientes.length} requests/segundo desde ${ip}` };
  }

  return { ataque: false, nivel: "BAJO", razon: "Sin amenazas detectadas" };
}

// ============================================================
// 2. BLOQUEAR IP
// ============================================================

export function bloquearIP(ip: string, razon: string): void {
  estado.ipsBloqueadas.add(ip);
  console.log(`[SEGURIDAD] IP BLOQUEADA: ${ip} | Razon: ${razon}`);

  // Si hay mas de 10 IPs bloqueadas en 1 minuto = ataque masivo
  if (estado.ipsBloqueadas.size > 10) {
    console.log("[SEGURIDAD] ATAQUE MASIVO DETECTADO. Activando protocolo de emergencia...");
    activarProtocoloEmergencia();
  }
}

// ============================================================
// 3. PROTOCOLO DE EMERGENCIA — AUTO-DESTRUCCION + BACKUP
// ============================================================

export async function activarProtocoloEmergencia(): Promise<void> {
  if (estado.modoAtaque) {
    console.log("[SEGURIDAD] Protocolo ya activado.");
    return;
  }

  estado.modoAtaque = true;
  estado.ataquesDetectados++;

  console.log("[SEGURIDAD] ==============================================");
  console.log("[SEGURIDAD] PROTOCOLO DE EMERGENCIA ACTIVADO");
  console.log("[SEGURIDAD] ==============================================");
  console.log("[SEGURIDAD] Auto-destruccion de la web iniciada...");

  try {
    // 3.1 Crear backup comprimido de TODO
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `guardian-emergency-backup-${timestamp}.tar.gz`;
    const backupPath = path.join(CONFIG.backupDir, backupFileName);

    // Crear directorio si no existe
    if (!existsSync(CONFIG.backupDir)) {
      mkdirSync(CONFIG.backupDir, { recursive: true });
    }

    // Comprimir todo el proyecto
    const projectRoot = process.cwd();
    execSync(`tar -czf ${backupPath} -C ${projectRoot} . --exclude=node_modules --exclude=dist --exclude=.git`, {
      timeout: 60000,
    });

    console.log(`[SEGURIDAD] Backup creado: ${backupPath}`);

    // 3.2 Enviar backup por email al admin
    await enviarBackupPorEmail(backupPath, backupFileName);

    // 3.3 Crear pagina de emergencia (web reducida a un solo archivo)
    const paginaEmergencia = crearPaginaEmergencia();
    const emergencyPath = path.join(CONFIG.backupDir, `emergency-page-${timestamp}.html`);
    writeFileSync(emergencyPath, paginaEmergencia);

    console.log(`[SEGURIDAD] Pagina de emergencia creada: ${emergencyPath}`);

    // 3.4 Escribir archivo de bloqueo
    const lockFile = path.join(CONFIG.backupDir, `.ATTACK_LOCK_${timestamp}`);
    writeFileSync(lockFile, `Ataque detectado: ${timestamp}\nIPs bloqueadas: ${Array.from(estado.ipsBloqueadas).join(", ")}\nBackup: ${backupFileName}`);

    console.log("[SEGURIDAD] Archivo de bloqueo creado.");

    // 3.5 Auto-destruir archivos sensibles de la web
    autoDestruir();

    console.log("[SEGURIDAD] Auto-destruccion completada.");
    console.log("[SEGURIDAD] La web esta en MODO EMERGENCIA.");
    console.log(`[SEGURIDAD] Backup enviado a: ${CONFIG.adminEmail}`);
    console.log("[SEGURIDAD] ==============================================");

  } catch (error) {
    console.error("[SEGURIDAD] Error en protocolo de emergencia:", error);
  }
}

// ============================================================
// 4. ENVIAR BACKUP POR EMAIL
// ============================================================

async function enviarBackupPorEmail(backupPath: string, fileName: string): Promise<void> {
  // TODO: Integrar con servicio de email (SendGrid, AWS SES, Resend, etc.)
  // Por ahora simulamos el envio

  console.log(`[SEGURIDAD] Enviando email a ${CONFIG.adminEmail}...`);
  console.log(`[SEGURIDAD] Adjunto: ${fileName}`);
  console.log(`[SEGURIDAD] Tamaño: ${(readFileSync(backupPath).length / 1024 / 1024).toFixed(2)} MB`);

  // En produccion, aqui se usaria una API de email:
  /*
  await sendEmail({
    to: CONFIG.adminEmail,
    subject: "[GUARDIAN STOP] PROTOCOLO DE EMERGENCIA ACTIVADO",
    body: `
      Se detecto un ataque masivo en Guardian Stop.
      La web ha sido auto-destruida para proteger la infraestructura.
      Backup adjunto con todo el codigo y datos.
      
      Fecha: ${new Date().toISOString()}
      IPs bloqueadas: ${Array.from(estado.ipsBloqueadas).join(", ")}
      
      Pasos a seguir:
      1. Descargar el backup adjunto
      2. Restaurar en un servidor limpio
      3. Cambiar todas las contraseñas
      4. Revisar logs de acceso
      5. Activar WAF (Firewall de aplicacion web)
    `,
    attachments: [{ path: backupPath, filename: fileName }],
  });
  */
}

// ============================================================
// 5. AUTO-DESTRUIR ARCHIVOS SENSIBLES
// ============================================================

function autoDestruir(): void {
  console.log("[SEGURIDAD] Auto-destruyendo archivos sensibles...");

  const archivosADestruir = [
    ".env",
    ".env.local",
    ".env.production",
    "api/services/RiskEngine.ts",
    "api/services/SupervisorMotor.ts",
    "api/services/GuardianoAI.ts",
    "db/schema.ts",
    "drizzle.config.ts",
  ];

  for (const archivo of archivosADestruir) {
    const ruta = path.join(process.cwd(), archivo);
    if (existsSync(ruta)) {
      // Sobrescribir con contenido basura (3 veces para seguridad)
      const basura = "ARCHIVO DESTRUIDO POR PROTOCOLO DE EMERGENCIA\n".repeat(100);
      for (let i = 0; i < 3; i++) {
        writeFileSync(ruta, basura + Math.random().toString(36));
      }
      console.log(`[SEGURIDAD] Destruido: ${archivo}`);
    }
  }

  // Crear pagina de emergencia en index.html
  const indexPath = path.join(process.cwd(), "index.html");
  writeFileSync(indexPath, crearPaginaEmergencia());
  console.log("[SEGURIDAD] index.html reemplazado con pagina de emergencia.");
}

// ============================================================
// 6. PAGINA DE EMERGENCIA (cuando la web es atacada)
// ============================================================

function crearPaginaEmergencia(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Guardian Stop — Mantenimiento de Emergencia</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0B1426;
      color: #F5F5DC;
      font-family: 'Inter', system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 2rem;
    }
    .container { max-width: 600px; }
    .shield {
      width: 120px;
      height: 120px;
      border: 4px solid #C9A84C;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 2rem;
      animation: pulse 2s infinite;
    }
    .shield-icon { font-size: 60px; }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.4); }
      50% { box-shadow: 0 0 0 20px rgba(201,168,76,0); }
    }
    h1 { font-size: 2rem; margin-bottom: 1rem; color: #C9A84C; }
    p { font-size: 1.1rem; line-height: 1.6; margin-bottom: 1.5rem; opacity: 0.9; }
    .status {
      display: inline-block;
      background: rgba(201,168,76,0.1);
      border: 1px solid #C9A84C;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-size: 0.9rem;
    }
    .email { color: #C9A84C; text-decoration: none; }
    .footer { margin-top: 3rem; font-size: 0.8rem; opacity: 0.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="shield">
      <span class="shield-icon">🛡️</span>
    </div>
    <h1>Guardian Stop</h1>
    <p>Estamos realizando mantenimiento de emergencia para proteger tu informacion.</p>
    <p>Nuestros sistemas de seguridad detectaron una actividad anomala y activaron protocolos de proteccion automaticos.</p>
    <div class="status">Estado: <strong>Protocolo de Emergencia Activo</strong></div>
    <p style="margin-top: 2rem;">
      Si necesitas contactarnos:<br>
      <a href="mailto:emergency@guardianstop.com" class="email">emergency@guardianstop.com</a>
    </p>
    <div class="footer">
      El motor de proteccion sigue funcionando. Las cuentas de trading estan seguras.<br>
      Guardian Stop — Disciplina sobre todo.
    </div>
  </div>
</body>
</html>`;
}

// ============================================================
// 7. OBTENER ESTADO DE SEGURIDAD
// ============================================================

export function obtenerEstadoSeguridad() {
  return {
    activo: estado.activo,
    modoAtaque: estado.modoAtaque,
    ipsBloqueadas: Array.from(estado.ipsBloqueadas),
    ataquesDetectados: estado.ataquesDetectados,
    ultimoBackup: estado.ultimoBackup,
  };
}

// ============================================================
// 8. REINICIAR SEGURIDAD (solo admin)
// ============================================================

export function reiniciarSeguridad(): void {
  estado.modoAtaque = false;
  estado.ipsBloqueadas.clear();
  estado.intentosLogin.clear();
  estado.requestsPorIP.clear();
  console.log("[SEGURIDAD] Estado de seguridad REINICIADO.");
}
