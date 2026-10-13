CREATE COLLATION IF NOT EXISTS legacy_es (provider = icu, locale = 'es-u-ks-level1', deterministic = false);
CREATE TABLE usuarios (
 id SERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL,
 usuario VARCHAR(50) COLLATE legacy_es NOT NULL UNIQUE,
 correo VARCHAR(100) COLLATE legacy_es NOT NULL UNIQUE,
 contrasena VARCHAR(255) NOT NULL, cedula VARCHAR(20) COLLATE legacy_es NOT NULL UNIQUE,
 cargo VARCHAR(255), creado_en TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE granos (id SERIAL PRIMARY KEY, nombre VARCHAR(100) COLLATE legacy_es NOT NULL UNIQUE);
CREATE TABLE maquinaria (id SERIAL PRIMARY KEY, nombre VARCHAR(100) COLLATE legacy_es NOT NULL UNIQUE, cuerpo VARCHAR(10), caudal_aire DECIMAL(10,2), holding DECIMAL(10,2));
CREATE TABLE historial_simulaciones (id SERIAL PRIMARY KEY, usuario_id INT NOT NULL, nombre_escenario VARCHAR(150), tipo VARCHAR(50), datos_json TEXT, creado_en TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX historial_simulaciones_usuario_id_creado_en_idx ON historial_simulaciones(usuario_id,creado_en);
CREATE TABLE sesiones (token_hash CHAR(64) PRIMARY KEY, usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, csrf CHAR(64) NOT NULL, vence_en TIMESTAMPTZ(0) NOT NULL);
CREATE INDEX sesiones_vence_en_idx ON sesiones(vence_en);
