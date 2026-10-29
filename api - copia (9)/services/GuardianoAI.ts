/**
 * GUARDIANO AI — Asistente de Inteligencia Artificial para Guardian Stop
 * Knowledge base completo de trading, psicologia y gestion de riesgo.
 * Detecta cuando el trader se le escapan las manos y redirige a soporte.
 */

import { getDb } from "../queries/connection";
import { notifications } from "@db/schema";

// ============================================================
// KNOWLEDGE BASE — Conocimiento de Guardiano
// ============================================================

const KNOWLEDGE_BASE = {
  // Psicologia del Trading
  psicologia: [
    "El FOMO (Fear Of Missing Out) es la razon #1 por la que los traders entran tarde en un movimiento y compran en el pico.",
    "La venganza del mercado ocurre cuando un trader pierde y abre inmediatamente otra posicion para 'recuperar'. Es el camino directo a quemar la cuenta.",
    "El overtrading es una forma de adiccion. Operar da dopamina, y perder la intensifica. Romper el ciclo requiere estructura externa.",
    "El miedo a perder (fear) hace que los traders cierren ganancias prematuramente. La codicia (greed) hace que mantengan perdidas demasiado tiempo.",
    "La disciplina no es natural. Es un musculo que se ejercita con repeticiones consistentes. Guardian Stop es tu gimnasio.",
    "El trading no es un juego de inteligencia, es un juego de consistencia emocional. Los IQ altos queman cuentas tan rapido como los bajos.",
    "La autoconciencia es la habilidad mas subestimada en trading. Saber que NO estas en condiciones de operar es mas valioso que cualquier señal.",
  ],

  // Gestion de Riesgo
  gestionRiesgo: [
    "La regla del 1%: Nunca arriesgar mas del 1% del capital en un solo trade. Con $5,000, eso es $50 por posicion.",
    "El ratio riesgo/beneficio minimo debe ser 1:2. Por cada $1 que arriesgas, busca ganar $2.",
    "Un drawdown del 10% requiere un 11.1% de ganancia para recuperar. Un drawdown del 50% requiere un 100% de ganancia. Proteger es mas facil que recuperar.",
    "El apalancamiento es como un cuchillo afilado: util en manos expertas, mortal en manos nerviosas.",
    "La correlacion entre pares: no abrir posiciones en EUR/USD y GBP/USD simultaneamente. Son 80% correlacionados, eso es duplicar el riesgo.",
    "El stop loss no es opcional. Es el precio que pagas por estar equivocado. Y estar equivocado es parte del negocio.",
  ],

  // Trailing Stop
  trailing: [
    "El trailing de Guardian Stop se activa al 1% de ganancia y protege el 30% de lo acumulado.",
    "Si ganas 2%, el trailing protege $0.60 de cada $2.00. Si subes a 5%, protege $1.50 de cada $5.00.",
    "El trailing no te saca 'antes de tiempo'. Te saca cuando tus emociones aun no te han dejado dar la vuelta.",
    "El proposito del trailing no es maximizar ganancias. Es evitar que las ganancias se conviertan en perdidas.",
    "La mejor sensacion en trading no es ganar $500. Es ganar $300 sabiendo que podrias haber perdido $200.",
  ],

  // Guardian Stop Especifico
  guardianStop: [
    "Guardian Stop no es un bróker. No gestiona tu dinero. Es una capa de proteccion que vigila tu cuenta.",
    "Todas las cuentas Guardian Stop son Cuenta Bóveda: tu capital queda comprometido durante el periodo contratado. No hay retiros anticipados.",
    "El Score de Disciplina se genera cada mes que cumples sin cruzar limites. Es tu curriculum auditable para inversores.",
    "Los planes son: Basic $19.99/mes (proteccion fija) y Trailing $22.99/mes (proteccion fija + trailing de ganancias).",
    "Los periodos disponibles: 30, 90, 180 y 365 dias. Descuentos por compromiso: 8% en 90d, 17% en 180d, 25-28% en 365d.",
    "Si cruzas tu limite, tu cuenta se bloquea hasta las 00:00 del dia siguiente. Sin negociacion.",
  ],

  // Frases de Traders Legendarios
  citas: [
    "Paul Tudor Jones: 'Los mejores traders no son los que ganan mas, son los que pierden menos.'",
    "Jesse Livermore: 'El mercado nunca cambia. Cambian los jugadores.'",
    "Warren Buffett: 'La regla #1 es no perder dinero. La regla #2 es nunca olvidar la regla #1.'",
    "Ray Dalio: 'El dolor + la reflexion = el progreso.'",
    "Mark Douglas: 'El trading es 80% psicologia, 15% gestion de riesgo, 5% estrategia.'",
    "Ed Seykota: 'Todos obtienen lo que quieren del mercado.'",
    "Bruce Kovner: 'Bajo presion, la mente se estrecha. Necesitas un sistema que actue por ti.'",
  ],

  // Consejos para malos dias
  malosDias: [
    "Perder es parte del negocio. Incluso los mejores traders ganan solo 40-50% de sus trades.",
    "Un dia malo no define tu carrera. Un mes malo tampoco. Lo que define es como respondes.",
    "Si hoy cruzaste tu limite, no eres un fracasado. Eres un trader que aun esta aprendiendo a respetar sus reglas.",
    "El mercado estara aqui manana. Tu capital no, si no lo proteges. Descansa y vuelve con cabeza fria.",
    "La disciplina no es sexy. No da likes en Instagram. Pero es lo unico que te mantiene vivo en este negocio.",
    "Cada vez que Guardian Stop te bloquea, te esta diciendo: 'No hoy. No asi. Manana es otro dia.' Escuchalo.",
  ],

  // Sobre-operacion y Apalancamiento
  sobreOperacion: [
    "El overtrading es cuando operas por emocion, no por oportunidad. Sintomas: mas de 5 trades por dia, trades fuera de tu plan, revenge trading.",
    "El apalancamiento 1:100 significa que con $1,000 controlas $100,000. Un movimiento del 1% en tu contra = $1,000 perdidos. Tu cuenta completa.",
    "Guardian Stop detecta patrones de sobre-operacion cuando cruzas tu limite diario. Eso no es un castigo, es un parachoques.",
    "Si sientes que 'necesitas' operar, NO operes. Necesitar operar es como necesitar apostar. Es la adiccion hablando.",
  ],
};

