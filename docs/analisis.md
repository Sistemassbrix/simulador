# Análisis de la aplicación original — 7 de octubre de 2026

Origen: `C:\xampp\htdocs\simulador`, copia del árbol de trabajo real en `reference/` (privada, excluida de Git). No se encontró AGENTS.md al buscar en los árboles de Produccion y htdocs. El estado Git se conserva en original-git-status.txt. Hay 18 modificaciones, una eliminación y archivos nuevos; no se ha restaurado ni cambiado ninguno.

## Pantallas y operaciones

El router index.php selecciona controller/action en query y POST. Login por usuario **o cédula**, contraseña PHP bcrypt ($2y$), registro público con nombre, usuario, correo, cédula, cargo y contraseña. El formulario permite Administrador en registro: es una regla existente y un defecto de seguridad pendiente de decisión, no se elimina durante esta migración.

La navegación muestra siempre Tempero, Recirculación, Cosecha, Usuarios, Granos y Maquinaria. El usuario y cargo figuran en la cabecera y hay cierre de sesión. Historial tiene ruta propia y también tablas embebidas en las simulaciones. No hay paginación ni ordenamiento interactivo de catálogos: usuarios y granos se ordenan por id descendente; maquinaria por id ascendente; historial por fecha descendente. Todos los autenticados pueden leer catálogos; solo cargo exactamente Administrador puede guardar y eliminar usuarios/granos/maquinaria. No se puede borrar la cuenta propia. El historial se restringe al propietario, incluso al eliminar.

Usuarios: CRUD y validación de campos obligatorios, unicidad de usuario/correo/cédula, contraseña obligatoria al crear y opcional al editar, cargos personalizados preservados como opciones al editar. Granos: CRUD de nombre único. Maquinaria: CRUD de nombre, cuerpo, caudal_aire y holding; solo nombre obligatorio en servidor, conversiones floatval para números. No hay relaciones entre catálogos y simulaciones en el esquema SQL. Historial guarda texto JSON de resultados y campos visibles, no un escenario ejecutable completo; ver detalles lo recupera en un modal. Exportaciones: historial CSV/PDF mediante jsPDF+autotable, impresión de simulaciones y CSV diario/horario de cosecha.

## Motor visible (JavaScript)

assets/js/simulador.js es el motor efectivamente utilizado por las vistas Dashboard y Recirculación. No llama al cálculo PHP. Ambas vistas comparten los resultados; Recirculación filtra la tabla para mostrar únicamente Calor. Seis juegos de constantes: arroz, maíz, trigo, sorgo, cebada, soya. Los granos del catálogo SQL **no** determinan esos parámetros. Las secadoras recomendadas son 22 caudales codificados en JavaScript, no la tabla editable maquinaria; holding mostrado es caudal/4200, no holding SQL. Se conserva esta separación.

Valores iniciales de Tempero: arroz, límite 43 °C, densidad 580 kg/m³, humedad 22→13 % base húmeda, meta 250 t/día, velocidad 15 m/s, ambiente 25 °C, HR 85 %, altitud 15 m, eficiencia fija 0.5. Revisar los valores particulares de Recirculación en su plantilla preservada. Cambiar grano sustituye límite y densidad, conserva los otros campos y recalcula. Cualquier entrada recalcula, salvo búsqueda de ciudad; velocidad solo actualiza adimensionales en el original.

Agua kg/t = (M0−Mf)/(100−Mf)*1000; agua diaria t = meta*aguaPorTon/1000; producción seca=meta−agua. Energía MJ = agua_t*1000*hfg/1000/eficiencia. **El indicador rotulado kWh divide MJ entre 3.6 y entre 24**; se conserva su valor y etiqueta aunque la unidad merece revisión. Diésel L/día=MJ/38.6. La presión usa 101.325*(1−0.0000225577*altitud)^5.2559; densidad=P*1000/[287.05*(Tamb+273.15)]. Equilibrio modifica RH al rango .01–.99 y usa E−F*ln[−(T+C)*ln(RH)], por 100, mínimo 1 %; calentamiento usa Tetens. Bulbo húmedo usa la expresión Stull del código.

