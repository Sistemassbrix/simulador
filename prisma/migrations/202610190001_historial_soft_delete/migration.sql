-- AlterTable: Agregar columnas para borrado suave y métricas de historial
ALTER TABLE "historial_simulaciones" 
ADD COLUMN IF NOT EXISTS "eliminado_por_usuario" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "eliminado_en" TIMESTAMPTZ(0);

CREATE INDEX IF NOT EXISTS "historial_simulaciones_usuario_eliminado_idx" 
ON "historial_simulaciones"("usuario_id", "eliminado_por_usuario", "creado_en");
