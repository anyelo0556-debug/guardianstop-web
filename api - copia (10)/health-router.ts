/**
 * HEALTH CHECK — Endpoints para comunicacion entre servidores
 * Servidor 1 (Motor Primario) expone /health
 * Servidor 3 (Supervisor) lo consulta cada 5 segundos
 */

import { createRouter, publicQuery } from "./middleware";
import { obtenerEstadoSupervisor } from "./services/SupervisorMotor";
import { getDb } from "./queries/connection";
import { accounts } from "@db/schema";
import { eq } from "drizzle-orm";

export const healthRouter = createRouter({
  // Motor 1 expone esto — el Supervisor lo consulta
  check: publicQuery.query(async () => {
    const db = getDb();

    // Contar cuentas activas
    const cuentasActivas = await db
      .select()
      .from(accounts)
      .where(eq(accounts.isActive, true));

    // Obtener uso de recursos (simulado — en produccion usar os.loadavg(), process.memoryUsage())
    const cpu = Math.random() * 30; // TODO: reemplazar con lectura real
    const memoria = Math.random() * 40; // TODO: reemplazar con lectura real

    return {
      status: "ok",
      server: "motor-primario",
      timestamp: new Date().toISOString(),
      motorActivo: true,
      cuentasActivas: cuentasActivas.length,
      cpu: parseFloat(cpu.toFixed(1)),
      memoria: parseFloat(memoria.toFixed(1)),
      uptime: process.uptime(),
    };
  }),

  // El Supervisor expone esto — para que el admin vea el estado
  supervisor: publicQuery.query(() => {
    const estado = obtenerEstadoSupervisor();
    return {
      status: "ok",
      server: "supervisor-standby",
      timestamp: new Date().toISOString(),
      ...estado,
    };
  }),

  // Para que el Motor 1 sepa si el Supervisor esta vivo (doble vigilancia)
  ping: publicQuery.query(() => ({
    status: "ok",
    server: "guardian-stop",
    timestamp: new Date().toISOString(),
  })),
});
