/**
 * MOTOR DE RIESGO — Guardian Stop
 * Este es el corazon del sistema. Corre cada 5 segundos y decide
 * si proteger la cuenta del trader o no.
 */

import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../queries/connection";
import {
  accounts,
  subscriptions,
  protectionLogs,
  notifications,
  type Account,
  type Subscription,
} from "@db/schema";

// ============================================================
// TIPOS
// ============================================================

interface BrokerData {
  balance: number;
  equity: number;
  profitDiario: number;   // P&L de hoy
  profitSemanal: number;  // P&L de esta semana
  profitMensual: number;  // P&L de este mes
  posicionesAbiertas: number;
  timestamp: Date;
}

interface ConfigCliente {
  userId: number;
  accountId: number;
  tipoPlan: "basic" | "trailing";
  capitalInicial: number;
  limiteDiarioPct: number;
  limiteSemanalPct: number;
  limiteMensualPct: number;
  trailingActivo: boolean;
  trailingActivacionPct: number;
  trailingProteccionPct: number;
}

interface ResultadoProteccion {
  debeCerrar: boolean;
  motivo?: string;
  mensaje?: string;
  monto?: number;
}

// Cache en memoria para max profit del dia (evita hits a DB)
const maxProfitCache: Map<number, { maxProfit: number; fecha: string }> = new Map();

// ============================================================
// 1. CARGAR CONFIGURACION DEL CLIENTE
// ============================================================

export async function cargarConfiguracionCliente(
  accountId: number
): Promise<ConfigCliente | null> {
  const db = getDb();

  // 1.1 Leer cuenta
  const [cuenta] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!cuenta || !cuenta.isActive) return null;

  // 1.2 Leer suscripcion activa
  const [suscripcion] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, cuenta.userId),
        eq(subscriptions.status, "active")
      )
    )
    .orderBy(desc(subscriptions.startedAt))
    .limit(1);

  if (!suscripcion) return null;

  // 1.3 Parsear valores (vienen como string de la DB)
  const parsePct = (val: string | null | undefined) => {
    const n = parseFloat(val || "0");
    return isNaN(n) ? 0 : n;
  };

  const parseMoney = (val: string | null | undefined) => {
    const n = parseFloat(val || "0");
    return isNaN(n) ? 0 : n;
  };

  return {
    userId: cuenta.userId,
    accountId: cuenta.id,
    tipoPlan: suscripcion.planType,
    capitalInicial: parseMoney(cuenta.initialCapital),
    limiteDiarioPct: parsePct(cuenta.dailyLimitPct),
    limiteSemanalPct: parsePct(cuenta.weeklyLimitPct),
    limiteMensualPct: parsePct(cuenta.monthlyLimitPct),
    trailingActivo: cuenta.trailingEnabled,
    trailingActivacionPct: parsePct(cuenta.trailingActivationPct),
    trailingProteccionPct: parsePct(cuenta.trailingProtectionPct),
  };
}

// ============================================================
// 2. OBTENER DATOS DEL BROKER (STUB — reemplazar con API real)
// ============================================================

export async function obtenerDatosBroker(accountId: number): Promise<BrokerData> {
  // TODO: Integrar con API real del broker
  // Por ahora devuelve datos de ejemplo para testing
  // En produccion, esto llamara a:
  // - OANDA v20 API
  // - Interactive Brokers Client Portal
  // - MT5 via ZeroMQ
  // - cTrader Open API
  // - NinjaTrader via AddOn

  const db = getDb();
  const [cuenta] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  const currentBalance = parseFloat(cuenta?.currentBalance || "0");
  const initialBalance = parseFloat(cuenta?.initialCapital || "0");

  // Simular P&L basado en la diferencia balance vs capital inicial
  // En produccion, esto viene de la API del broker
  const profitTotal = currentBalance - initialBalance;

  return {
    balance: currentBalance,
    equity: currentBalance,
    profitDiario: profitTotal * 0.3,   // Simulado: 30% del profit total es de hoy
    profitSemanal: profitTotal * 0.6,  // Simulado: 60% es de esta semana
    profitMensual: profitTotal,        // 100% es del mes
    posicionesAbiertas: 0,             // TODO: leer de broker
    timestamp: new Date(),
  };
}

// ============================================================
// 3. CALCULAR LIMITES EN DOLARES
// ============================================================

function calcularLimites(config: ConfigCliente) {
  return {
    maxPerdidaDiaria: config.capitalInicial * (config.limiteDiarioPct / 100),
    maxPerdidaSemanal: config.capitalInicial * (config.limiteSemanalPct / 100),
    maxPerdidaMensual: config.capitalInicial * (config.limiteMensualPct / 100),
  };
}

// ============================================================
// 4. REVISAR LIMITES FIJOS (BASIC + TRAILING)
// ============================================================

