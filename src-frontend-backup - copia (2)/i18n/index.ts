export type Lang = "es" | "en";

export const translations = {
  es: {
    nav: {
      home: "Inicio",
      how: "Cómo Funciona",
      plans: "Planes",
      quote: "Inspírate",
      about: "Sobre Nosotros",
      contact: "Contáctanos",
      admin: "Panel Admin",
      back: "Volver al sitio",
      protect: "PROTEGER MI CAPITAL",
    },
    hero: {
      badge: "SISTEMA ACTIVO — PROTECCIÓN EN TIEMPO REAL",
      title1: "TU CAPITAL NO SE PUEDE",
      title2: "TOCAR EMOCIONALMENTE",
      subtitle:
        "Guardian Stop es tu capa de protección invisible. Elimina el overtrading, controla el apalancamiento descontrolado, protege tus ganancias y deja que el sistema cierre por ti cuando la disciplina falla.",
      cta1: "PROTEGER MI CAPITAL",
      cta2: "VER CÓMO FUNCIONA",
      dailyQuote: "FRASE DEL DÍA",
      stats: {
        latency: { label: "Seguridad", sub: "Cierre automático" },
        precision: { label: "Ejecución", sub: "Sin intervención" },
        audit: { label: "Transparencia", sub: "Historial completo" },
        block: { label: "Protección", sub: "Cuenta bloqueada" },
      },
      publicStats: {
        accounts: "Cuentas Protegidas",
        capital: "Capital Bajo Protección",
      },
      feed: {
        title: "FEED EN VIVO — CME:ESU4",
        live: "LIVE",
        nl: "NL",
        dd: "DD",
        pos: "POS",
        state: "ESTADO",
        monitoring: "PROTEGIDO",
      },
    },
    about: {
      title: "SOBRE GUARDIAN STOP",
      subtitle:
        "Lo que somos, lo que hacemos, y lo que nunca seremos. Sin confusiones.",
      who: {
        title: "QUIÉNES SOMOS",
        desc:
          "Un sistema de protección automatizado diseñado por traders para traders. Sabemos lo que es perder por overtrading y apalancamiento descontrolado. No somos bróker. No gestionamos tu dinero. Somos tu freno emocional cuando el mercado te pone a prueba.",
      },
      mission: {
        title: "MISIÓN",
        desc:
          "Ser el freno invisible que detiene la hemorragia antes de que sangres seco. No 'bloqueamos' tu cuenta: le quitamos el volante a tus emociones cuando están ebrias de euforia o paralizadas por el miedo. Tu capital se queda donde debe estar — en tu bolsillo, no en el mercado.",
      },
      vision: {
        title: "VISIÓN",
        desc:
          "Ser el estándar global de protección conductual en trading. Que ningún trader pierda su cuenta por falta de disciplina.",
      },
      not: {
        title: "QUÉ NO SOMOS",
        desc:
          "No damos señales. No gestionamos fondos. No somos bróker. No garantizamos ganancias. Somos una capa de protección que TÚ controlas.",
        checklistTitle: "NO SOMOS",
        items: [
          "No damos señales de trading",
          "No gestionamos fondos",
          "No somos bróker",
          "No garantizamos ganancias",
        ],
        yes: "✅ Somos tu capa de protección automatizada",
      },
    },
    how: {
      title: "CÓMO FUNCIONA",
      subtitle:
        "Tres capas de protección que trabajan mientras tú operas. Sin emociones, sin segundas oportunidades para tu psicología.",
      steps: [
        {
          title: "1. DEFINE TU ARMADURA",
          desc: "Eliges tu límite de pérdida diaria (1%), semanal (10%) y mensual (30%). Activa Trailing: apenas ganes tu primer 1%, el sistema entra en modo protección de ganancias. Siempre resguarda el 30% de lo que llevas acumulado. El software recalcula solo.",
        },
        {
          title: "2. EL SISTEMA VIGILA",
          desc: "Guardian Stop monitorea tu cuenta en tiempo real. No duerme. No se distrae. No siente miedo ni codicia. Detecta cuando entras en overtrading o excedes tu apalancamiento. Si cruzas tu límite, actúa.",
        },
        {
          title: "3. CIERRE Y BLOQUEO",
          desc: "Cuando se activa el límite, todas las posiciones se cierran al instante y tu cuenta se bloquea hasta las 00:00 del día siguiente. Sin negociación. Sin 'solo una más'.",
        },
      ],
      trailing: {
        title: "MODO TRAILING — PROTEGE LO QUE GANASTE",
        desc: "Imagina que ganas 2% en el día. Guardian Stop resguarda el 30% de esas ganancias. Si subes a 5%, ahora protege el 30% de ese 5%. Si el mercado se da la vuelta y toca el umbral del 30% protegido, todas tus operaciones se cierran automáticamente por ese día. No más sobre-operación. No más devolver lo ganado al mercado. Guardian Stop te ayuda a conservar lo que lograste.",
      },
    },
    vault: {
      title: "CUENTA BÓVEDA",
      subtitle:
        "Tu compromiso con la disciplina, sellado. Durante el período que elijas, no podrás retirar capital. Esto elimina la tentación de romper tu plan.",
      features: [
        { title: "Retiros Congelados", desc: "Tu capital queda dentro durante 30, 90, 180 o 365 días. Solo operas.", icon: "lock" },
        { title: "Diploma Mensual", desc: "Si cumples tu mes sin romper reglas, recibes un diploma digital de disciplina.", icon: "award" },
        { title: "Recompensa de Constancia", desc: "Cada mes cumplido aumenta tu Score de Disciplina y desbloquea beneficios.", icon: "trending" },
      ],
      note: "TODAS las cuentas Guardian Stop son Cuenta Bóveda. No importa qué plan elijas: tu capital queda protegido durante el período que contrates. No hay retiros hasta que cumplas tu compromiso. Esa es la disciplina que te protege de ti mismo.",
    },
    guardiano: {
      title: "GUARDIANO — TU SOPORTE IA 24/7",
      subtitle:
        "Guardiano es tu asistente de inteligencia artificial entrenado en psicología del trading, gestión de riesgo y control de overtrading. Te ayuda cuando sientes la tentación de sobre-operar o usar apalancamiento excesivo.",
      features: [
        "Disponible 24 horas, 7 días a la semana",
        "Te ayuda a configurar tus límites sin errores",
        "Te recuerda por qué empezaste cuando sientas FOMO",
        "Te explica tu Score de Disciplina y cómo mejorarlo",
        "Te guía paso a paso si tu cuenta se bloquea",
      ],
      cta: "HABLAR CON GUARDIANO",
    },
    plans: {
      title: "ELIGE TU ARMADURA",
      subtitle:
        "TODOS los planes incluyen protección completa y acceso a Guardiano. Todas las cuentas son Cuenta Bóveda: una vez que eliges tu período, tu capital queda protegido y no podrás retirarlo hasta que termine. Esa es la disciplina. Solo varía el tiempo de compromiso y el trailing.",
      types: {
        basic: "GUARDIAN BASIC",
        basicDesc:
          "Protección fija: defines tu límite de pérdida y el sistema cierra cuando lo tocas. Ideal para traders que dominan su entrada pero necesitan un freno contra el overtrading y el apalancamiento descontrolado.",
        trailing: "GUARDIAN TRAILING",
        trailingDesc:
          "Protección fija + protección de ganancias. El trailing se activa al 1% de profit y siempre resguarda el 30% de lo acumulado. Si retrocedes y toca el umbral protegido, se cierra todo por ese día. Para traders que ganan pero lo devuelven al mercado.",
      },
      limits: {
        title: "TUS LÍMITES (incluidos en todos los planes)",
        daily: "1% máximo de pérdida diaria",
        weekly: "10% máximo de pérdida semanal",
        monthly: "30% máximo de pérdida mensual",
        trailingNote: "Trailing: activa al 1%, protege el 30% de lo acumulado. Si retrocedes al umbral, cierra todo por ese día",
      },
      commitment: {
        vault: "Cuenta Bóveda: retiros bloqueados durante el período elegido",
        popular: "MÁS ELEGIDO",
      },
      guarantee: "Garantía 7 días: reembolso total si no sientes la protección. Día 8 se confirma la suscripción.",
      score: "Score de Disciplina: se activa automáticamente después del primer mes completo.",
      diploma: "Diploma Mensual: si cumples tu contrato, recibes un diploma digital de constancia.",
      cta: "ELEGIR ESTE PLAN",
      prices: {
        basic30: "$19.99",
        trailing30: "$22.99",
        basic90: "$54.99",
        trailing90: "$62.99",
        basic180: "$99.99",
        trailing180: "$114.99",
        basic365: "$179.99",
        trailing365: "$199.99",
      },
    },
    quote: {
      title: "INSPÍRATE CADA MAÑANA",
      subtitle:
        "Antes de abrir el mercado, recibe una frase de los grandes directo a tu WhatsApp y en tu panel.",
      tag: "FRASE DEL DÍA",
      author: "Autor",
      category: "Categoría",
    },
    contact: {
      title: "CONTÁCTANOS",
      subtitle:
        "¿Dudas sobre tu configuración? ¿Necesitas hablar con el equipo? Estamos aquí.",
      whatsapp: "WhatsApp Directo",
      email: "Email de Soporte",
      hours: "Horario de Atención",
      hoursVal: "Lunes a Viernes, 8:00 - 20:00 EST",
      form: {
        name: "Nombre",
        email: "Email",
        message: "Mensaje",
        send: "ENVIAR MENSAJE",
      },
    },
    admin: {
      title: "PANEL DE CONTROL",
      accounts: "Cuentas Activas",
      capital: "Capital Protegido",
      blocked: "Bloqueadas Hoy",
      healthy: "Sistemas OK",
      table: {
        id: "ID",
        trader: "Trader",
        state: "Estado",
        netliq: "Net Liq",
        dd: "DD%",
        latency: "Latencia",
        plan: "Plan",
        nextPayment: "Próximo Pago",
        score: "Score",
        pnl: "P&L Mes",
      },
      detail: "Detalle",
      worker: "Worker",
      running: "Activo",
      locked: "Bloqueada",
      stale: "Feed lento",
      killing: "Cierre activo",
      metrics: {
        title: "Métricas del Trader",
        winRate: "Win Rate",
        profitFactor: "Profit Factor",
        avgWin: "Avg Win",
        avgLoss: "Avg Loss",
        trades: "Operaciones",
        discipline: "Disciplina",
      },
    },
    footer: {
      disclaimer:
        "AVISO LEGAL: Guardian Stop es una herramienta de gestión de riesgo conductual. No brinda asesoría financiera ni garantiza rentabilidad. El trading de futuros, forex y CFDs conlleva riesgo significativo de pérdida. Past performance is not indicative of future results. Solo opera con capital que puedas permitirte perder.",
      rights: "Todos los derechos reservados.",
    },
    fsm: {
      title: "ESTADOS DE PROTECCIÓN",
      monitoring: "PROTEGIDO — Vigilando tu cuenta",
      stale: "ATENCIÓN — Feed lento, monitoreando",
      blocked: "BLOQUEADO — Sin datos, protección preventiva",
      killing: "CIERRE ACTIVO — Ejecutando cierre de posiciones",
      locked: "CUENTA SEGURA — Cierre exitoso, bloqueada hasta mañana",
      lockedrisk: "RIESGO RESIDUAL — Requiere revisión manual",
    },
  },
  en: {
    nav: {
      home: "Home",
      how: "How It Works",
      plans: "Plans",
      quote: "Get Inspired",
      about: "About Us",
      contact: "Contact Us",
      admin: "Admin Panel",
      back: "Back to Site",
      protect: "PROTECT MY CAPITAL",
    },
    hero: {
      badge: "SYSTEM ACTIVE — REAL-TIME PROTECTION",
      title1: "YOUR CAPITAL CANNOT BE",
      title2: "TOUCHED EMOTIONALLY",
      subtitle:
        "Guardian Stop is your invisible protection layer. Eliminates overtrading, controls excessive leverage, protects profits, and lets the system close for you when discipline fails.",
      cta1: "PROTECT MY CAPITAL",
      cta2: "SEE HOW IT WORKS",
      dailyQuote: "QUOTE OF THE DAY",
      stats: {
        latency: { label: "Security", sub: "Auto-close" },
        precision: { label: "Execution", sub: "No intervention" },
        audit: { label: "Transparency", sub: "Full history" },
        block: { label: "Protection", sub: "Account locked" },
      },
      publicStats: {
        accounts: "Protected Accounts",
        capital: "Capital Under Protection",
      },
      feed: {
        title: "LIVE FEED — CME:ESU4",
        live: "LIVE",
        nl: "NL",
        dd: "DD",
        pos: "POS",
        state: "STATUS",
        monitoring: "PROTECTED",
      },
    },
    about: {
      title: "ABOUT GUARDIAN STOP",
      subtitle:
        "What we are, what we do, and what we will never be. No confusion.",
      who: {
        title: "WHO WE ARE",
        desc:
          "An automated protection system designed by traders for traders. We know what it's like to lose from overtrading and uncontrolled leverage. We are not a broker. We don't manage your money. We are your emotional brake when the market tests you.",
      },
      mission: {
        title: "MISSION",
        desc:
          "Be the invisible brake that stops the bleeding before you bleed dry. We don't 'lock' your account: we take the wheel from your emotions when they're drunk on euphoria or paralyzed by fear. Your capital stays where it belongs — in your pocket, not in the market.",
      },
      vision: {
        title: "VISION",
        desc:
          "To become the global standard for behavioral protection in trading. So no trader loses their account due to lack of discipline.",
      },
      not: {
        title: "WHAT WE ARE NOT",
        desc:
          "We don't give signals. We don't manage funds. We are not a broker. We don't guarantee profits. We are a protection layer that YOU control.",
        checklistTitle: "WE ARE NOT",
        items: [
          "We don't give trading signals",
          "We don't manage funds",
          "We are not a broker",
          "We don't guarantee profits",
        ],
        yes: "✅ We are your automated protection layer",
      },
    },
    how: {
      title: "HOW IT WORKS",
      subtitle:
        "Three protection layers working while you trade. No emotions, no second chances for your psychology.",
      steps: [
        {
          title: "1. DEFINE YOUR ARMOR",
          desc: "Choose your daily loss limit (1%), weekly (10%), and monthly (30%). Activate Trailing: as soon as you earn your first 1%, the system enters profit-protection mode. It always safeguards 30% of what you've accumulated so far. The software recalculates automatically.",
        },
        {
          title: "2. THE SYSTEM WATCHES",
          desc: "Guardian Stop monitors your account in real-time. It doesn't sleep. It doesn't get distracted. It doesn't feel fear or greed. It detects when you enter overtrading or exceed your leverage. If you cross your limit, it acts.",
        },
        {
          title: "3. CLOSE AND LOCK",
          desc: "When the limit triggers, all positions close instantly and your account locks until 00:00 the next day. No negotiation. No 'just one more'.",
        },
      ],
      trailing: {
        title: "TRAILING MODE — PROTECT WHAT YOU EARNED",
        desc: "Imagine you gain 2% in a day. Guardian Stop safeguards 30% of those profits. If you climb to 5%, it now protects 30% of that 5%. If the market turns around and hits the protected threshold, all your trades close automatically for that day. No more overtrading. No more giving profits back to the market. Guardian Stop helps you keep what you earned.",
      },
    },
    vault: {
      title: "VAULT ACCOUNT",
      subtitle:
        "Your commitment to discipline, sealed. During the period you choose, you cannot withdraw capital. This eliminates the temptation to break your plan.",
      features: [
        { title: "Frozen Withdrawals", desc: "Your capital stays inside for 30, 90, 180 or 365 days. You only trade.", icon: "lock" },
        { title: "Monthly Diploma", desc: "If you complete your month without breaking rules, you receive a digital discipline diploma.", icon: "award" },
        { title: "Consistency Reward", desc: "Each completed month increases your Discipline Score and unlocks benefits.", icon: "trending" },
      ],
      note: "ALL Guardian Stop accounts are Vault Accounts. No matter which plan you choose: your capital is protected during the period you contract. No withdrawals until you complete your commitment. That is the discipline that protects you from yourself.",
    },
    guardiano: {
      title: "GUARDIAN — YOUR AI SUPPORT 24/7",
      subtitle:
        "Guardian is your artificial intelligence assistant trained in trading psychology, risk management, and overtrading control. It helps when you feel the temptation to overtrade or use excessive leverage.",
      features: [
        "Available 24 hours, 7 days a week",
        "Helps you set up your limits without mistakes",
        "Reminds you why you started when you feel FOMO",
        "Explains your Discipline Score and how to improve it",
        "Guides you step by step if your account gets blocked",
      ],
      cta: "TALK TO GUARDIAN",
    },
    plans: {
      title: "CHOOSE YOUR ARMOR",
      subtitle:
        "ALL plans include full protection and access to Guardian. ALL accounts are Vault Accounts: once you choose your period, your capital is protected and you cannot withdraw until it ends. That is discipline. Only commitment time and trailing vary.",
      types: {
        basic: "GUARDIAN BASIC",
        basicDesc:
          "Fixed protection: you define your loss limit and the system closes when you hit it. Ideal for traders who master their entry but need a brake against overtrading and uncontrolled leverage.",
        trailing: "GUARDIAN TRAILING",
        trailingDesc:
          "Fixed protection + profit protection. Trailing activates at 1% profit and always safeguards 30% of what's accumulated. If you pull back to the threshold, everything closes for that day. For traders who win but give it back to the market.",
      },
      limits: {
        title: "YOUR LIMITS (included in all plans)",
        daily: "1% maximum daily loss",
        weekly: "10% maximum weekly loss",
        monthly: "30% maximum monthly loss",
        trailingNote: "Trailing: activates at 1%, protects 30% of accumulated profit. Pulls back to threshold = closes everything for the day",
      },
      commitment: {
        vault: "Vault Account: withdrawals blocked during chosen period",
        popular: "MOST CHOSEN",
      },
      guarantee: "7-day guarantee: full refund if you don't feel the protection. Day 8 confirms subscription.",
      score: "Discipline Score: activates automatically after the first full month.",
      diploma: "Monthly Diploma: if you complete your contract, you receive a digital consistency diploma.",
      cta: "CHOOSE THIS PLAN",
      prices: {
        basic30: "$19.99",
        trailing30: "$22.99",
        basic90: "$54.99",
        trailing90: "$62.99",
        basic180: "$99.99",
        trailing180: "$114.99",
        basic365: "$179.99",
        trailing365: "$199.99",
      },
    },
    quote: {
      title: "GET INSPIRED EVERY MORNING",
      subtitle:
        "Before opening the market, receive a quote from the greats directly to your WhatsApp and panel.",
      tag: "QUOTE OF THE DAY",
      author: "Author",
      category: "Category",
    },
    contact: {
      title: "CONTACT US",
      subtitle:
        "Questions about your setup? Need to talk to the team? We are here.",
      whatsapp: "Direct WhatsApp",
      email: "Support Email",
      hours: "Support Hours",
      hoursVal: "Monday to Friday, 8:00 - 20:00 EST",
      form: {
        name: "Name",
        email: "Email",
        message: "Message",
        send: "SEND MESSAGE",
      },
    },
    admin: {
      title: "CONTROL PANEL",
      accounts: "Active Accounts",
      capital: "Protected Capital",
      blocked: "Blocked Today",
      healthy: "Systems OK",
      table: {
        id: "ID",
        trader: "Trader",
        state: "State",
        netliq: "Net Liq",
        dd: "DD%",
        latency: "Latency",
        plan: "Plan",
        nextPayment: "Next Payment",
        score: "Score",
        pnl: "P&L Month",
      },
      detail: "Detail",
      worker: "Worker",
      running: "Active",
      locked: "Blocked",
      stale: "Slow feed",
      killing: "Closing active",
      metrics: {
        title: "Trader Metrics",
        winRate: "Win Rate",
        profitFactor: "Profit Factor",
        avgWin: "Avg Win",
        avgLoss: "Avg Loss",
        trades: "Trades",
        discipline: "Discipline",
      },
    },
    footer: {
      disclaimer:
        "LEGAL DISCLAIMER: Guardian Stop is a behavioral risk management tool. It does not provide financial advice or guarantee profitability. Trading futures, forex and CFDs involves significant risk of loss. Past performance is not indicative of future results. Only trade with capital you can afford to lose.",
      rights: "All rights reserved.",
    },
    fsm: {
      title: "PROTECTION STATES",
      monitoring: "PROTECTED — Watching your account",
      stale: "WARNING — Slow feed, monitoring",
      blocked: "BLOCKED — No data, preventive protection",
      killing: "CLOSING ACTIVE — Executing position close",
      locked: "ACCOUNT SECURE — Close successful, locked until tomorrow",
      lockedrisk: "RESIDUAL RISK — Requires manual review",
    },
  },
} as const;

export type Translations = typeof translations;
