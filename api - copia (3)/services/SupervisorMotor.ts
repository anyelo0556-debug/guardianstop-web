/**
 * SUPERVISOR MOTOR — Servidor 3 (Standby + Monitor)
 * Este es el guardian del guardian. Vigila que el Motor Primario (Servidor 1)
 * este sano y trabajando. Si el Motor 1 se cae o se satura, este toma el control.
 * Cuando el Motor 1 vuelve, cede el control y vuelve a modo vigilancia.
 */

import { getDb } from "../queries/connection";
import { notifications } from "@db/schema";

// ============================================================
// CONFIGURACION DEL SUPERVISOR
// ============================================================

const CONFIG = {
  // Cada cuanto revisa la salud del Motor 1 (segundos)
  intervaloHeartbeat: 5,

  // Cuanto tiempo espera sin respuesta antes de declarar MUERTO al Motor 1 (segundos)
  tiempoMuerto: 15,

  // Si el Motor 1 tarda mas de esto en responder, se considera SATURADO (ms)
  latenciaMaxima: 3000,

  // Si el CPU del Motor 1 pasa este %, se considera SATURADO
  cpuMaximo: 85,

  // Si la memoria del Motor 1 pasa este %, se considera SATURADO
  memoriaMaxima: 85,

  // URL del Motor 1 (Servidor Primario)
  urlMotorPrimario: process.env.MOTOR_PRIMARIO_URL || "http://localhost:4001",

  // URL propia (para que el Motor 1 tambien nos vigile)
  urlPropio: process.env.MOTOR_STANDBY_URL || "http://localhost:4002",

  // Identificador de este servidor
  serverId: process.env.SERVER_ID || "standby-01",
};

// ============================================================
// ESTADO DEL SISTEMA
// ============================================================

interface EstadoMotor {
  online: boolean;
  ultimoHeartbeat: Date | null;
  latenciaMs: number;
  cpuPct: number;
  memoriaPct: number;
  cuentasVigilando: number;
  estado: "SANO" | "DUDOSO" | "CRITICO" | "MUERTO";
}

interface EstadoSupervisor {
  modo: "VIGILANCIA" | "ACTIVO" | "TRANSICION";
  motor1: EstadoMotor;
  cuentasActivasLocal: number;
  desde: Date;
}

// Estado global del supervisor
let estadoSupervisor: EstadoSupervisor = {
  modo: "VIGILANCIA",
  motor1: {
    online: false,
    ultimoHeartbeat: null,
    latenciaMs: 0,
    cpuPct: 0,
    memoriaPct: 0,
    cuentasVigilando: 0,
    estado: "MUERTO",
  },
  cuentasActivasLocal: 0,
  desde: new Date(),
};

// Flag para saber si este servidor esta corriendo el motor
let motorCorriendoAqui = false;

// Intervalos activos
let intervaloHeartbeat: ReturnType<typeof setInterval> | null = null;
let intervaloMotor: ReturnType<typeof setInterval> | null = null;

// ============================================================
// 1. HEARTBEAT — Revisar salud del Motor 1
// ============================================================

export async function revisarSaludMotorPrimario(): Promise<EstadoMotor> {
  const inicio = Date.now();

  try {
    // Enviar ping al Motor 1
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.latenciaMaxima);

    const respuesta = await fetch(`${CONFIG.urlMotorPrimario}/health`, {
      method: "GET",
      signal: controller.signal,
      headers: { "X-Supervisor-Id": CONFIG.serverId },
    });

    clearTimeout(timeout);
    const latencia = Date.now() - inicio;

    if (!respuesta.ok) {
      return {
        online: true,
        ultimoHeartbeat: new Date(),
        latenciaMs: latencia,
        cpuPct: 100,
        memoriaPct: 100,
        cuentasVigilando: 0,
        estado: "CRITICO",
      };
    }

    const datos = await respuesta.json() as {
      cpu?: number;
      memoria?: number;
      motorActivo?: boolean;
      cuentasActivas?: number;
    };

    // Determinar estado
    let estado: EstadoMotor["estado"] = "SANO";

    const cpu = datos.cpu ?? 0;
    const memoria = datos.memoria ?? 0;
    const motorActivo = datos.motorActivo ?? false;
    const cuentasActivas = datos.cuentasActivas ?? 0;

    if (cpu > CONFIG.cpuMaximo || memoria > CONFIG.memoriaMaxima) {
      estado = "CRITICO";
    } else if (latencia > CONFIG.latenciaMaxima) {
      estado = "DUDOSO";
    } else if (!motorActivo) {
      estado = "CRITICO";
    }

    return {
      online: true,
      ultimoHeartbeat: new Date(),
      latenciaMs: latencia,
      cpuPct: cpu,
      memoriaPct: memoria,
      cuentasVigilando: cuentasActivas,
      estado,
    };
  } catch (error) {
    // No respondio = MUERTO
    return {
      online: false,
      ultimoHeartbeat: estadoSupervisor.motor1.ultimoHeartbeat,
      latenciaMs: Date.now() - inicio,
      cpuPct: 0,
      memoriaPct: 0,
      cuentasVigilando: 0,
      estado: "MUERTO",
    };
  }
}

