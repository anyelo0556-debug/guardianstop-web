/**
 * SIMULADOR DE PRUEBA PILOTO
 * Este modulo permite simular todo el flujo de Guardian Stop
 * sin conectar a brokers reales, sin cobrar dinero, y sin enviar emails reales.
 * Todo se guarda en la base de datos y se muestra en el dashboard.
 */

import { getDb } from "../queries/connection";
import { accounts, subscriptions, trades, notifications, users } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { inicializarCuentaConPlan } from "./RiskEngine";

// ============================================================
// CONFIGURACION DE PRUEBA
// ============================================================

const CONFIG_PRUEBA = {
  modoPrueba: true,
  nombrePrueba: "Prueba Piloto — Angel Davila",
  emailAdmin: "angel@guardianstop.com",
  telefonoAdmin: "+15550000000",
};

// ============================================================
// 1. CREAR USUARIO DE PRUEBA
// ============================================================

export async function crearUsuarioPrueba(
  nombre: string,
  email: string,
  unionId: string
): Promise<number> {
  const db = getDb();

  // Verificar si ya existe
  const [existente] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existente) {
    console.log(`[PRUEBA] Usuario ya existe: ${email}`);
    return existente.id;
  }

  const [nuevo] = await db.insert(users).values({
    unionId,
    name: nombre,
    email,
    avatar: null,
    role: "user",
  });

  const userId = Number(nuevo.insertId);
  console.log(`[PRUEBA] Usuario creado: ${nombre} (ID: ${userId})`);

  return userId;
}

// ============================================================
// 2. CREAR SUSCRIPCION DE PRUEBA (SIN COBRO)
// ============================================================

export async function crearSuscripcionPrueba(
  userId: number,
  planType: "basic" | "trailing",
  periodDays: 30 | 90 | 180 | 365,
  brokerName: string,
  accountNumber: string,
  initialCapital: number
): Promise<{ accountId: number; message: string }> {
  const db = getDb();

  // Crear cuenta y suscripcion usando la funcion del motor
  const cuenta = await inicializarCuentaConPlan(
    userId,
    planType,
    periodDays,
    brokerName,
    accountNumber,
    initialCapital
  );

  // Marcar como prueba (actualizar notas)
  await db
    .update(accounts)
    .set({
      notes: `CUENTA DE PRUEBA PILOTO. No se cobro dinero real. Creada para simulacion.`,
    })
    .where(eq(accounts.id, cuenta.id));

  // Enviar notificacion de bienvenida
  await db.insert(notifications).values({
    userId,
    type: "subscription_expiring",
    title: "Bienvenido a Guardian Stop — Modo Prueba",
    message: `Tu cuenta de prueba ha sido creada exitosamente. Plan: ${planType.toUpperCase()}, Periodo: ${periodDays} dias, Capital: $${initialCapital}. Esta es una simulacion. No se ha cobrado dinero real.`,
  });

  console.log(`[PRUEBA] Cuenta de prueba creada: ${accountNumber}`);
  console.log(`[PRUEBA] Plan: ${planType}, Capital: $${initialCapital}`);

  return {
    accountId: cuenta.id,
    message: `Cuenta de prueba creada exitosamente. ID: ${cuenta.id}`,
  };
}

// ============================================================
// 3. SIMULAR OPERACIONES DEL BROKER
// ============================================================

interface SimTrade {
  symbol: string;
  direction: "buy" | "sell";
  leverage: number;
  lotSize: number;
  entryPrice: number;
  profitLoss: number;
  status: "open" | "closed";
}