// ============================================================
// PALABRAS CLAVE DE ALERTA (cuando el trader se le escapan)
// ============================================================

const PALABRAS_ALERTA = {
  // Indican que el trader esta perdiendo control
  perdiendoControl: [
    "recuperar", "recupero", "recuperar dinero", "devolvi", "devolver",
    "aplastado", "destruido", "queme", "quemada", "quemar",
    "no puedo parar", "no puedo dejar de", "adiccion", "obsesionado",
    "todo o nada", "doble o nada", "all in", "todo en",
    "me enfureci", "enojado", "venganza", "vengarme",
  ],

  // Indican que necesita ayuda humana
  necesitaSoporte: [
    "quiero cancelar", "devolucion", "reembolso", "no funciona",
    "estafa", "fraude", "me enganaron",
    "suicidio", "morir", "no quiero vivir", "desesperado",
    "deuda", "debo dinero", "prestamo", "hipoteca",
    "ayuda", "necesito ayuda", "no se que hacer",
  ],

  // Indican que quiere romper las reglas
  quiereRomper: [
    "desactivar", "apagar", "quitar limites", "sin limites",
    "solo esta vez", "una mas", "una sola", "excepcion",
    "no aplica", "no me importa", "me la suda", "me vale",
    "soy diferente", "yo puedo controlar", "no necesito",
  ],
};

// ============================================================
// RESPUESTAS DE GUARDIANO
// ============================================================

function obtenerCitaAleatoria(): string {
  const citas = KNOWLEDGE_BASE.citas;
  return citas[Math.floor(Math.random() * citas.length)];
}

function obtenerConsejoMalDia(): string {
  const consejos = KNOWLEDGE_BASE.malosDias;
  return consejos[Math.floor(Math.random() * consejos.length)];
}