// ============================================================
// 2. DECIDIR QUE HACER SEGUN EL ESTADO DEL MOTOR 1
// ============================================================

export async function tomarDecision(): Promise<void> {
  const estado = estadoSupervisor.motor1;

  console.log(`[SUPERVISOR] Motor 1 estado: ${estado.estado} | Latencia: ${estado.latenciaMs}ms | Cuentas: ${estado.cuentasVigilando}`);

  switch (estado.estado) {
    case "SANO":
      if (estadoSupervisor.modo === "ACTIVO") {
        // El Motor 1 volvio a la vida y esta sano. Cedemos el control.
        console.log("[SUPERVISOR] Motor 1 esta SANO. Cedemos control...");
        await cederControl();
      } else if (estadoSupervisor.modo === "VIGILANCIA") {
        // Todo bien, seguimos vigilando
        console.log("[SUPERVISOR] Motor 1 SANO. Seguimos en vigilancia.");
      }
      break;

    case "DUDOSO":
      if (estadoSupervisor.modo === "VIGILANCIA") {
        // El Motor 1 esta lento pero aun responde. Alerta pero no actuamos todavia.
        console.log("[SUPERVISOR] Motor 1 DUDOSO. Latencia alta. Alerta enviada.");
        await enviarAlertaAdmin("Motor 1 esta lento. Latencia: " + estado.latenciaMs + "ms");
      }
      break;

    case "CRITICO":
      if (estadoSupervisor.modo === "VIGILANCIA") {
        // El Motor 1 esta saturado o no esta corriendo el motor. Preparamos takeover.
        console.log("[SUPERVISOR] Motor 1 CRITICO. Preparando toma de control...");
        await tomarControl();
      }
      break;

    case "MUERTO":
      if (estadoSupervisor.modo === "VIGILANCIA") {
        // El Motor 1 no responde. Tomamos control INMEDIATAMENTE.
        console.log("[SUPERVISOR] Motor 1 MUERTO. TOMANDO CONTROL AHORA!");
        await tomarControl();
        await enviarAlertaAdmin("MOTOR 1 CAIDO. Servidor 3 ha tomado el control automaticamente.");
      } else if (estadoSupervisor.modo === "ACTIVO") {
        // Ya estamos corriendo el motor, el Motor 1 sigue muerto
        console.log("[SUPERVISOR] Seguimos en control. Motor 1 sigue MUERTO.");
      }
      break;
  }
}

// ============================================================
// 3. TOMAR CONTROL (Failover)
// ============================================================

export async function tomarControl(): Promise<void> {
  if (estadoSupervisor.modo === "ACTIVO") {
    console.log("[SUPERVISOR] Ya estamos en control. No hacemos nada.");
    return;
  }

  console.log("[SUPERVISOR] ==============================================");
  console.log("[SUPERVISOR] INICIANDO TOMA DE CONTROL");
  console.log("[SUPERVISOR] ==============================================");

  estadoSupervisor.modo = "TRANSICION";

  // 3.1 Notificar a la base de datos que este servidor es ahora el activo
  const db = getDb();
  await db.insert(notifications).values({
    userId: 1, // Admin
    type: "limit_warning",
    title: "FAILOVER ACTIVADO",
    message: `El Servidor 3 (${CONFIG.serverId}) ha tomado el control del motor de riesgo. El Servidor 1 no responde.`,
  });

  // 3.2 Iniciar el motor en este servidor
  await iniciarMotorLocal();

  estadoSupervisor.modo = "ACTIVO";
  estadoSupervisor.desde = new Date();

  console.log("[SUPERVISOR] Control tomado exitosamente. Motor corriendo en Servidor 3.");
}

// ============================================================
// 4. CEDER CONTROL (Cuando Motor 1 vuelve)
// ============================================================

export async function cederControl(): Promise<void> {
  if (estadoSupervisor.modo !== "ACTIVO") {
    console.log("[SUPERVISOR] No estamos en control. No hay nada que ceder.");
    return;
  }

  console.log("[SUPERVISOR] ==============================================");
  console.log("[SUPERVISOR] CEDIENDO CONTROL AL MOTOR 1");
  console.log("[SUPERVISOR] ==============================================");

  estadoSupervisor.modo = "TRANSICION";

  // 4.1 Notificar
  const db = getDb();
  await db.insert(notifications).values({
    userId: 1,
    type: "auto_unlock",
    title: "FAILOVER REVERTIDO",
    message: `El Servidor 1 ha vuelto. El Servidor 3 (${CONFIG.serverId}) cede el control y vuelve a modo vigilancia.`,
  });

  // 4.2 Detener motor local
  await detenerMotorLocal();

  estadoSupervisor.modo = "VIGILANCIA";
  estadoSupervisor.desde = new Date();

  console.log("[SUPERVISOR] Control cedido. Volvimos a modo vigilancia.");
}

