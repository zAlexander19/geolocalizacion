
-- Table: totems
CREATE TABLE totems (
    id_totem SERIAL PRIMARY KEY,
    nombre_totem VARCHAR(255) NOT NULL,
    descripcion TEXT,
    imagen TEXT,
    cord_latitud DECIMAL(10, 8) DEFAULT 0,
    cord_longitud DECIMAL(11, 8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