function obtenerFrasePsicologia(): string {
  const frases = KNOWLEDGE_BASE.psicologia;
  return frases[Math.floor(Math.random() * frases.length)];
}

// ============================================================
// DETECTAR ESTADO EMOCIONAL DEL TRADER
// ============================================================

function detectarEstadoEmocional(mensaje: string): {
  nivel: "calmado" | "preocupante" | "critico";
  tipo: string;
  debeRedirigir: boolean;
} {
  const lower = mensaje.toLowerCase();

  // CRITICO: Palabras que indican riesgo grave
  for (const palabra of PALABRAS_ALERTA.necesitaSoporte) {
    if (lower.includes(palabra)) {
      return {
        nivel: "critico",
        tipo: "SOPORTE_HUMANO_REQUERIDO",
        debeRedirigir: true,
      };
    }
  }

  // CRITICO: Quiere romper las reglas del sistema
  for (const palabra of PALABRAS_ALERTA.quiereRomper) {
    if (lower.includes(palabra)) {
      return {
        nivel: "critico",
        tipo: "INTENTO_ROMPER_PROTECCION",
        debeRedirigir: true,
      };
    }
  }

  // PREOCUPANTE: Perdiendo control
  let contadorPreocupante = 0;
  for (const palabra of PALABRAS_ALERTA.perdiendoControl) {
    if (lower.includes(palabra)) contadorPreocupante++;
  }

  if (contadorPreocupante >= 2) {
    return {
      nivel: "preocupante",
      tipo: "PERDIENDO_CONTROL",
      debeRedirigir: true,
    };
  }

  return {
    nivel: "calmado",
    tipo: "NORMAL",
    debeRedirigir: false,
  };
}

// ============================================================
// GENERAR RESPUESTA DE GUARDIANO
// ============================================================

export async function generarRespuestaGuardiano(
  userId: number,
  mensajeUsuario: string,
  contexto?: {
    scoreActual?: number;
    diasSinCruzar?: number;
    cuentaBloqueadaHoy?: boolean;
    planType?: string;
  }
): Promise<{
  respuesta: string;
  nivel: string;
  debeRedirigir: boolean;
  redireccion?: {
    tipo: "email" | "whatsapp" | "dashboard";
    mensaje: string;
    url?: string;
  };
}> {
  const estado = detectarEstadoEmocional(mensajeUsuario);

  // === CRITICO: Redirigir inmediatamente a soporte humano ===
  if (estado.nivel === "critico") {
    const respuestaCritica = generarRespuestaCritica(estado.tipo);

    // Guardar notificacion para el equipo
    await guardarAlertaCritica(userId, estado.tipo, mensajeUsuario);

    return {
      respuesta: respuestaCritica,
      nivel: estado.nivel,
      debeRedirigir: true,
      redireccion: {
        tipo: "whatsapp",
        mensaje: "Contacta a nuestro equipo de soporte. Estan entrenados para ayudarte en momentos dificiles.",
        url: "https://wa.me/15550000000",
      },
    };
  }

  // === PREOCUPANTE: Dar consejo firme + ofrecer soporte ===
  if (estado.nivel === "preocupante") {
    const respuestaPreocupante = generarRespuestaPreocupante(contexto);

    return {
      respuesta: respuestaPreocupante,
      nivel: estado.nivel,
      debeRedirigir: true,
      redireccion: {
        tipo: "email",
        mensaje: "Si necesitas hablar con alguien, escribenos. No estas solo en esto.",
        url: "mailto:support@guardianstop.com",
      },
    };
  }

  // === CALMADO: Respuesta educativa normal ===
  const respuestaNormal = generarRespuestaNormal(mensajeUsuario, contexto);

  return {
    respuesta: respuestaNormal,
    nivel: estado.nivel,
    debeRedirigir: false,
  };
}

// ============================================================
// GENERADORES DE RESPUESTAS
// ============================================================