export async function simularOperaciones(
  accountId: number,
  userId: number,
  operaciones: SimTrade[]
): Promise<void> {
  const db = getDb();

  for (const op of operaciones) {
    await db.insert(trades).values({
      accountId,
      userId,
      symbol: op.symbol,
      direction: op.direction,
      leverage: String(op.leverage),
      lotSize: String(op.lotSize),
      entryPrice: String(op.entryPrice),
      exitPrice: null,
      profitLoss: String(op.profitLoss),
      profitLossPct: "0.0000",
      resultType: op.status === "open" ? "open" : op.profitLoss > 0 ? "win" : "loss",
      status: op.status,
      openedAt: new Date(),
      closedAt: null,
      brokerTradeId: `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      notes: "Operacion simulada para prueba piloto",
    });
  }

  console.log(`[PRUEBA] ${operaciones.length} operaciones simuladas creadas`);
}

// ============================================================
// 4. SIMULAR EMAIL (guardar en DB en lugar de enviar)
// ============================================================

export async function simularEmail(
  userId: number,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const db = getDb();

  await db.insert(notifications).values({
    userId,
    type: "limit_warning",
    title: `[EMAIL SIMULADO] ${subject}`,
    message: `Para: ${to}\n\n${body}\n\n---\nEste es un email simulado para la prueba piloto. En produccion se enviaria via SendGrid/AWS SES.`,
  });

  console.log(`[PRUEBA] Email simulado guardado: ${subject}`);
}

// ============================================================
// 5. SIMULAR WHATSAPP (guardar en DB en lugar de enviar)
// ============================================================

export async function simularWhatsApp(
  userId: number,
  to: string,
  message: string
): Promise<void> {
  const db = getDb();

  await db.insert(notifications).values({
    userId,
    type: "limit_warning",
    title: `[WHATSAPP SIMULADO]`,
    message: `Para: ${to}\n\n${message}\n\n---\nEste es un mensaje de WhatsApp simulado. En produccion se enviaria via Twilio.`,
  });

  console.log(`[PRUEBA] WhatsApp simulado guardado`);
}

// ============================================================
// 6. SIMULAR MOTOR DE RIESGO (ejecutar ciclo manual)
// ============================================================

export async function simularCicloMotor(accountId: number): Promise<{
  proteccionActivada: boolean;
  motivo?: string;
  monto?: number;
}> {
  const { ejecutarCicloMotor } = await import("./RiskEngine");
  await ejecutarCicloMotor(accountId);

  // Verificar si se activo proteccion revisando logs
  const db = getDb();
  const [ultimoLog] = await db
    .select()
    .from(trades)
    .where(eq(trades.accountId, accountId))
    .orderBy(desc(trades.createdAt))
    .limit(1);

  if (ultimoLog && ultimoLog.protectionTrigger !== "none") {
    return {
      proteccionActivada: true,
      motivo: ultimoLog.protectionTrigger,
      monto: parseFloat(ultimoLog.profitLoss),
    };
  }

  return { proteccionActivada: false };
}

// ============================================================
// 7. GENERAR DATOS DE PRUEBA COMPLETOS
// ============================================================

export async function generarDatosPruebaCompletos(): Promise<{
  userId: number;
  accountId: number;
  mensaje: string;
}> {
  console.log("[PRUEBA] ==============================================");
  console.log("[PRUEBA] GENERANDO DATOS DE PRUEBA COMPLETOS");
  console.log("[PRUEBA] ==============================================");

  // 1. Crear usuario
  const userId = await crearUsuarioPrueba(
    "Angel Davila",
    "angel@guardianstop.com",
    "union_test_angel_001"
  );

  // 2. Crear suscripcion y cuenta
  const { accountId } = await crearSuscripcionPrueba(
    userId,
    "trailing",      // Plan Trailing para probar todo
    30,              // 30 dias
    "OANDA",         // Broker
    "TEST_12345678", // Numero de cuenta demo
    5000             // Capital inicial
  );

  // 3. Simular algunas operaciones
  await simularOperaciones(accountId, userId, [
    {
      symbol: "EUR/USD",
      direction: "buy",
      leverage: 100,
      lotSize: 0.1,
      entryPrice: 1.08500,
      profitLoss: 25,
      status: "open",
    },
    {
      symbol: "GBP/USD",
      direction: "sell",
      leverage: 50,
      lotSize: 0.05,
      entryPrice: 1.26500,
      profitLoss: -10,
      status: "open",
    },
  ]);

  // 4. Simular email de bienvenida
  await simularEmail(
    userId,
    "angel@guardianstop.com",
    "Bienvenido a Guardian Stop",
    `Hola Angel,\n\nTu cuenta de prueba ha sido activada.\n\nPlan: Guardian Trailing\nPeriodo: 30 dias\nCapital: $5,000\nBroker: OANDA\n\nEl motor de riesgo esta vigilandote cada 5 segundos.\n\nGuardian Stop — Disciplina sobre todo.`
  );

  // 5. Simular WhatsApp de bienvenida
  await simularWhatsApp(
    userId,
    "+15550000000",
    `Guardian Stop: Tu cuenta de prueba esta activa. Plan Trailing, 30 dias. Capital: $5,000. Operas protegido.`
  );

  console.log("[PRUEBA] ==============================================");
  console.log("[PRUEBA] DATOS DE PRUEBA GENERADOS EXITOSAMENTE");
  console.log(`[PRUEBA] Usuario ID: ${userId}`);
  console.log(`[PRUEBA] Cuenta ID: ${accountId}`);
  console.log("[PRUEBA] ==============================================");

  return {
    userId,
    accountId,
    mensaje: "Datos de prueba generados. Puedes iniciar sesion y ver todo en el dashboard.",
  };
}

// ============================================================
// 8. LIMPIAR DATOS DE PRUEBA
// ============================================================

export async function limpiarDatosPrueba(userId: number): Promise<void> {
  const db = getDb();

  await db.delete(trades).where(eq(trades.userId, userId));
  await db.delete(notifications).where(eq(notifications.userId, userId));

  const [cuenta] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);

  if (cuenta) {
    await db.delete(trades).where(eq(trades.accountId, cuenta.id));
    await db.delete(accounts).where(eq(accounts.id, cuenta.id));
  }

  await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
  await db.delete(users).where(eq(users.id, userId));

  console.log(`[PRUEBA] Datos de prueba limpiados para usuario ${userId}`);
}

// ============================================================
// 9. EXPORTAR PARA USO
// ============================================================

export { CONFIG_PRUEBA };
