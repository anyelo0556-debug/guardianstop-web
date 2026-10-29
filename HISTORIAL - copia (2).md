# HISTORIAL GUARDIAN STOP - Desde el Dia 1

## FASE 1: FRONTEND Y CONEXION BROKERS
- **Diseno**: React 19 + Vite + Tailwind + shadcn/ui
- **Paleta**: bg #0B1426, gold #C9A84C, text #F5F5DC
- **IG API**: Conexion real a demo-api.ig.com con CST + X-SECURITY-TOKEN
- **Deriv API**: WebSocket wss://ws.derivws.com (solucionado error 520)
- **Panel multi-broker**: IG + Deriv en una sola pantalla
- **P&L en tiempo real**: Calculo con effectiveBalance = balance + totalPnL

## FASE 2: PROTECCION AUTOMATICA
- **Daily/Weekly/Monthly Limits**: Configurables y bloqueables
- **Trailing Stop**: Activa a +1% del balance, protege X% del pico
- **Auto-close**: 3 reintentos, reset automatico, cierre por lote
- **Drawdown**: Monitoreo cada 1 segundo con effectiveBalance

## FASE 3: BACKEND 24/7
- **Stack**: tRPC + Drizzle ORM + Hono + MySQL
- **Worker IG**: Polling cada 3 segundos, auto-close, snapshots
- **API endpoints**: Status, historial, notificaciones, estadisticas
- **Base de datos**: accounts, trades, protection_logs, notifications

## FASE 4: DEPLOY
- **GitHub**: anyelo0556-debug/guardianstop-web
- **Render**: guardianstop-web.onrender.com (backend 24/7)
- **Cloudflare**: guardianstop.com apuntando a Render
- **UptimeRobot**: 11 monitores, ping cada 5 minutos
- **Variables**: APP_ID, APP_SECRET, DATABASE_URL, KIMI_AUTH_URL, etc.

## CORRECCIONES IMPORTANTES
- IG OAuth: Tokens en headers (CST/XST), no en body
- Deriv: Conexion browser-based, no datacenter
- P&L: Fix de string vs number en pos.level
- Render: Fix package-lock.json (mirror China), variables de entorno
- Frontend: Eliminada ruta /deriv, ahora solo /panel

## ARCHIVOS CLAVE
- `src/pages/BrokerPanel.tsx` - Panel principal
- `src/pages/Dashboard.tsx` - Dashboard historico
- `api/services/IGBrokerService.ts` - Servicio IG real
- `api/services/IGPollingWorker.ts` - Worker 24/7
- `api/ig-router.ts` - Endpoints API

## CREDENCIALES
- IG API Key: `37f75d11dece9df84f62be9829e5e41a794ff42a`
- IG Account ID: `Z6FHM1`
- Render URL: `guardianstop-web.onrender.com`
- Dominio: `guardianstop.com`

## COSTOS
- Render Free: $0 (con UptimeRobot para no dormir)
- Cloudflare Pages: $0
- UptimeRobot: $0
- Total: $0/mes (piloto)

## ESTADO ACTUAL
✅ Backend Live en Render
✅ Dominio guardianstop.com activo
✅ Worker 24/7 corriendo
✅ Dashboard historico funcionando
✅ Panel multi-broker operativo