function generarRespuestaCritica(tipo: string): string {
  if (tipo === "SOPORTE_HUMANO_REQUERIDO") {
    return `Entiendo que estas pasando por un momento muy dificil. No estas solo.

${obtenerConsejoMalDia()}

**Te voy a redirigir a nuestro equipo de soporte ahora mismo.** Ellos estan entrenados para ayudarte. No tienes que resolver esto solo.

**WhatsApp de soporte:** +1 (555) 000-0000
**Email:** support@guardianstop.com

Respiran. El mercado estara aqui manana. Tu bienestar es mas importante que cualquier trade.`;
  }

  if (tipo === "INTENTO_ROMPER_PROTECCION") {
    return `Escucho que quieres desactivar tus limites. Ese impulso es EXACTAMENTE por lo que existe Guardian Stop.

${obtenerFrasePsicologia()}

Los limites que configuraste fueron puestos por TI cuando estabas racional. El impulso de quitarlos viene de la emocion del momento.

**No puedo desactivar tus protecciones.** Estan ahi para protegerte de ti mismo en momentos como este.

Si realmente crees que tus limites estan mal configurados, contacta a soporte y un humano revisara tu caso:
**support@guardianstop.com**

Pero no hoy. No cuando estas asi. Manana, con la cabeza fria, podemos hablar.`;
  }

  return obtenerConsejoMalDia();
}

function generarRespuestaPreocupante(
  contexto?: {
    scoreActual?: number;
    diasSinCruzar?: number;
    cuentaBloqueadaHoy?: boolean;
    planType?: string;
  }
): string {
  let respuesta = `${obtenerConsejoMalDia()}\n\n`;

  if (contexto?.cuentaBloqueadaHoy) {
    respuesta += `Veo que tu cuenta fue bloqueada hoy. Eso no es un fracaso. Es el sistema protegiendote de un dia emocionalmente dificil.\n\n`;
  }

  if (contexto?.diasSinCruzar && contexto.diasSinCruzar > 0) {
    respuesta += `Llevabas ${contexto.diasSinCruzar} dias sin cruzar limites. Eso es disciplina real. Un mal dia no borra eso.\n\n`;
  }

  respuesta += `${obtenerCitaAleatoria()}\n\n`;
  respuesta += `Si sientes que necesitas hablar con alguien, nuestro equipo de soporte esta disponible:
**WhatsApp:** +1 (555) 000-0000
**Email:** support@guardianstop.com`;

  return respuesta;
}

function generarRespuestaNormal(
  mensaje: string,
  contexto?: {
    scoreActual?: number;
    diasSinCruzar?: number;
    planType?: string;
  }
): string {
  const lower = mensaje.toLowerCase();

  // Preguntas sobre trailing
  if (lower.includes("trailing") || lower.includes("proteger ganancias")) {
    return `El trailing de Guardian Stop funciona asi:

1. Apenas ganes tu primer **1%**, se activa automaticamente.
2. Desde ese momento, **siempre protege el 30%** de tu profit acumulado.
3. Si ganas 2%, protege $0.60 de cada $2.00.
4. Si ganas 5%, protege $1.50 de cada $5.00.
5. Si el mercado se da la vuelta y toca el umbral protegido, **cierra todo automaticamente**.

${KNOWLEDGE_BASE.trailing[2]}

${obtenerCitaAleatoria()}`;
  }

  // Preguntas sobre limites
  if (lower.includes("limite") || lower.includes("bloqueo") || lower.includes("1%")) {
    return `Tus limites de proteccion son:

- **Diario:** ${contexto?.planType === "trailing" ? "1% (igual que Basic)" : "1%"}
- **Semanal:** 10%
- **Mensual:** 30%

Si cruzas cualquiera de estos limites, **todas tus posiciones se cierran al instante** y tu cuenta se bloquea hasta las 00:00 del dia siguiente.

Esto no es un castigo. Es un **cierre quirurgico** ejecutado por el sistema, no por tus emociones.

${obtenerCitaAleatoria()}`;
  }

  // Preguntas sobre cuenta boveda
  if (lower.includes("boveda") || lower.includes("retirar") || lower.includes("retiro")) {
    return `TODAS las cuentas Guardian Stop son **Cuenta Boveda**. Esto significa:

- Tu capital queda comprometido durante el periodo que contrates (30, 90, 180 o 365 dias).
- **No hay retiros anticipados.**
- No puedes sacar tu dinero hasta que termine tu compromiso.

Esa es la disciplina que te protege de ti mismo cuando sientes panico o euforia.

${KNOWLEDGE_BASE.guardianStop[1]}`;
  }

  // Preguntas sobre score
  if (lower.includes("score") || lower.includes("diploma") || lower.includes("curriculum")) {
    return `Tu **Score de Disciplina** se genera cada mes que cumples sin cruzar tus limites:

- **0-60%:** Necesitas trabajar en tu consistencia.
- **60-80%:** Buen progreso. Sigues construyendo habitos.
- **80-95%:** Excelente disciplina. Los inversores empiezan a notar.
- **95-100%:** Elite. Eres el tipo de trader al que los fondos quieren dar dinero.

Despues de tu primer mes completo, puedes hacerlo **publico** con tu avatar y foto. Es tu carta de presentacion ante inversores.

${obtenerCitaAleatoria()}`;
  }

  // Preguntas sobre sobre-operacion
  if (lower.includes("overtrading") || lower.includes("sobre operar") || lower.includes("sobre-operar")) {
    return `${KNOWLEDGE_BASE.sobreOperacion[0]}

${KNOWLEDGE_BASE.sobreOperacion[2]}

Si sientes que "necesitas" operar, NO operes. Necesitar operar es como necesitar apostar. Es la adiccion hablando.

${obtenerCitaAleatoria()}`;
  }

  // Respuesta por defecto
  return `${obtenerFrasePsicologia()}

${obtenerCitaAleatoria()}

Si tienes alguna pregunta especifica sobre tu cuenta, tus limites, o necesitas ayuda con algo, dimelo directamente.`;
}

