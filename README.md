# Simulador de secado multigrano — migración

Código entregado en `C:\Produccion\simulador\modern`. Aplicación activa: **http://app.simulador.local/**. Utiliza las cuentas existentes. El cambio de tráfico fue autorizado y ejecutado el 7 de octubre de 2026. También está disponible en **http://127.0.0.1:8282/**. La instalación PHP original permanece intacta y accesible en el puerto 82 para una reversión.

La actualización del repositorio `Luisfer112/simulad0`, revisión `20318d6`, se documenta en [docs/actualizacion-20318d6.md](docs/actualizacion-20318d6.md). Incluye las fórmulas autorizadas por el usuario, las tablas teórica/real, la vista de acceso y la nueva impresión. Mantiene React/Nest/PostgreSQL y los datos en uso.

## Organización

- `apps/web`: React, TypeScript y Vite. Componentes reutilizables, Tailwind y composición shadcn/Radix adaptada a los estilos originales. Las plantillas son HTML estático convertido en elementos React; no ejecutan PHP ni JavaScript heredado. CSS Bootstrap se conserva como compatibilidad visual, sin su JavaScript ni jQuery. Chart.js reproduce las series originales.
- `apps/api/src`: módulos NestJS de autenticación, usuarios, granos, maquinaria, historial, simulación y clima. `engine/` contiene los motores independientes de controladores y Prisma.
- `prisma`: esquema PostgreSQL y migración inicial reproducible. `tools/import-data.ts` y `verify-data.ts`: importación y contraste de todos los campos.
- `deployment`: Nginx del frontend y configuración propuesta del proxy compartido.
- `tests`: referencias capturadas y pruebas de equivalencia. `docs`: análisis, contratos, inventario y evidencias.
- `private/` y `reference/`: material local excluido de Git y de Docker, con datos personales, respaldos y referencias originales. `.env` contiene los secretos locales y tampoco se distribuye.

Node 24.13.0, NestJS 11.2.7, React 19.2.0, Vite 7.3.7, Prisma 6.19.3 y PostgreSQL 16.13 están fijados, junto con las demás dependencias, en las imágenes y `package-lock.json`. No hay PHP ni MySQL/MariaDB en los servicios nuevos. jsPDF/AutoTable se actualizaron conservando título, columnas, estilos y contenido del exportador; no se promete identidad binaria de PDFs, que incluyen metadatos variables.

## Arranque

Requiere Docker Desktop con contenedores Linux. En PowerShell:

```powershell
Set-Location C:\Produccion\simulador\modern
Copy-Item .env.example .env  # Solo en una instalación nueva; conservar el .env existente
# Editar POSTGRES_PASSWORD con un secreto aleatorio; actualizar DATABASE_URL si se usa fuera de Compose
docker compose up -d --build
docker compose ps
```

Compose construye la aplicación, espera PostgreSQL, aplica `prisma migrate deploy`, arranca Nest y finalmente el frontend. La base no publica ningún puerto; Nest tampoco. El único puerto publicado es `127.0.0.1:8282`. El volumen es `simulador-modern_postgres_data`. No ejecutar `docker compose down -v` sobre una instalación con datos que se quieran conservar.

## Datos

La extracción activa de `simula`, obtenida con consultas de lectura, coincidió en todas las filas con `simulador_db.sql`. Se importaron 11 usuarios, 8 granos, 22 máquinas y 2 escenarios. Los identificadores, hashes, fechas, decimales y JSON del historial se conservan. Los hashes PHP `$2y$` se verifican sin reescribirlos ni exigir contraseñas nuevas.

