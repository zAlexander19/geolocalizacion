-- Geolocalizacion Database Schema
-- PostgreSQL

-- Drop tables if exist (para desarrollo)
DROP TABLE IF EXISTS bathrooms CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS floors CASCADE;
DROP TABLE IF EXISTS buildings CASCADE;
DROP TABLE IF EXISTS faculties CASCADE;

-- Table: buildings
CREATE TABLE buildings (
    id_edificio SERIAL PRIMARY KEY,
    nombre_edificio VARCHAR(255) NOT NULL,
    acronimo VARCHAR(50),
    descripcion TEXT,
    imagen TEXT,
    cord_latitud DECIMAL(10, 8) DEFAULT 0,
    cord_longitud DECIMAL(11, 8) DEFAULT 0,
    estado BOOLEAN DEFAULT TRUE,
    disponibilidad VARCHAR(50) DEFAULT 'Disponible',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: floors
CREATE TABLE floors (
    id_piso SERIAL PRIMARY KEY,
    id_edificio INTEGER NOT NULL REFERENCES buildings(id_edificio) ON DELETE CASCADE,
    nombre_piso VARCHAR(255) NOT NULL,
    numero_piso INTEGER,
    imagen TEXT,
    codigo_qr TEXT,
    estado BOOLEAN DEFAULT TRUE,
    disponibilidad VARCHAR(50) DEFAULT 'Disponible',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: rooms
CREATE TABLE rooms (
    id_sala SERIAL PRIMARY KEY,
    id_piso INTEGER NOT NULL REFERENCES floors(id_piso) ON DELETE CASCADE,
    nombre_sala VARCHAR(255) NOT NULL,
    acronimo VARCHAR(50),
    descripcion TEXT,
    imagen TEXT,
    capacidad INTEGER DEFAULT 0,
    tipo_sala VARCHAR(100),
    cord_latitud DECIMAL(10, 8) DEFAULT 0,
    cord_longitud DECIMAL(11, 8) DEFAULT 0,
    estado BOOLEAN DEFAULT TRUE,
    disponibilidad VARCHAR(50) DEFAULT 'Disponible',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: bathrooms
CREATE TABLE bathrooms (
    id_bano SERIAL PRIMARY KEY,
    id_edificio INTEGER NOT NULL REFERENCES buildings(id_edificio) ON DELETE CASCADE,
    id_piso INTEGER NOT NULL REFERENCES floors(id_piso) ON DELETE CASCADE,
    identificador VARCHAR(50) NOT NULL,
    nombre VARCHAR(255),
    descripcion TEXT,
    capacidad INTEGER DEFAULT 0,
    imagen TEXT,
    tipo VARCHAR(10) CHECK (tipo IN ('h', 'm', 'mixto')),
    acceso_discapacidad BOOLEAN DEFAULT FALSE,
    cord_latitud DECIMAL(10, 8) DEFAULT 0,
    cord_longitud DECIMAL(11, 8) DEFAULT 0,
    estado BOOLEAN DEFAULT TRUE,
    disponibilidad VARCHAR(50) DEFAULT 'Disponible',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_edificio, id_piso, identificador)
);

-- Table: faculties
CREATE TABLE faculties (
    codigo_facultad VARCHAR(50) PRIMARY KEY,
    nombre_facultad VARCHAR(255) NOT NULL UNIQUE,
    descripcion TEXT,
    logo TEXT,
    id_edificio INTEGER REFERENCES buildings(id_edificio) ON DELETE SET NULL,
    estado BOOLEAN DEFAULT TRUE,
    disponibilidad VARCHAR(50) DEFAULT 'Disponible',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_floors_edificio ON floors(id_edificio);
CREATE INDEX idx_rooms_piso ON rooms(id_piso);
CREATE INDEX idx_bathrooms_edificio ON bathrooms(id_edificio);
CREATE INDEX idx_bathrooms_piso ON bathrooms(id_piso);
CREATE INDEX idx_faculties_edificio ON faculties(id_edificio);
CREATE INDEX idx_buildings_coords ON buildings(cord_latitud, cord_longitud);
CREATE INDEX idx_rooms_coords ON rooms(cord_latitud, cord_longitud);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updating timestamps
CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_floors_updated_at BEFORE UPDATE ON floors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bathrooms_updated_at BEFORE UPDATE ON bathrooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faculties_updated_at BEFORE UPDATE ON faculties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
