# Una carta para ti

Web local para editar en Visual Studio Code. Necesita Node.js 22 o posterior. No requiere instalar paquetes.

1. Abre esta carpeta en Visual Studio Code.
2. Abre Terminal → Nueva terminal.
3. Ejecuta `npm start`.
4. Visita http://localhost:3000.

Haz clic en el sello para abrir la carta. El botón invisible de administración ocupa los primeros 58 píxeles de la esquina superior derecha. También es accesible con Tab.

Usuario inicial: `adminamor`

Contraseña inicial: `Rosa!Luna2026#Carta`

Desde el panel puedes cambiar dedicatoria, bienvenida, carta, firma, tipografía, tamaño, color de tinta y papel. Los cambios se guardan en `data/letter.json` y aparecen para todos los visitantes. Cerrar el panel descarta los cambios sin guardar. Las fuentes son locales y su apariencia puede variar según el dispositivo.

## Acceso privado

La contraseña se comprueba en Node.js y no se envía al navegador. Se utilizan cookies HttpOnly, sesiones de una hora y un límite de ocho intentos por cada quince minutos. Reiniciar el servidor cierra las sesiones.

Antes de publicarla, cambia las credenciales con variables de entorno en la terminal PowerShell:

```powershell
$env:ADMIN_USER = 'tu-usuario'
$env:ADMIN_PASSWORD = 'tu-nueva-contraseña-larga'
npm start
```

El servidor escucha solo en tu computadora. Para publicarlo necesitas un alojamiento compatible con Node.js y disco persistente, configurar su interfaz de escucha según el proveedor, usar HTTPS y establecer `COOKIE_SECURE=true`. No se puede subir tal cual a un alojamiento de páginas estáticas ni iniciar con Live Server, porque el panel necesita el servidor. La carta es pública; la edición requiere inicio de sesión. El botón invisible no sustituye la autenticación.

## Persistencia y respaldos

El servidor escribe el archivo de forma atómica y sincroniza su contenido antes de reemplazarlo. Guarda la versión anterior en `letter.json.bak`. Si el archivo principal se daña, recupera esa versión y conserva el archivo dañado para revisión. Esa recuperación puede perder el último cambio; no sustituye un respaldo externo.

El panel permite descargar un respaldo JSON del último guardado y restaurarlo como vista previa. Para confirmar una restauración hay que pulsar Guardar carta. Guarda una copia descargada antes de cada publicación y conserva toda la carpeta de datos.

Para producción, define `NODE_ENV=production`, `ADMIN_USER`, `ADMIN_PASSWORD` y `DATA_DIR`. La última variable debe apuntar a un volumen persistente fuera del código que reemplazas al desplegar. El servidor usa el puerto `PORT`, escucha en `0.0.0.0` en producción y activa cookies Secure. Necesita HTTPS. Usa una sola instancia del servidor para este almacenamiento por archivo. Las sesiones se cierran al reiniciar; la carta permanece.

## Si el alojamiento solo admite páginas estáticas

La versión actual necesita Node.js para autenticación y guardado compartido. Subir únicamente `public/` no habilita esas funciones. Antes de publicar en un alojamiento estático hace falta integrar un servicio externo de autenticación y base de datos, o publicar toda la aplicación en un servidor Node.js con volumen persistente. No guardes contraseñas en JavaScript ni sustituyas el guardado compartido por localStorage.

Los respaldos ubicados en el mismo disco no protegen contra la eliminación del volumen. Un alojamiento con disco temporal perderá los datos al recrear el servicio: configura almacenamiento persistente y respaldos externos antes de usarlo.

Verificaciones: `npm test`. Las pruebas usan carpetas temporales y no modifican la carta real. Tras cambiar el servidor, detenlo con Ctrl+C y vuelve a ejecutar `npm start`.