// ============================================================
// 5. INICIAR/DETENER MOTOR LOCAL
// ============================================================

// Importamos el motor de riesgo (mismo codigo que en Servidor 1)
import { ejecutarMotorGlobal, desbloquearCuentasDiarias } from "./RiskEngine";

async function iniciarMotorLocal(): Promise<void> {
  if (motorCorriendoAqui) {
    console.log("[SUPERVISOR] Motor ya corriendo aqui.");
    return;
  }

  console.log("[SUPERVISOR] Iniciando motor local...");

  // Correr motor global inmediatamente
  await ejecutarMotorGlobal();

  // Iniciar ciclo cada 5 segundos
  intervaloMotor = setInterval(async () => {
    try {
      await ejecutarMotorGlobal();
    } catch (err) {
      console.error("[SUPERVISOR] Error en motor local:", err);
    }
  }, 5000);

  motorCorriendoAqui = true;
  console.log("[SUPERVISOR] Motor local INICIADO. Ciclo cada 5 segundos.");
}

async function detenerMotorLocal(): Promise<void> {
  if (!motorCorriendoAqui) {
    console.log("[SUPERVISOR] Motor no estaba corriendo aqui.");
    return;
  }

  console.log("[SUPERVISOR] Deteniendo motor local...");

  if (intervaloMotor) {
    clearInterval(intervaloMotor);
    intervaloMotor = null;
  }

  motorCorriendoAqui = false;
  console.log("[SUPERVISOR] Motor local DETENIDO.");
}

// ============================================================
// 6. INICIAR SUPERVISOR (Servidor 3)
// ============================================================

export async function iniciarSupervisor(): Promise<void> {
  console.log("[SUPERVISOR] ==============================================");
  console.log(`[SUPERVISOR] Servidor 3 (${CONFIG.serverId}) INICIADO`);
  console.log("[SUPERVISOR] Modo: VIGILANCIA");
  console.log(`[SUPERVISOR] Monitoreando: ${CONFIG.urlMotorPrimario}`);
  console.log("[SUPERVISOR] ==============================================");

  // Revisar salud inmediatamente
  const estado = await revisarSaludMotorPrimario();
  estadoSupervisor.motor1 = estado;

  // Si el Motor 1 ya esta muerto al iniciar, tomamos control de inmediato
  if (estado.estado === "MUERTO") {
    console.log("[SUPERVISOR] Motor 1 esta MUERTO al iniciar. Tomando control...");
    await tomarControl();
  }

  // Iniciar ciclo de heartbeat cada 5 segundos
  intervaloHeartbeat = setInterval(async () => {
    try {
      const nuevoEstado = await revisarSaludMotorPrimario();
      estadoSupervisor.motor1 = nuevoEstado;
      await tomarDecision();
    } catch (err) {
      console.error("[SUPERVISOR] Error en ciclo de heartbeat:", err);
    }
  }, CONFIG.intervaloHeartbeat * 1000);

  console.log("[SUPERVISOR] Ciclo de heartbeat iniciado. Revisando cada 5 segundos.");
}

// ============================================================
// 7. DETENER SUPERVISOR
// ============================================================

export async function detenerSupervisor(): Promise<void> {
  console.log("[SUPERVISOR] Deteniendo supervisor...");

  if (intervaloHeartbeat) {
    clearInterval(intervaloHeartbeat);
    intervaloHeartbeat = null;
  }

  await detenerMotorLocal();

  console.log("[SUPERVISOR] Supervisor DETENIDO.");
}

// ============================================================
// 8. OBTENER ESTADO ACTUAL (para dashboard admin)
// ============================================================

export function obtenerEstadoSupervisor(): EstadoSupervisor {
  return { ...estadoSupervisor };
}

// ============================================================
// 9. ALERTAS AL ADMIN
// ============================================================

async function enviarAlertaAdmin(mensaje: string): Promise<void> {
  // TODO: Enviar email o notificacion push al admin
  console.log(`[SUPERVISOR ALERTA] ${mensaje}`);

  const db = getDb();
  await db.insert(notifications).values({
    userId: 1,
    type: "limit_warning",
    title: "Alerta del Supervisor",
    message: mensaje,
  });
}

// ============================================================
// 10. CRON JOB: Desbloqueo diario (tambien lo corre el activo)
// ============================================================

export async function ejecutarDesbloqueoSiActivo(): Promise<void> {
  if (estadoSupervisor.modo === "ACTIVO" || motorCorriendoAqui) {
    console.log("[SUPERVISOR] Somos el servidor activo. Ejecutando desbloqueo diario...");
    await desbloquearCuentasDiarias();
  } else {
    console.log("[SUPERVISOR] No somos activo. Desbloqueo lo hace el Motor 1.");
  }
}
