# Deploy en Railway (3 clicks)

## Requisitos
- Cuenta gratis en railway.app (signup con GitHub, 30 segundos)

## Pasos

### 1. Crear proyecto
- Ve a railway.app
- Click "New Project"
- Selecciona "Deploy from GitHub repo"
- Elige `guardianstop-web`

### 2. Agregar base de datos
- Click "New" → "Database" → "Add MySQL"
- Railway te dará la variable `DATABASE_URL` automáticamente

### 3. Variables de entorno
Ve a "Variables" y agrega:

```
IG_API_KEY=37f75d11dece9df84f62be9829e5e41a794ff42a
DATABASE_URL=${{MySQL.DATABASE_URL}}  (ya viene automatico)
```

### 4. Deploy
- Railway deploya automatico al hacer push a GitHub
- El worker IG arranca solo cuando el servidor inicia

### 5. URL
- Railway te da una URL tipo `guardianstop-web.up.railway.app`
- Conectala a tu dominio guardianstop.com