function revisarLimitesFijos(
  datos: BrokerData,
  limites: ReturnType<typeof calcularLimites>,
  config: ConfigCliente
): ResultadoProteccion {
  // 4.1 Limite DIARIO
  if (datos.profitDiario <= -limites.maxPerdidaDiaria) {
    return {
      debeCerrar: true,
      motivo: "DAILY_LIMIT_BREACH",
      mensaje: `Limite diario cruzado: perdiste $${Math.abs(datos.profitDiario).toFixed(2)} de $${limites.maxPerdidaDiaria.toFixed(2)} permitidos (${config.limiteDiarioPct}%)`,
      monto: Math.abs(datos.profitDiario),
    };
  }

  // 4.2 Limite SEMANAL
  if (datos.profitSemanal <= -limites.maxPerdidaSemanal) {
    return {
      debeCerrar: true,
      motivo: "WEEKLY_LIMIT_BREACH",
      mensaje: `Limite semanal cruzado: perdiste $${Math.abs(datos.profitSemanal).toFixed(2)} de $${limites.maxPerdidaSemanal.toFixed(2)} permitidos (${config.limiteSemanalPct}%)`,
      monto: Math.abs(datos.profitSemanal),
    };
  }

  // 4.3 Limite MENSUAL
  if (datos.profitMensual <= -limites.maxPerdidaMensual) {
    return {
      debeCerrar: true,
      motivo: "MONTHLY_LIMIT_BREACH",
      mensaje: `Limite mensual cruzado: perdiste $${Math.abs(datos.profitMensual).toFixed(2)} de $${limites.maxPerdidaMensual.toFixed(2)} permitidos (${config.limiteMensualPct}%)`,
      monto: Math.abs(datos.profitMensual),
    };
  }

  return { debeCerrar: false };
}

// ============================================================
// 5. REVISAR TRAILING STOP (SOLO PLAN TRAILING)
// ============================================================

function revisarTrailing(
  datos: BrokerData,
  config: ConfigCliente
): ResultadoProteccion {
  const profitHoy = datos.profitDiario;

  // 5.1 Si no estoy ganando, trailing no aplica
  if (profitHoy <= 0) {
    return { debeCerrar: false };
  }

  // 5.2 Calcular profit como porcentaje del capital inicial
  const profitPct = (profitHoy / config.capitalInicial) * 100;

  // 5.3 Verificar si ya se activo (profit >= 1% por defecto)
  if (profitPct < config.trailingActivacionPct) {
    return { debeCerrar: false };
  }

  // 5.4 Trailing ACTIVO. Obtener max profit del dia
  const hoy = new Date().toISOString().split("T")[0]; // "2026-10-25"
  const cacheKey = config.accountId;
  const cacheEntry = maxProfitCache.get(cacheKey);

  let maxProfitHoy: number;

  if (cacheEntry && cacheEntry.fecha === hoy) {
    maxProfitHoy = cacheEntry.maxProfit;
  } else {
    // Primer ciclo del dia, inicializar con profit actual
    maxProfitHoy = profitHoy;
    maxProfitCache.set(cacheKey, { maxProfit: profitHoy, fecha: hoy });
  }

  // 5.5 Si el profit actual es mayor que el maximo, actualizar
  if (profitHoy > maxProfitHoy) {
    maxProfitHoy = profitHoy;
    maxProfitCache.set(cacheKey, { maxProfit: profitHoy, fecha: hoy });
  }

  // 5.6 Calcular umbral desde el maximo profit
  const montoProtegido = maxProfitHoy * (config.trailingProteccionPct / 100);
  const umbralDesdeMax = maxProfitHoy - montoProtegido;

  // 5.7 Verificar si el profit actual cayo por debajo del umbral
  if (profitHoy <= umbralDesdeMax) {
    return {
      debeCerrar: true,
      motivo: "TRAILING_STOP_HIT",
      mensaje: `Trailing activado: protegiste $${montoProtegido.toFixed(2)} de tu maximo profit de $${maxProfitHoy.toFixed(2)}. Se cierra todo para proteger ganancias.`,
      monto: montoProtegido,
    };
  }

  return { debeCerrar: false };
}

// ============================================================
// 6. EJECUTAR CIERRE DE CUENTA
// ============================================================

