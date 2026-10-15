-- Migración para registrar al usuario Ricardo Ghisays
INSERT INTO usuarios (id, nombre, usuario, correo, contrasena, cedula, cargo, creado_en)
VALUES (
  12,
  'Ricardo Ghisays',
  'ricardo',
  'ricardo@superbrix.com',
  '$2y$10$WmTyL7gGNfY0LLafJdpQ4.Lg8ix.bmq/C8kfNt17s6CRTuhOxLCqG',
  '888881',
  'Ceo Comercial y tecnologia',
  '2026-09-30 13:44:56+00'
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('usuarios_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM usuarios), (SELECT last_value FROM usuarios_id_seq)));
