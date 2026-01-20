
-- Update users role check constraint and add id_usuario to totems
BEGIN;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('admin_primario', 'admin_secundario', 'totem'));

ALTER TABLE totems ADD COLUMN IF NOT EXISTS id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE;
ALTER TABLE totems ADD CONSTRAINT unique_totem_usuario UNIQUE (id_usuario);

COMMIT;
