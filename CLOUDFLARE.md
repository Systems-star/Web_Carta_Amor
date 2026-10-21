# Publicar gratis en Cloudflare Pages + D1

Esta alternativa sustituye Render. Mantiene el frontend y utiliza Pages Functions para el acceso privado y D1 para guardar la carta. `npm start` sigue funcionando para uso local. No se necesita disco de pago.

1. Descarga un respaldo de tu carta desde el administrador local.
2. Sube los cambios a tu repositorio privado de GitHub:

```powershell
cd "D:\Nuevo web amor"
git add .
git commit -m "Preparar Cloudflare Pages y guardado en D1"
git push
```

3. Crea una cuenta en Cloudflare y conserva los planes gratuitos. En Storage & databases → D1, crea una base llamada `carta-amor`. En su consola SQL ejecuta el contenido de `cloudflare/schema.sql` (las tres instrucciones CREATE TABLE). Ejecutarlas de nuevo no borra datos.
4. En Workers & Pages, crea un proyecto **Pages**, conecta GitHub y elige `Web_Carta_Amor`. No elijas un Worker ni subas únicamente la carpeta public por arrastrar y soltar: hay funciones que compilar.
5. Framework preset: None. Production branch: main. Build command: `exit 0`. Build output directory: `public`. Root directory: raíz del repositorio (vacío). No uses `npm start` en Pages.
6. Puedes hacer el primer despliegue para crear el proyecto. Hasta configurar los pasos siguientes, la API mostrará un error de configuración; todavía no compartas el enlace.
7. En Settings → Bindings, añade D1 database: nombre de variable **DB**, base **carta-amor**, para Production.
8. En Settings → Variables and Secrets añade `ADMIN_USER` y `ADMIN_PASSWORD`. Usa una contraseña nueva y larga, y márcala como Secret. No subas la contraseña al repositorio. No necesitas NODE_ENV ni DATA_DIR en Cloudflare.
9. Vuelve a desplegar desde Deployments para aplicar bindings y secretos. No conectes las vistas Preview a la base de producción: si quieres pruebas, crea otra base y otros secretos.
10. Abre la URL de producción `https://NOMBRE.pages.dev`. El botón invisible utiliza las credenciales de Cloudflare. Restaura el respaldo y pulsa Guardar carta. Sin restaurar verás un texto inicial breve; no se importa automáticamente tu archivo local.
11. Comprueba la carta en incógnito y en el celular. Edita una palabra, guarda, recarga y comprueba en incógnito. Después de un nuevo despliegue la carta debe seguir igual.

## Conservación

La carta se guarda en D1, no en archivos temporales de Pages ni en el navegador. Los despliegues no ejecutan SQL ni restablecen datos. Cada guardado conserva la versión anterior en la columna `previous`. Descargar respaldo sigue disponible en el panel; guárdalo fuera de Cloudflare antes de cambios importantes. Para recuperar manualmente la versión anterior desde la consola D1:

```sql
SELECT previous FROM letter WHERE id = 1;
```

Copia ese JSON a un archivo y restáuralo desde el panel. No elimines el proyecto, la base D1 ni el binding DB. Mantén el mismo proyecto para conservar la URL. La cuenta debe permanecer activa y los límites gratuitos aplican: no hay garantía de disponibilidad eterna. Si agotas cuotas diarias, las operaciones de la API pueden fallar temporalmente, sin borrar por ello la carta.

Las contraseñas no se publican. Las sesiones duran una hora, usan cookies HttpOnly/Secure y quedan registradas con tokens hasheados en D1. Hay límite de ocho intentos por IP cada quince minutos. La carta es pública; la edición es privada. Cerrar sesión revoca la sesión actual.

Documentación oficial:
- https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- https://developers.cloudflare.com/pages/functions/bindings/#d1-databases
- https://developers.cloudflare.com/d1/platform/pricing/