Pases=ceil((M0−Mf)/3.5), restringido a 2–3, caídas iguales. Aire primer pase=límite+20 °C, luego −4 °C/pase. Page t=60*[−ln(MR)/k]^(1/n), MR mínimo .01. Primer tiempo restringido a 50–55 min; siguientes suben 2–6 min y máximo 60. Atempero redondeado=3.2*tiempoCalor. **Total informado=round(sumaCalor*3.5)+45**, distinto de sumar las etapas; no se corrige. Caudal de cada pase=(aguaDiaria*fracciónCaída*1000/24*hfg/eficiencia)/[1.006*(Taire−Tamb)]/rhoAire. La temperatura de grano interpola entre bulbo húmedo y límite según fracción evaporada, con límites exactamente como en el original. Enfriamiento 45 min, sin caída de humedad.

AX y AXL: primer caudal suficiente por familia, o mayor de familia si ninguno alcanza. Inferior: máximo menor que caudal requerido, o mínimo del catálogo. Producción real escala meta por caudalMáquina/caudalNecesario. Curva Gordon–Taylor desde humedad 10 a 25 en pasos .5 y puntos de calor/enfriamiento. Chart.js conserva datasets, colores, escalas y etiquetas. Adimensionales Sc, Re, Nu, Sh, Bi y NT usan constantes y orden original. Animación canvas de SC/TS/DB/SA, seis etapas, pausa, reinicio y baches según producción real; es una representación de flujo con porcentajes 50/78/100, distinta de los pases iguales del cálculo.

Redondeos: JS toFixed (0,1,2,3 decimales según campo), Math.round y toLocaleString para caudales/energía. Las comparaciones requieren cadenas visibles exactas y números intermedios con tolerancia 1e−10 relativa/1e−12 absoluta, porque se conserva orden y motor IEEE754. No sustituir métodos de redondeo por redondeo comercial uniforme.

Límites observados: humedad final 100 divide entre cero; iguales producen 0/0 en caudales; humedad inicial inferior puede producir resultados negativos/NaN; aire ≤Tamb y altitudes/temperaturas imposibles pueden invalidar el modelo. Se documentarán los resultados originales antes de decidir si bloquearlos. No se cambia ninguna fórmula para ocultar esos casos.

## Cálculo PHP independiente

models/Simulador.php, POST simulador/procesar: meta por **hora**, defaults 24→14 %, 5 t/h, 28.5 °C, HR65 %, 500m, eficiencia85 y operatividad.85. Acepta eficiencia .5 o50 y coma decimal; <=0 pasa a1. Energía diaria con hfg y eficiencia, cuatro caídas calor 27/26/25/22 % y enfriamiento min(1,.1*diferencia). Propiedades específicas solo arroz/maíz blanco/maíz/soya, resto usa arroz. Number_format de PHP produce cadenas y comas en pasos. Este contrato debe migrarse además del motor visible: no fusionarlos.

## Cosecha e integraciones

Open-Meteo geocoding (es, 5 resultados en secado y 6 en cosecha), archive con temperature_2m, relative_humidity_2m, direct_normal_irradiance horarios y temperaturas/precipitación diarias; periodo final fijo **2025**, inicio=2025−años+1. Timeout archive12s; errores o respuesta vacía aplican el modelo sintético determinista codificado, sin cambiar de proveedor. Ciudades frecuentes venezolanas (cinco sugerencias iniciales), coordenadas a4 decimales y altitud redondeada; correcciones existentes Acarigua195m/Medellín1495m. Selección manual lat/lon/altitud. Simulador también consulta perfiles de pronóstico diario y muestra selección de clima local.

Cosecha filtra meses (todos/ninguno/seca/lluvia), franjas con cruce de medianoche, agrega día por mes-día entre años, perfil de24h con datos no nulos; ausencia de muestras horarias usa28°C/65%. Déficit psicrométrico con exponentes particulares 5.25588 (no unificarlos con secado). Weibull con media, varianza muestral, k=(desv/media)^−1.086, fallback1.8 y máximo15; Gamma Lanczos; redondeos k/c a2 y estadísticas a1, PDF utiliza valores sin redondear. Menos de5 registros: constantes de fallback originales. Cuatro recomendaciones: franja, moda/P50, P10/P90 crítico, promedio24h; transferencia a Tempero mediante URL. Aptitud, etiquetas de riesgo y CSV dependen de franja y HR. Gráficos horario, Weibull temperatura/HR y serie temporal, modo pestañas/cuadrícula, filtros día/mes y confirmación al simular día/hora. Clima actual muestra temperatura, HR y presión; conexión fallida muestra error.

