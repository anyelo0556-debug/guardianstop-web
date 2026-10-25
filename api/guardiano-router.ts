import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { generarRespuestaGuardiano } from "./services/GuardianoAI";

export const guardianoRouter = createRouter({
  chat: authedQuery
    .input(
      z.object({
        message: z.string().min(1).max(2000),
        context: z
          .object({
            scoreActual: z.number().optional(),
            diasSinCruzar: z.number().optional(),
            cuentaBloqueadaHoy: z.boolean().optional(),
            planType: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const respuesta = await generarRespuestaGuardiano(
        ctx.user.id,
        input.message,
        input.context
      );
      return respuesta;
    }),

  // Endpoint para verificar si el usuario necesita redireccion
  checkStatus: authedQuery.query(async () => {
    // TODO: Implementar logica para verificar estado emocional
    // basado en historial reciente de trades y mensajes
    return {
      nivel: "calmado" as const,
      sugerencia: null,
    };
  }),
});