async function ejecutarCierre(
  config: ConfigCliente,
  resultado: ResultadoProteccion
): Promise<void> {
  const db = getDb();

  console.log(`[MOTOR RIESGO] CIERRE EJECUTADO para cuenta ${config.accountId}`);
  console.log(`  Motivo: ${resultado.motivo}`);
  console.log(`  Mensaje: ${resultado.mensaje}`);

  // 6.1 TODO: Cerrar posiciones via API del broker
  // await brokerAPI.closeAllPositions(config.accountId);

  // 6.2 Bloquear cuenta
  await db
    .update(accounts)
    .set({ isActive: false })
    .where(eq(accounts.id, config.accountId));

  // 6.3 Registrar log de proteccion
  await db.insert(protectionLogs).values({
    accountId: config.accountId,
    userId: config.userId,
    triggerType: resultado.motivo as any,
    profitLossAtTrigger: String(resultado.monto || 0),
    notes: resultado.mensaje || "Cierre automatico ejecutado",
  });

  // 6.4 Enviar notificacion
  const titulo =
    resultado.motivo === "TRAILING_STOP_HIT"
      ? "Trailing activado: ganancias protegidas"
      : "Limite cruzado: cuenta protegida";

  const tipoNotificacion =
    resultado.motivo === "TRAILING_STOP_HIT"
      ? "trailing_executed"
      : "limit_breach";

  await db.insert(notifications).values({
    userId: config.userId,
    type: tipoNotificacion as any,
    title: titulo,
    message:
      resultado.mensaje ||
      `Tu cuenta ha sido protegida. Motivo: ${resultado.motivo}. Podras operar nuevamente manana.`,
  });

  // 6.5 Si es trailing, enviar mensaje positivo
  if (resultado.motivo === "TRAILING_STOP_HIT") {
    await enviarMensajePositivo(config.userId, resultado.monto || 0);
  }
}

// ============================================================
// 7. MENSAJE POSITIVO (TRAILING EXITOSO)
// ============================================================

async function enviarMensajePositivo(userId: number, montoProtegido: number): Promise<void> {
  const db = getDb();

  const frasesMotivacionales = [
    "El mercado premia a quien sabe cuando parar. Hoy protegiste tus ganancias como un profesional.",
    "No es cuanto ganes, es cuanto conserves. Hoy ganaste la batalla mas importante: la contra ti mismo.",
    "Paul Tudor Jones dijo: 'Los mejores traders no son los que ganan mas, son los que pierden menos.' Hoy demostraste eso.",
    "Cada dia que proteges tus ganancias, construyes tu curriculum de disciplina. Excelente trabajo.",
    "La codicia hubiera dicho 'una mas'. La disciplina dijo 'basta'. Elegiste bien.",
  ];

  const fraseAleatoria =
    frasesMotivacionales[Math.floor(Math.random() * frasesMotivacionales.length)];

  await db.insert(notifications).values({
    userId,
    type: "trailing_executed",
    title: "Ganancias protegidas exitosamente",
    message: `${fraseAleatoria} Monto protegido: $${montoProtegido.toFixed(2)}.`,
  });
}

// ============================================================
// 8. ACTUALIZAR BALANCE
// ============================================================

async function actualizarBalance(accountId: number, nuevoBalance: number): Promise<void> {
  const db = getDb();
  await db
    .update(accounts)
    .set({ currentBalance: String(nuevoBalance) })
    .where(eq(accounts.id, accountId));
}

// ============================================================
// 9. CICLO PRINCIPAL DEL MOTOR
// ============================================================

export async function ejecutarCicloMotor(accountId: number): Promise<void> {
  try {
    // 9.1 Cargar configuracion
    const config = await cargarConfiguracionCliente(accountId);
    if (!config) {
      console.log(`[MOTOR RIESGO] Cuenta ${accountId} no activa o sin suscripcion`);
      return;
    }

    // 9.2 Obtener datos del broker
    const datosBroker = await obtenerDatosBroker(accountId);

    // 9.3 Calcular limites
    const limites = calcularLimites(config);

    // 9.4 Revisar limites fijos (siempre)
    const alertaFija = revisarLimitesFijos(datosBroker, limites, config);
    if (alertaFija.debeCerrar) {
      await ejecutarCierre(config, alertaFija);
      return;
    }

    // 9.5 Revisar trailing (solo plan trailing)
    if (config.tipoPlan === "trailing" && config.trailingActivo) {
      const alertaTrailing = revisarTrailing(datosBroker, config);
      if (alertaTrailing.debeCerrar) {
        await ejecutarCierre(config, alertaTrailing);
        return;
      }
    }

    // 9.6 Todo bien, actualizar balance
    await actualizarBalance(accountId, datosBroker.balance);

    console.log(`[MOTOR RIESGO] Cuenta ${accountId} OK. Balance: $${datosBroker.balance.toFixed(2)}`);
  } catch (error) {
    console.error(`[MOTOR RIESGO] ERROR en cuenta ${accountId}:`, error);
  }
}

// ============================================================
// 10. CORRER MOTOR PARA TODAS LAS CUENTAS ACTIVAS
// ============================================================

