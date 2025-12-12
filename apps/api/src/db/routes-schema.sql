-- Tabla de rutas/caminos importados desde OSM
CREATE TABLE IF NOT EXISTS rutas (
  id_ruta SERIAL PRIMARY KEY,
  osm_id BIGINT UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(100) NOT NULL, -- 'footway', 'path', 'corridor', 'highway', etc.
  coordinates JSONB NOT NULL, -- Array de coordenadas [{lat, lon}, {lat, lon}, ...]
  superficie VARCHAR(50), -- 'asphalt', 'concrete', 'gravel', 'unpaved', etc.
  ancho VARCHAR(20), -- Width in meters
  acceso VARCHAR(50) DEFAULT 'yes', -- 'yes', 'no', 'private', 'permissive', etc.
  interior BOOLEAN DEFAULT FALSE, -- Si es un pasillo/ruta interior
  nivel VARCHAR(10), -- Nivel/piso donde está la ruta (si es interior)
  estado BOOLEAN DEFAULT TRUE,
  created_from_osm BOOLEAN DEFAULT FALSE,
  imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  eliminado BOOLEAN DEFAULT FALSE,
  fecha_eliminacion TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_rutas_osm_id ON rutas(osm_id);
CREATE INDEX IF NOT EXISTS idx_rutas_tipo ON rutas(tipo);
CREATE INDEX IF NOT EXISTS idx_rutas_interior ON rutas(interior);
CREATE INDEX IF NOT EXISTS idx_rutas_estado ON rutas(estado);
CREATE INDEX IF NOT EXISTS idx_rutas_eliminado ON rutas(eliminado);
CREATE INDEX IF NOT EXISTS idx_rutas_coordinates ON rutas USING GIN(coordinates);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_rutas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rutas_updated_at_trigger
BEFORE UPDATE ON rutas
FOR EACH ROW
EXECUTE FUNCTION update_rutas_updated_at();

-- Comentarios descriptivos
COMMENT ON TABLE rutas IS 'Tabla para almacenar rutas, caminos y senderos importados desde OSM';
COMMENT ON COLUMN rutas.osm_id IS 'ID único del elemento en OpenStreetMap';
COMMENT ON COLUMN rutas.coordinates IS 'Array de coordenadas que definen el trazado de la ruta';
COMMENT ON COLUMN rutas.superficie IS 'Tipo de superficie del camino';
COMMENT ON COLUMN rutas.interior IS 'Indica si es una ruta interior (pasillo dentro de edificio)';
COMMENT ON COLUMN rutas.nivel IS 'Piso o nivel donde se encuentra la ruta (para rutas interiores)';