## Defectos originales y tratamiento separado

- HistorialController::limpiar existe pero index.php no lo enruta: botón actual no completa la operación. La versión nueva conecta el controlador existente y conserva su alcance por propietario; reparación de enrutamiento documentada, sin cambiar cálculos ni reglas de negocio.
- Registro público concede Administrador elegido por el usuario.
- NaN/Infinity y resultados negativos sin validación física.
- Unidades/total de tiempo inconsistentes descritos arriba.
- Interpolación de nombres/JSON sin escape en varias tablas/modales (el render React escapará texto sin cambiar las operaciones).
- Catálogos editables no alimentan el motor; nombres y constantes pueden divergir.

## Despliegue y datos

Contenedor original simulador-app PHP8.2, puerto loopback82. Proxy nexust-proxy nginx, red nexust-net, regla app.simulador.local→host.docker.internal:82. Reglas restantes: app/db/api.nexust.com, app.ibesweb.local, ollama.nexust.com, hikvision.nexust.com; se conservará su contenido literal al proponer el cambio. Nueva versión puerto paralelo distinto, PostgreSQL sin puerto publicado y volumen propio. No se tocará proxy hasta aprobación final.

Volcado fecha2026-09-28: granos8, maquinaria22, usuarios11, historial2, sin FKs. Exportación activa obtenida mediante SELECT en transacción y zona UTC; comparar filas y esquema antes de elegir fuente. Historial conserva TEXT JSON byte a byte; fechas UTC, decimal(10,2), ids/secuencias. bcrypt $2y$ se verifica con bcryptjs sustituyendo únicamente el prefijo de verificación por $2b$, sin alterar hashes almacenados. Respaldo privado fuera de Git; no se publican contraseñas ni datos personales en documentación.

## Inventario de equivalencia y comprobación

|Actual|Nueva implementación|Comprobación necesaria|
|---|---|---|
|Login/registro/cierre|Auth Nest + sesión persistente cookie HttpOnly + CSRF|E2E credenciales, cédula, errores, cookies, sesión revocada|
|Usuarios/cargos|Módulo usuarios Prisma y formulario React|CRUD, unicidad, edición sin contraseña, permisos, autocuenta|
|Granos|Módulo granos Prisma y formulario React|CRUD y permisos; no cambia motor|
|Maquinaria|Módulo maquinaria Prisma y formulario React|CRUD, precisión decimal y permisos|
|Tempero|Motor TypeScript aislado + React plantilla fiel|Matrices por6 granos y3 familias, intermedios y texto exacto|
|Recirculación|Mismo motor con filtro de etapas|Mismos resultados y filas calor únicamente|
|API calcular PHP|Función TypeScript independiente|Fixture PHP mediante ejecutable original vsTS|
|Curva vítrea y gráficos|Chart.js4 y configuraciones originales|Datasets, escalas, tooltip y screenshots|
|Animación|Canvas con ciclo React|Inicio/pausa/reinicio, lotes y etapas|
|Cosecha/Weibull|Motor cosecha Nest y controles React|Datos reales capturados, sintéticos, franjas/meses, percentiles|
|Geocoding/forecast/archive|Módulo clima con URLs permitidas|Éxito, timeout, respuesta vacía y fallback original|
|Historial propietario|Prisma TEXT + tabla/modal React|Guardar/listar/detalles/eliminar y aislamiento|
|CSV/PDF/impresión|Exportadores React conservando contenido|Contenido, nombres, PDF extraíble y print desktop|
|Visual/responsive|CSS original preservado y componentes React|Capturas originales/nuevas desktop y móvil|
|Datos|Importador transaccional idempotente|Conteos, filas completas, secuencias, huérfanos|
|Compose y coexistencia|Servicios propios y propuesta proxy|Health, reinicio, ibesweb y dominios restantes|

Este inventario expresa requisitos de comprobación, no declara esas pruebas ya superadas. Los resultados ejecutados se registran por separado.


Actualización final: la base activa y el dump coinciden en todos los campos (43 registros). Se conserva la fuente activa. La ruta directa de historial tenía también una ruta JS duplicada que impedía cargar sus datos: React conecta la operación prevista. Ambas reparaciones se distinguen de la equivalencia matemática. Registro público Administrador, constantes independientes de catálogos, unidades peculiares y casos NaN/Infinity permanecen sin alterar.