export async function ejecutarMotorGlobal(): Promise<void> {
  const db = getDb();

  // Obtener todas las cuentas activas con suscripcion activa
  const cuentasActivas = await db
    .select()
    .from(accounts)
    .where(eq(accounts.isActive, true));

  console.log(`[MOTOR RIESGO] Corriendo motor para ${cuentasActivas.length} cuentas activas`);

  for (const cuenta of cuentasActivas) {
    await ejecutarCicloMotor(cuenta.id);
  }
}

// ============================================================
// 11. DESBLOQUEO AUTOMATICO (CRON JOB)
// ============================================================

export async function desbloquearCuentasDiarias(): Promise<void> {
  const db = getDb();

  const cuentasBloqueadas = await db
    .select()
    .from(accounts)
    .where(eq(accounts.isActive, false));

  console.log(`[MOTOR RIESGO] Desbloqueando ${cuentasBloqueadas.length} cuentas`);

  for (const cuenta of cuentasBloqueadas) {
    // Verificar que la suscripcion siga activa
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, cuenta.userId),
          eq(subscriptions.status, "active")
        )
      )
      .orderBy(desc(subscriptions.startedAt))
      .limit(1);

    if (sub) {
      // Desbloquear cuenta
      await db
        .update(accounts)
        .set({ isActive: true })
        .where(eq(accounts.id, cuenta.id));

      // Limpiar cache de max profit
      maxProfitCache.delete(cuenta.id);

      // Notificar al usuario
      await db.insert(notifications).values({
        userId: cuenta.userId,
        type: "auto_unlock",
        title: "Cuenta desbloqueada",
        message:
          "Tu cuenta ha sido desbloqueada. Operas hoy con tu plan intacto. Recuerda: disciplina sobre todo.",
      });

      console.log(`[MOTOR RIESGO] Cuenta ${cuenta.id} desbloqueada`);
    }
  }
}

// ============================================================
// 12. CONFIGURACION DE PLANES (CONSTANTES)
// ============================================================

export const PLAN_CONFIG = {
  basic: {
    nombre: "Guardian Basic",
    precioMensual: 19.99,
    precio90d: 54.99,
    precio180d: 99.99,
    precio365d: 179.99,
    incluyeTrailing: false,
    limiteDiarioDefault: 1.0,
    limiteSemanalDefault: 10.0,
    limiteMensualDefault: 30.0,
  },
  trailing: {
    nombre: "Guardian Trailing",
    precioMensual: 22.99,
    precio90d: 62.99,
    precio180d: 114.99,
    precio365d: 199.99,
    incluyeTrailing: true,
    limiteDiarioDefault: 1.0,
    limiteSemanalDefault: 10.0,
    limiteMensualDefault: 30.0,
    trailingActivacionDefault: 1.0,
    trailingProteccionDefault: 30.0,
  },
} as const;

// ============================================================
// 13. INICIALIZAR CUENTA CON PLAN
// ============================================================

export async function inicializarCuentaConPlan(
  userId: number,
  planType: "basic" | "trailing",
  periodDays: 30 | 90 | 180 | 365,
  brokerName: string,
  accountNumber: string,
  initialCapital: number
): Promise<Account> {
  const db = getDb();
  const config = PLAN_CONFIG[planType];

  // Crear suscripcion
  const startedAt = new Date();
  const expiresAt = new Date(startedAt);
  expiresAt.setDate(expiresAt.getDate() + periodDays);

  let pricePaid: number;
  switch (periodDays) {
    case 30:
      pricePaid = config.precioMensual;
      break;
    case 90:
      pricePaid = config.precio90d;
      break;
    case 180:
      pricePaid = config.precio180d;
      break;
    case 365:
      pricePaid = config.precio365d;
      break;
    default:
      pricePaid = config.precioMensual;
  }

  await db.insert(subscriptions).values({
    userId,
    planType,
    periodDays,
    pricePaid: String(pricePaid),
    status: "active",
    startedAt,
    expiresAt,
  });

  // Crear cuenta de trading
  await db.insert(accounts).values({
    userId,
    brokerName,
    accountNumber,
    accountType: "live",
    initialCapital: String(initialCapital),
    currentBalance: String(initialCapital),
    dailyLimitPct: String(config.limiteDiarioDefault),
    weeklyLimitPct: String(config.limiteSemanalDefault),
    monthlyLimitPct: String(config.limiteMensualDefault),
    trailingEnabled: config.incluyeTrailing,
    trailingActivationPct: config.incluyeTrailing
      ? String(config.trailingActivacionDefault)
      : "1.00",
    trailingProtectionPct: config.incluyeTrailing
      ? String(config.trailingProteccionDefault)
      : "30.00",
    isActive: true,
  });

  // Devolver la cuenta creada
  const [cuenta] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(desc(accounts.createdAt))
    .limit(1);

  return cuenta;
}
