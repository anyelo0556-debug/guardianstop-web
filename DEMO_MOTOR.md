# Guardian Stop — Demo Motor de Riesgo (Mañana)

## Paso 1: Instalar Python (si no lo tienes)
1. Ve a https://www.python.org/downloads/
2. Descarga Python 3.10 o superior
3. Instálalo (marca "Add Python to PATH" durante instalación)
4. Abre CMD (símbolo del sistema) y escribe:
   ```
   python --version
   ```
   Debe mostrar algo como `Python 3.11.x`

## Paso 2: Instalar la librería requests
En CMD escribe:
```
pip install requests
```

## Paso 3: Configurar credenciales IG
1. Abre el archivo `demo_motor_riesgo.py` con Bloc de notas
2. Busca estas líneas (líneas 22-24):
   ```python
   IG_API_KEY  = "PON_TU_API_KEY_AQUI"
   IG_USERNAME = "PON_TU_USUARIO_AQUI"
   IG_PASSWORD = "PON_TU_PASSWORD_AQUI"
   ```
3. Reemplaza con tus credenciales IG Demo:
   ```python
   IG_API_KEY  = "a1b2c3d4..."   # Tu API Key de IG
   IG_USERNAME = "angel0556d"     # Tu usuario IG
   IG_PASSWORD = "tu_password"    # Tu contraseña IG
   ```
4. Guarda el archivo (Ctrl+G)

## Paso 4: Ejecutar el motor
1. En CMD, navega a la carpeta donde guardaste el archivo:
   ```
   cd C:\Users\TuUsuario\Downloads
   ```
2. Corre el motor:
   ```
   python demo_motor_riesgo.py
   ```

## Paso 5: Hacer la demo en vivo
1. Abre IG en tu navegador (cuenta demo)
2. El motor ya está corriendo en la terminal
3. Abre 1 o 2 trades en IG Demo
4. Deja que pierdan dinero (o usa un mercado volátil)
5. Cuando la pérdida acumulada llegue al 1% del balance inicial, el motor **cerrará automáticamente todas las posiciones**
6. Verás en la terminal:
   ```
   [PROTECCIÓN ACTIVADA: LÍMITE DIARIO ALCANZADO]
   Cerrando 2 posiciones...
   CERRADO OK: EUR/USD
   CERRADO OK: US Tech 100
   ```

## Paso 6: Trailing Stop (opcional)
Si quieres demo del trailing stop:
1. Abre un trade ganador
2. Espera que suba +1% del balance
3. Deja que baje un poco
4. El motor activará trailing stop y cerrará

## Comandos útiles
- **Detener el motor**: Presiona `Ctrl+C` en la terminal
- **Ver logs**: Todo se muestra en la terminal en tiempo real
- **Cambiar límites**: Edita las variables `DAILY_LIMIT_PCT`, etc. en el archivo

## Qué mostrar en la demo
1. "Este es Guardian Stop, mi motor de riesgo en Python"
2. "Se conecta a la API de IG en tiempo real"
3. "Vigila el balance, el P&L flotante y el drawdown"
4. "Si se alcanza el límite diario del 1%, cierra TODO automáticamente"
5. Abre un trade, deja que pierda, muestra el cierre automático
6. "Esto protege al trader de pérdidas excesivas"

## Si algo falla
- **"Login FALLÓ"**: Verifica que las credenciales sean correctas y que sea cuenta DEMO
- **"No module named requests"**: Corre `pip install requests` de nuevo
- **No cierra posiciones**: Asegúrate de que el trade tenga dealId (no todos los mercados lo tienen)