// ============================================================
// GUARDAR ALERTA CRITICA EN BASE DE DATOS
// ============================================================

async function guardarAlertaCritica(
  userId: number,
  tipo: string,
  mensajeOriginal: string
): Promise<void> {
  const db = getDb();

  await db.insert(notifications).values({
    userId,
    type: "limit_warning",
    title: `ALERTA: ${tipo}`,
    message: `Guardiano detecto estado emocional critico. Mensaje del usuario: "${mensajeOriginal.substring(0, 200)}"`,
  });
}

// ============================================================
// MENSAJES PROACTIVOS (semanales / cuando detecta riesgo)
// ============================================================

export async function enviarReflexionSemanal(
  userId: number,
  stats: {
    tradesEstaSemana: number;
    diasCruzados: number;
    profitSemanal: number;
    maxDrawdown: number;
  }
): Promise<void> {
  const db = getDb();

  let mensaje = "";

  if (stats.diasCruzados === 0 && stats.profitSemanal > 0) {
    // Semana perfecta
    mensaje = `Esta semana fue EXCEPCIONAL:
- ${stats.tradesEstaSemana} trades ejecutados
- 0 dias cruzando limites
- Profit: $${stats.profitSemanal.toFixed(2)}

${obtenerCitaAleatoria()}

Sigues construyendo tu curriculum de disciplina. Los inversores estan viendo.`;
  } else if (stats.diasCruzados > 0) {
    // Semana con cruces
    mensaje = `Esta semana tuviste ${stats.diasCruzados} dia(s) donde cruzaste tus limites.

No es el fin del mundo. Es informacion valiosa sobre donde necesitas fortalecerte.

${obtenerConsejoMalDia()}

${obtenerCitaAleatoria()}

Si necesitas hablar sobre esto, estoy aqui. O contacta a soporte: support@guardianstop.com`;
  } else {
    // Semana neutra
    mensaje = `Resumen de tu semana:
- ${stats.tradesEstaSemana} trades
- Profit: $${stats.profitSemanal.toFixed(2)}
- Max drawdown: ${stats.maxDrawdown.toFixed(2)}%

${obtenerCitaAleatoria()}`;
  }

  await db.insert(notifications).values({
    userId,
    type: "weekly_reflection",
    title: "Tu reflexion semanal",
    message: mensaje,
  });
}

// ============================================================
// EXPORTS
// ============================================================

export { KNOWLEDGE_BASE, PALABRAS_ALERTA };
