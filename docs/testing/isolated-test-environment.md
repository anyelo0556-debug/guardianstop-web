# Guardian Stop — entorno de pruebas aislado

## Objetivo

Probar el backend, el cifrado y los conectores sin utilizar cuentas reales, credenciales de producción ni la base TiDB de producción.

## Regla de aislamiento

- No apuntar pruebas a Render production ni a la URL TiDB de producción.
- No reutilizar tokens de producción ni el token Deriv que estuvo expuesto en Git.
- No ejecutar migraciones, `drizzle-kit push` ni operaciones de escritura contra producción.
- No activar cierres de posiciones reales. Las pruebas de ejecución deben usar simuladores o cuentas demo individuales autorizadas.
- No registrar tokens, contraseñas, códigos OAuth, cabeceras Authorization ni URLs completas de intercambio OAuth.

## Bloqueo del worker IG en cuentas live

El worker IG heredado no debe operar cuentas live mientras no esté conectado al evaluador REAL/PROP normalizado y a la gobernanza persistente. El adaptador actual solo calcula P&L flotante de posiciones abiertas; sus campos diarios, semanales y mensuales son aproximaciones y no sustituyen un ledger histórico verificado.

Por seguridad, las cuentas demo siguen disponibles para pruebas aisladas. Las cuentas live quedan excluidas del polling salvo que se configuren **ambas** variables de entorno después de completar y validar la integración:

- `GUARDIAN_ALLOW_LIVE_IG_WORKER=true`
- `GUARDIAN_LIVE_RISK_GOVERNANCE_READY=true`

Mantener ambas variables en `false` o sin configurar en desarrollo, CI y entornos de prueba. No habilitarlas solo para “probar conexión”: el segundo indicador es una confirmación operativa que únicamente debe activarse cuando existan persistencia de estados, recuperación de cierres pendientes y validación integral en demo.

## Variables locales

Copiar `.env.test.example` a un archivo local ignorado por Git (por ejemplo `.env.test.local`) y completar únicamente valores de prueba. No guardar secretos en el repositorio.

- `NODE_ENV=test`
- `GUARDIAN_ENVIRONMENT=test`
- `GUARDIAN_ALLOW_LIVE_IG_WORKER=false`
- `GUARDIAN_LIVE_RISK_GOVERNANCE_READY=false`
- `DATABASE_URL`: base de datos desechable de pruebas, nunca producción.
- `GUARDIAN_TOKEN_ENCRYPTION_KEY`: clave aleatoria de 32 bytes codificada en Base64, exclusiva para pruebas.
- `CTRADER_CLIENT_ID`, `CTRADER_CLIENT_SECRET`, `CTRADER_REDIRECT_URI`: dejar sin configurar hasta que exista una app de pruebas registrada y un callback seguro.
- `DERIV_DEMO_*`: no configurar con el token expuesto. La conexión Deriv compartida actual permanece deshabilitada en el plan de pruebas hasta contar con credenciales demo nuevas y aisladas.

Generar una clave local de prueba con Node:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

## Etapas de validación

1. Pruebas unitarias locales: cifrado AES-256-GCM, IV aleatorio, autenticación de integridad y rechazo de claves incorrectas.
2. Validación estática y build: `npm run check`, `npm test`, `npm run build`.
3. Base de datos efímera: aplicar migraciones únicamente sobre una instancia nueva y desechable; verificar esquema y aislamiento por usuario.
4. Conector simulado: probar autorización, estados, errores, idempotencia y desconexión sin transmitir órdenes a un broker.
5. Demo controlada: solo después de aprobar las etapas anteriores, usar cuentas demo independientes por usuario y credenciales nuevas, almacenadas cifradas.

## Criterios para avanzar a pruebas de broker

- OAuth con `state` criptográficamente aleatorio, almacenado del lado servidor, de un solo uso, con expiración y validación estricta del callback.
- Secretos cifrados antes de persistirlos; claves fuera de la base de datos.
- Consultas y escrituras limitadas al propietario de la cuenta.
- Registro de auditoría sin secretos.
- Orden de cierre simulada primero; luego demo con verificación del estado final.
- Sin despliegue ni cambios de producción como parte de esta fase.
