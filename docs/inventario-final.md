# Inventario final

|Función original|Implementación|Comprobación ejecutada|
|---|---|---|
|Acceso usuario/cédula, registro, cargo, cierre|React y módulo Auth Nest, cookies HttpOnly y CSRF|Inicio/cierre desde formularios; registro por endpoint conservado; pestañas retiradas como en el commit 20318d6; contraseña incorrecta; sesión revocada; CSRF|
|Usuarios y cargos personalizados|UsuariosModule, Prisma, modal React|Crear/leer/editar sin cambiar contraseña/eliminar; protección de cuenta propia; cargo personalizado|
|Permisos de catálogo|Guards Nest y controles React|Administrador escribe; Operador lee y recibe403 al escribir; botones ocultos|
|Granos|GranosModule y formulario React|CRUD por API y CRUD completo desde formulario con diálogos originales|
|Maquinaria, Secadoras/Transportadores|MaquinariaModule, categorías y modal React|CRUD y precisión decimal; pantalla Transportadores conserva “Próximamente”|
|Tempero y selección AX/AXL/inferior|Motor TypeScript actualizado desde el commit autorizado 20318d6|384 casos de ambos modos y límites de los 22 modelos; salidas, tablas teórica/real y datasets exactos|
|Valores internos del secado|Diagnóstico opcional del mismo motor, solo usado en pruebas|384 referencias del JavaScript actualizado: psicrometría, energía, caudal, reparto y etapas|
|Recirculación|Motor común y filtro de etapas|Entre dos y cuatro filas de calor según entradas; tres con los valores iniciales; comparación con el nuevo repositorio y navegador|
|Contrato PHP alternativo|Motor legacy TypeScript separado|51 entradas ejecutadas en PHP original y comparadas con TypeScript|
|Curva vítrea, series, etiquetas, tooltip|Chart.js y callbacks originales|Datasets exactos, revisión de pantallas y estabilidad del gráfico durante animación|
|Animación SC/TS/DB/SA|Canvas controlado por React|Inicio, pausa y reinicio en navegador; seis etapas, llenado, velocidades y geometría trasladados|
|Cosecha, aptitud, Weibull y franjas|ClimateModule y motor harvest TypeScript|18 casos sintéticos/datos horarios de referencia; estadísticas, datos internos y gráficos; meses secos, cruce nocturno y cuadrícula en navegador|
|Búsqueda y clima actual/perfiles/histórico|Open-Meteo desde Nest|Integraciones reales: ciudades, actual,6 perfiles y366 días/24 horas; mocks de éxito, error, timeout y respuesta vacía|
|Recomendaciones y transferencia a Tempero|Estado React y mismos parámetros URL|Weibull transfiere temperatura/HR, altitud y origen; formularios y cálculos reaccionan|
|Historial y recuperación|HistorialModule, propietario de sesión, TEXT JSON|Guardar/listar/modal/eliminar; rechazo efectivo de borrado ajeno; limpiar mantiene datos ajenos|
|Exportación CSV diario/horario e historial|Exportadores React|Descargas reales con encabezados y contenido; nombre conservado|
|PDF historial|jsPDF y AutoTable corregidos|PDF real generado, mismo título, tabla y contenido; versiones nuevas de biblioteca|
|Impresión|Reglas del commit 20318d6 y acción `window.print`|Carta horizontal, márgenes 5 mm, columna 210 px y tablas compactas; PDF de impresión comprobado en Chromium; sin impresora física|
|Visual y responsive|Plantillas React, CSS original y shadcn adaptado|Capturas simultáneas y geometría de7 pantallas en1440×1000 y390×844; referencias privadas|
|Datos y restricciones|Prisma/PostgreSQL, ICU, importador transaccional|43 filas, todos los campos, identificadores, hashes, secuencias y cero huérfanos; segunda importación no duplica|
|Despliegue paralelo|Docker Compose, Node/Nest, PostgreSQL y Nginx web|Compilación, health checks, migración al arrancar, reinicio y versión servida en8282|
|Proxy y coexistencia|Una sola sustitución autorizada de upstream|`nginx -t`, recarga y dominio final comprobados; solo cambia el upstream del simulador; ibesweb y otros dominios conservan sus respuestas|
|Respaldo y reversión|Dump PostgreSQL custom, ZIP origen y scripts PowerShell|Restauración aislada con comparación de todos los campos; respaldo anterior al corte conservado; corte autorizado ejecutado; reversión preparada|

La migración inicial no añadió funcionalidades de producto. La actualización 20318d6 incorpora las nuevas tablas y comportamientos del repositorio solicitado. La pantalla de Transportadores permanece pendiente en los mismos términos del original. El historial original recupera datos en un modal; no disponía de una reconstrucción completa de entradas ejecutables, por lo que no se añade una operación nueva de reejecución.

En la migración inicial se repararon separadamente dos defectos de conexión: carga del historial en su ruta propia y enrutamiento de la operación `limpiar` que ya existía. La actualización 20318d6 incorpora los cambios matemáticos del repositorio con autorización expresa del usuario; su alcance y particularidades están en `actualizacion-20318d6.md`. Se conserva el contrato de registro que permite elegir Administrador, aunque el repositorio retira sus pestañas públicas. Los catálogos siguen siendo independientes del motor y se mantienen las unidades particulares y resultados no finitos en casos extremos.

El usuario autorizó el cambio de tráfico y `app.simulador.local` ya sirve la nueva aplicación. La fuente activa se contrastó de nuevo antes del corte, se respaldaron los datos y el proxy pasó su validación y recarga. La comprobación posterior confirma que solo cambió el upstream del simulador y que ibesweb y los otros servicios conservan sus respuestas previas. El original permanece intacto y disponible en el puerto 82. La reversión real no se ha ejecutado; su procedimiento y respaldo siguen preparados.
