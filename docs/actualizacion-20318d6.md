# Actualización desde simulad0

Fuente: [Luisfer112/simulad0](https://github.com/Luisfer112/simulad0), commit `20318d6b2c03c579af0a242662afc6884b2f722e` («Actualizaciones en impresión y simulación real»). La instalación PHP original partía de `8206926738b07b8702b92ae3dc8941e16b8c4403`, con modificaciones locales. Se comparó el árbol de trabajo realmente migrado, no solo ambos commits: numerosas incorporaciones del último commit ya estaban en ese árbol y en la aplicación Nest/React.

El usuario autorizó expresamente trasladar también los cambios de fórmulas. Esta actualización cambia resultados respecto de la migración inicial porque cambia la referencia funcional; no es una corrección inventada del modelo.

## Cambios incorporados

| Cambio del repositorio | Implementación nueva |
|---|---|
| Hasta cuatro pasos de calor | `engine/drying.ts`: `ceil(deltaHumedad / 3.5)`, mínimo 2 y máximo 4 |
| Reparto descendente de remoción | 2 pasos: 60/40%; 3: 45/35/20%; 4: 35/30/20/15% |
| Tiempo de calor revisado | `50 + min(round(tiempoCalc / 6), 10)`, limitado a 50–60 minutos; atempero y total conservan sus multiplicadores |
| Caudales precisos y capacidades de 22 modelos | Mismos valores decimales del JavaScript; holding = capacidad × densidad aparente / 1000 |
| Tabla teórica y tabla real en Tempero | Componentes React reciben ambas salidas de Nest; temperaturas, HR y tiempos reales dependen de la secadora seleccionada |
| Columnas de caudal/holding ocultas | Misma estructura y `display:none` de las nuevas vistas |
| Posición de psicrometría y números adimensionales | Vistas React trasladadas desde el HTML del commit, sin rediseño |
| Impresión Carta horizontal | Márgenes de 5 mm, primera columna de 210 px y mismos tamaños/espaciados compactos |
| Acceso sin pestañas | Se retiran los botones de alternancia como en la vista PHP nueva; el endpoint y formulario oculto de registro siguen existiendo |

Cosecha, usuarios, granos, maquinaria, historial y contratos PHP no tienen nuevos cambios funcionales respecto del árbol de referencia que ya habíamos migrado. Sus cambios del commit ya estaban incorporados localmente. No se importaron usuarios, contraseñas ni datos de inicialización del repositorio: se conserva la base PostgreSQL en uso. No hay cambios de esquema ni nuevas migraciones necesarias.

## Fidelidad y particularidades conservadas

La tabla real emplea exactamente los factores del repositorio: 0,05 para calor, 0,03 para atempero, multiplicador 1,5 para temperatura de aire de salida y límite del 60% para HR. Los tiempos reales se redondean por el factor de caudal y el calor queda limitado a 50–60 minutos. Se mantienen el orden de operaciones, redondeos, casos no finitos y locale del navegador.

El caudal real de cada fila usa `parseFloat(p.caudal) / caudalTotalCFM` tal como está en el commit, aunque esas magnitudes tienen unidades diferentes. La animación continúa con las seis etapas del repositorio, incluso cuando las tablas contienen cuatro pasos de calor. No se corrigen estas particularidades durante la actualización.

## Validación

`tests/fixtures/upstream-source.json` identifica la revisión y el método de captura. Se ejecutan las declaraciones del JavaScript fuente en una VM independiente del motor TypeScript, con un adaptador de salida sin cálculos y locale explícito. Se capturan 384 casos: 252 combinaciones de los seis granos, siete conjuntos normales/extremos, tres familias y ambos modos; otros 132 casos cubren ambos lados de los límites de caudal de los 22 modelos y las tres familias. Las entradas originales y sus fixtures permanecen en el respaldo privado anterior.

Se comparan textos y filas de ambas tablas con igualdad exacta, junto con datasets Chart.js. Los intermedios usan la tolerancia anterior `max(1e-12, abs(referencia)*1e-10)` y comprueban explícitamente NaN/Infinity. La suite suma 780 pruebas aprobadas, incluyendo los módulos sin cambios.

Las 126 entradas base sin datos personales se distribuyen en `tests/fixtures/drying-inputs.json`. Para volver a capturar las referencias, preparar una copia del repositorio en esa revisión, definir `REFERENCE_ROOT` con su ruta y ejecutar `npx tsx tools/capture-upstream-drying.ts` seguido de `npx tsx tools/capture-intermediates.ts`. No se necesita el ZIP privado anterior. Las pruebas normales usan las fixtures distribuidas y no requieren PHP, GitHub ni acceso meteorológico externo.

La vista previa se construye con `compose.upstream-preview.yaml` en el puerto 8283, sin modificar la regla de Nginx. Las pruebas de navegador incluyen selección AXL, cuatro pasos, tablas teórica/real e impresión en PDF Carta horizontal, además de los recorridos previos. `tools/visual-upstream.mjs` compara las tres pantallas modificadas en escritorio y móvil con las vistas HTML y JavaScript del commit; esa referencia no ejecuta PHP ni consulta una base original.

La compilación publicada superó 47 comprobaciones de navegador en la vista previa. Las seis vistas medidas no presentaron diferencias geométricas superiores a 0,5 píxeles ni diferencias de tipografía/espaciados. Se corrigió el dimensionado del lienzo para medir el contenedor como el JavaScript fuente, en lugar de reutilizar la altura fija capturada para la versión anterior. El PDF de impresión tiene MediaBox de 792×612 puntos (Carta horizontal); no se ha probado una impresora física.

La misma imagen comprobada se publicó en `http://app.simulador.local/` el 8 de octubre de 2026. Docker Compose arrancó correctamente, sin migraciones pendientes. La comprobación del proxy conserva todas las reglas y respuestas anteriores de los otros dominios. Los informes finales están en `docs/results/upstream-update.json`, `upstream-visual.json` y `e2e.json`.

## Respaldo y reversión de esta actualización

Código previo: `private/update-20318d6/source-before.zip`. Datos/configuración previos: `private/backups/20261008-223609-upstream-20318d6-before`. Imágenes previas: `simulador-modern-api:before-20318d6` y `simulador-modern-web:before-20318d6`. Estas copias son privadas.

Se creó también un respaldo inmediatamente anterior a la publicación: `private/backups/20261008-224939-upstream-20318d6-predeploy`.

Para revertir únicamente el código de esta actualización, con autorización para ello:

```powershell
docker image tag simulador-modern-api:before-20318d6 simulador-modern-api:1.0.0
docker image tag simulador-modern-web:before-20318d6 simulador-modern-web:1.0.0
docker compose up -d --no-build
```

No se necesita restaurar la base porque esta actualización no modifica el esquema ni reimporta registros. No ejecutar los importadores antiguos como sincronización de una base que ya recibe escrituras. La configuración del proxy, PHP/MySQL original e ibesweb no se modifican para esta actualización.
