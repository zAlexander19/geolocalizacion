# Optimización de Tarjeta de Información de Edificios

## Cambios Realizados

### 1. Nuevo Componente: `BuildingDetailsModal.jsx`

Se creó un componente modal optimizado que evita la carga simultánea de múltiples imágenes. El componente funciona en tres niveles y se puede usar tanto en la página pública como en el admin:

#### Nivel 1: Vista del Edificio
- Muestra la **imagen del edificio** en la parte superior
- Lista todos los **pisos** del edificio con botones "VER PISO"
- **Solo carga 1 imagen** (la del edificio)

#### Nivel 2: Vista del Piso (Carrusel de Salas)
- Al hacer clic en "VER PISO", se muestra un carrusel de las salas
- Muestra **una sala a la vez** con su imagen
- Botones de navegación (anterior/siguiente) para deslizar entre salas
- **Solo carga 1 imagen a la vez** (la sala actual)
- Contador de salas (ej: "Sala 2 de 5")
- Botón "Volver a pisos" para regresar

#### Nivel 3: Información de la Sala
- Nombre de la sala
- Acrónimo
- Tipo (Aula/Laboratorio)
- Capacidad
- Estado (Activa/Inactiva)
- Disponibilidad

### 2. Integración en `HomePage.jsx` (Página Pública)

- Se importó el nuevo componente `BuildingDetailsModal`
- Se reemplazó el modal anterior (que cargaba todas las imágenes simultáneamente) por el nuevo componente optimizado
- Se eliminaron funciones y estados obsoletos:
  - `floorRoomCarousels` - Ya no se necesita
  - `selectedFloorImage` - Ya no se necesita
  - `floorImageOpen` - Ya no se necesita
  - `getRoomsForFloor()` - Ya no se necesita
  - `handleCarouselChange()` - Ya no se necesita
  - Query `buildingFloors` - El componente maneja sus propias queries

### 3. Integración en `BuildingsPage.jsx` (Página Admin)

- Se agregó un botón "Ver más" (ícono de ojo) en la tabla de edificios
- Integración del nuevo componente `BuildingDetailsModal`
- Estados para controlar la apertura del modal y el edificio seleccionado

### 4. Nuevo Endpoint en el Backend

Se agregó el endpoint `/floors/:id/rooms` en `apps/api/src/app.js`:

```javascript
app.get('/floors/:id/rooms', (req, res) => {
  const db = loadDB()
  const id = Number(req.params.id)
  const rooms = (db.rooms || []).filter(r => Number(r.id_piso) === id)
  res.json({ data: rooms })
})
```

## Ventajas de Rendimiento

1. **Carga Progresiva**: Las imágenes se cargan solo cuando se necesitan
2. **Una Imagen a la Vez**: En el carrusel de salas, solo se muestra una imagen simultáneamente
3. **Lazy Loading**: Las salas de un piso solo se cargan cuando se hace clic en "VER PISO"
4. **Optimización de Memoria**: No se cargan todas las imágenes de todos los pisos y salas al mismo tiempo
5. **Código Reutilizable**: El mismo componente se usa en la página pública y en el admin
6. **Menos Estado**: Se eliminaron estados y funciones innecesarias

## Cómo Usar

### En la Página Pública (HomePage)

1. Busca un **edificio** usando el buscador
2. Haz clic en el botón **"Ver más"** en la tarjeta del edificio
3. Se abrirá el modal mostrando:
   - La imagen del edificio
   - Lista de pisos con botón "VER PISO"
4. Haz clic en **"VER PISO"** para ver las salas
5. Usa las flechas **←** y **→** para navegar entre las salas
6. Haz clic en **"Volver a pisos"** para regresar a la lista de pisos
7. Cierra el modal con el botón **X** en la esquina superior derecha

### En el Admin (BuildingsPage)

1. En la página de **Edificios**, selecciona un edificio del filtro
2. Haz clic en el ícono de **ojo** (Ver más) en la columna de acciones
3. El comportamiento es idéntico al de la página pública

## Estructura del Diseño

```
┌─────────────────────────────────────┐
│  Nombre del Edificio            [X] │
├─────────────────────────────────────┤
│                                     │
│      [Imagen del Edificio]          │
│                                     │
├─────────────────────────────────────┤
│  PISOS Y SALAS                      │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ PISO 1                        │  │
│  │ Número de piso: 1             │  │
│  │                   [VER PISO]  │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ PISO 2                        │  │
│  │ Número de piso: 2             │  │
│  │                   [VER PISO]  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘

Al hacer clic en "VER PISO":

┌─────────────────────────────────────┐
│  Piso 1                         [X] │
├─────────────────────────────────────┤
│  ← Volver a pisos                   │
│  Sala 1 de 3                        │
├─────────────────────────────────────┤
│      ┌─────────────────────┐        │
│  [←] │ [Imagen de la Sala] │  [→]   │
│      └─────────────────────┘        │
│                                     │
│  Sala A-101                         │
│  Chips: [A101] [Aula] [Activa]      │
│  Capacidad: 30 personas             │
└─────────────────────────────────────┘
```

## Archivos Modificados/Creados

- ✅ `apps/web/src/components/BuildingDetailsModal.jsx` (nuevo - componente reutilizable)
- ✅ `apps/web/src/features/public/HomePage.jsx` (optimizado - eliminado código innecesario)
- ✅ `apps/web/src/features/admin/buildings/BuildingsPage.jsx` (modificado - integración del modal)
- ✅ `apps/api/src/app.js` (nuevo endpoint agregado)

## Antes vs Después

### Antes ❌
- Se cargaban **todas las imágenes** de todos los pisos y salas simultáneamente
- Carrusel mostraba **3 salas a la vez** (3 imágenes cargadas)
- Código duplicado entre página pública y admin
- ~300+ líneas de código modal en HomePage

### Después ✅
- Solo se carga **1 imagen del edificio** inicialmente
- Carrusel muestra **1 sala a la vez** (1 imagen)
- Componente reutilizable compartido
- ~10 líneas para integrar el modal
- Código más limpio y mantenible
