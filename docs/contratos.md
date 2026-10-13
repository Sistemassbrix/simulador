# Arquitectura y contratos

El navegador mantiene estado de formularios, navegación y animación. Nest valida y transforma explícitamente entradas con Zod, calcula los resultados definitivos y accede a Prisma. Los motores TypeScript no consultan bases, redes ni DOM: `OutputBuffer` recoge las celdas formateadas y configuraciones Chart.js del contrato visual original.

El prefijo de todas las rutas es `/api`. JSON de éxito: `{status:'success',data:...}`; errores: `{status:'error',message:...}`. Las operaciones heredadas conservan sus mensajes y algunos errores de negocio mantienen `status:error` con HTTP 201; el cliente comprueba ambas cosas. Validación estructural HTTP400, sesión401, permiso/CSRF403, duplicado409, inexistente404 e integración502. El contrato PHP alternativo conserva la clave `resultados`.

|Ruta|Método y entrada|Respuesta y autorización|
|---|---|---|
|`auth/csrf`|GET|Token CSRF previo a sesión, cookie HttpOnly|
|`auth/login`|POST usuario,password|Cuenta y CSRF; usuario o cédula y contraseña bcrypt|
|`auth/register`|POST nombre,usuario,correo,cedula,cargo,password|Registro público, mismas opciones de cargo|
|`auth/me`|GET|Identidad y CSRF de sesión|
|`auth/logout`|POST `{}`|Revoca la sesión en PostgreSQL y elimina cookie|
|`usuarios`, `granos`, `maquinaria`|GET; GET `/:id`|Lectura autenticada; no devuelve hashes|
|Cada catálogo `/guardar`|POST campos; id opcional|Crear/editar solo Administrador; contraseña vacía al editar conserva hash|
|Cada catálogo `/eliminar`|POST id|Solo Administrador; impide eliminar cuenta propia|
|`historial`|GET|Escenarios del usuario, fechas descendentes|
|`historial/guardar`|POST nombre,tipo,datos_json|Valida JSON; propietario tomado de sesión|
|`historial/eliminar`|POST id|Elimina únicamente si pertenece a la sesión|
|`historial/limpiar`|POST `{}`|Limpia únicamente el historial de la sesión|
|`simulacion/granos`|GET|Constantes de los seis granos originales|
|`simulacion`|POST parámetros de formulario, mode,machine,locale|Celdas formateadas, tablas, gráficos y detalles calculados en Nest|
|`simulacion/procesar`|POST parámetros del modelo PHP|Modelo independiente y `resultados` PHP equivalente|
|`clima/ciudades`|GET q,contexto opcional|Open-Meteo: cinco sugerencias en secado, seis en cosecha|
|`clima/actual`|POST latitud,longitud|Forecast actual; errores explícitos|
|`clima/perfiles`|POST latitud,longitud|Clima actual, cuatro perfiles por índices y promedio histórico2025|
|`clima/cosecha/inicial`|POST formulario,months,franja,filtros|Modelo sintético inicial original|
|`clima/cosecha`|POST mismo contrato|Archive hasta2025; fallback sintético en error/vacío|

`simulacion`: tipoGrano arroz/maiz/trigo/sorgo/cebada/soya; tempLimiteGrano,densidadAparente,humedadInicial,humedadObjetivo,metaSecado,velocidadAire,tempAmbiente,hrAmbiente,altitud,eficienciaTermica numéricos finitos; mode dashboard/recirculacion; machine ax/axl/menor. Locale conserva la presentación de números del navegador. No se añaden restricciones físicas que cambien los casos límite originales.

`clima/cosecha`: latitud [-90,90], longitud [-180,180], altitud_clima, anios_historicos entero1..10, buscar_ciudad, months1..12, franja `{tipo,nombre,horaInicio,horaFin}` horas0..23 y filtros `filtro-tabla-dia`, `filtro-tabla-mes`. Meses vacíos desde interfaz equivalen a los doce meses. Variables meteorológicas y URLs de los proveedores están fijadas en el servidor; el cliente no proporciona URLs externas. Cache de archive1h y timeout12s.

La sesión tiene token aleatorio, solo SHA-256 guardado, caducidad por inactividad configurable (24min por defecto, equivalente a los1440s de PHP; se renueva al acceder), cookie de sesión de navegador HttpOnly/SameSite=Lax y CSRF por sesión. Login/registro también tienen CSRF previo; escrituras comprueban origen cuando se suministra. `COOKIE_SECURE=false` responde a la URL HTTP solicitada; usar true si el proxy se publica por HTTPS. Las sesiones PHP abiertas no se transfieren: las contraseñas existentes sí permiten entrar en la nueva aplicación.

PostgreSQL conserva identificadores, restricciones únicas, caracteres, `decimal(10,2)`, fechas UTC y historial TEXT. Collation ICU `legacy_es` conserva comparación de unicidad sin distinguir mayúsculas/acentos. Historial no obtiene una FK nueva contra usuarios porque el original admite datos históricos huérfanos al eliminar cuentas. La tabla de sesiones sí tiene relación con borrado en cascada.