La importación acepta el JSON capturado o el volcado SQL. Para repetirla:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/migrate-data.ps1 -Source private/active-data.json
# Solo contraste, sin importación:
powershell -NoProfile -ExecutionPolicy Bypass -File tools/migrate-data.ps1 -Source private/active-data.json -VerifyOnly
```

Si se utiliza SQL, pasar su ruta `.sql` a `-Source`. La herramienta ejecuta los importadores TypeScript como el usuario sin privilegios de Nest, usando `/tmp` para datos e informes transitorios. La transacción inserta identificadores ausentes, conserva registros idénticos y **rechaza divergencias**; no sobrescribe la base original ni datos modificados en PostgreSQL. Ajusta las secuencias al máximo identificador. Después de empezar a usar la nueva versión, no utilizar el volcado antiguo como sincronización: cualquier diferencia exige revisar y preparar el delta. Antes del corte debe repetirse la extracción de origen y el contraste, pues el original sigue recibiendo escrituras.

`tools/export-original.php` es exclusivamente una herramienta transitoria de lectura ejecutada en el contenedor PHP original; no forma parte del runtime nuevo. `tools/capture-source.py` recopila referencias sin modificar el origen. No ejecutar la recaptura sobre fixtures revisadas sin conservarlas antes.

## Comprobación

```powershell
npm ci
npx prisma generate
npm run typecheck
npm test
npm run build
npx playwright install chromium
node tools/e2e.mjs
```

Las pruebas E2E usan la base nueva, crean usuarios de prueba y los eliminan al finalizar. La captura visual usa una sesión temporal del administrador importado. El navegador puede ejecutarse contra otra URL con `PREVIEW_URL`. Para desarrollar solo el frontend, `npm run dev:web` expone 5182 y utiliza la API paralela de 8282; la revisión visual final debe hacerse contra el frontend construido, que sirve sus fuentes locales. El desarrollo de Nest requiere acceso a PostgreSQL en la red Docker; la configuración principal no expone la base al host.

Consultar `docs/verificacion.md` y `docs/results/` para distinguir pruebas ejecutadas de limitaciones. Las matrices no cambian fórmulas, redondeos ni reglas de negocio del original.

## Operación, respaldo y restauración

```powershell
docker compose logs --tail 100 api
docker compose restart api web
powershell -NoProfile -ExecutionPolicy Bypass -File tools/backup.ps1 -Label manual
node tools/check-restore.mjs private/backups/<respaldo>/postgres.dump
```

El respaldo privado contiene `postgres.dump` en formato custom, `.env`, configuración del proxy y SHA-256. Protegerlo como los datos originales. La comprobación crea un PostgreSQL temporal sin red ni puertos, restaura el dump, compara todas las filas con la base nueva y elimina únicamente su contenedor temporal. Debe ejecutarse sin escrituras concurrentes para que el contraste sea estable.

Para recuperar una pérdida, arrancar una **base vacía separada** con PostgreSQL 16 y los mismos parámetros, copiar `postgres.dump` y ejecutar `pg_restore --exit-on-error -U simulador -d simulador /tmp/postgres.dump`. Verificar el contenido antes de conectar Nest a esa base. No restaurar sobre el volumen activo sin un respaldo previo y autorización para sobrescribirlo.

## Proxy y reversión del tráfico

`deployment/proxy-proposed.conf` conserva todas las reglas del proxy original y modifica solo el upstream de `app.simulador.local`: `host.docker.internal:82` pasa a `host.docker.internal:8282`. `/api` se resuelve en el Nginx del frontend hacia Nest: navegador y API comparten origen. La propuesta se validó primero sin cambiar el tráfico y se aplicó después de recibir la autorización del usuario.

**Solo después de aprobar el cambio de tráfico:**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/traffic-switch.ps1 -ApproveTrafficSwitch
```

La herramienta exige que el proxy no haya cambiado desde la copia inicial, verifica la versión paralela, reextrae el origen con SELECT y rechaza un delta sin revisar, crea un respaldo PostgreSQL nuevo, guarda la configuración anterior, ejecuta `nginx -t` y recarga. Si falla la validación, restaura el archivo anterior. Después comprobar login, simulación y `app.ibesweb.local`, además de las respuestas registradas para los otros servicios. Si el proxy cambió entretanto, revisar una propuesta nueva que conserve sus reglas.

Para revertir inmediatamente, sin eliminar contenedores ni datos:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/traffic-switch.ps1 -ApproveTrafficSwitch -Rollback -BackupPath C:\Produccion\simulador\modern\private\proxy-backup-<fecha>.conf
```

La reversión devuelve el tráfico a PHP en el puerto 82. Las escrituras hechas en PostgreSQL tras el corte permanecen allí: no existe sincronización bidireccional automática. Antes de volver al sistema antiguo debe decidirse cómo conservar esas escrituras. El PHP original, su base, XAMPP e ibesweb no se modifican ni eliminan.

## Corte autorizado realizado

Solo cambió `host.docker.internal:82` a `host.docker.internal:8282` dentro de la regla de `app.simulador.local`; las demás reglas permanecen idénticas. `nginx -t` y la recarga del proxy finalizaron correctamente. `node tools/check-cutover.mjs` comprueba el contenido persistente, las respuestas de los otros servicios, la API y la disponibilidad del original.

El archivo anterior tenía permisos de Windows que impedían sobrescribirlo. Se conservó como `C:\Produccion\nexust\proxy\default.conf.preserved-1791400708459` y se creó la propuesta en la misma ruta original. Se comprobó que el montaje de Nginx leía los mismos bytes antes de recargarlo. `tools/write-proxy.mjs` limita esta alternativa al montaje y archivos de proxy revisados.

Respaldo inmediatamente anterior: `private/backups/20261007-211827-pre-switch`. Configuración de reversión: `private/proxy-backup-20261007-211828.conf`. Para una reversión autorizada:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/traffic-switch.ps1 -ApproveTrafficSwitch -Rollback -BackupPath C:\Produccion\simulador\modern\private\proxy-backup-20261007-211828.conf
```

Las evidencias del corte están en `docs/results/cutover.json`. Las referencias originales ya capturadas se mantienen; las herramientas antiguas de captura visual que usan el dominio final requieren apuntar explícitamente al puerto 82 antes de volver a capturar el sistema PHP.
