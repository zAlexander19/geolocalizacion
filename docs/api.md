# API Contracts

All responses follow the shape:

```json
{
  "data": {},
  "error": null
}
```

On error:

```json
{
  "data": null,
  "error": { "message": "string", "code": "optional" }
}
```

Base URL: http://localhost:4000

## POST /auth/login
- Request body: { "email": string, "password": string }
- Response 200:
```json
{ "data": { "token": "jwt", "user": { "id": "string", "email": "string" } }, "error": null }
```
- 401:
```json
{ "data": null, "error": { "message": "invalid credentials" } }
```

## POST /auth/register
- Request body: { "email": string, "password": string, "name": string }
- Response 201:
```json
{ "data": { "id": "string", "email": "string" }, "error": null }
```

## GET /search?q=...
Query across campus, buildings, rooms, bathrooms, floors.
- Response 200:
```json
{ "data": [ { "type": "campus|building|room|bathroom|floor", "id": "string", "name": "string" } ], "error": null }
```

## GET /campus
- Response 200:
```json
{ "data": [ { "id": "string", "name": "string", "faculties": [ { "id": "string", "name": "string" } ] } ], "error": null }
```

## GET /buildings/:id/map
- Response 200:
```json
{ "data": { "id": "string", "name": "string", "geojson": { }, "floors": [ { "level": 1, "map": { } } ] }, "error": null }
```

## POST /auth/register (NOT YET IMPLEMENTED)
- Request body: { "email": string, "password": string, "name": string }
- Response 201:
```json
{ "data": { "id": "string", "email": "string" }, "error": null }
```

---

## Buildings

### POST /buildings (adminOnly)
- Request body: { "code": string, "name": string, "campus_id"?: string }
- Response 201:
```json
{ "data": { "id": "1", "code": "DFT", "name": "Edificio DFT", "campus_id": null }, "error": null }
```

### GET /buildings?search=
- Response 200:
```json
{ "data": [ { "id": "1", "code": "DFT", "name": "Edificio DFT" } ], "error": null }
```

### GET /buildings/:id
- Response 200:
```json
{ "data": { "id": "1", "code": "DFT", "name": "Edificio DFT" }, "error": null }
```

### PUT /buildings/:id (adminOnly)
- Request body: partial { "code"?, "name"?, "campus_id"? }
- Response 200:
```json
{ "data": { "id": "1", "code": "DFT-NEW", "name": "Edificio DFT Nuevo" }, "error": null }
```

### DELETE /buildings/:id (adminOnly)
- Response 200:
```json
{ "data": { "id": "1", ... }, "error": null }
```

---

## Floors

### POST /floors (adminOnly)
- Request body: { "building_id": string, "number": int }
- Response 201:
```json
{ "data": { "id": "2", "building_id": "1", "number": 1 }, "error": null }
```

### GET /buildings/:id/floors
- Response 200:
```json
{ "data": [ { "id": "2", "building_id": "1", "number": 1 } ], "error": null }
```

### PUT /floors/:id (adminOnly)
- Request body: partial { "building_id"?, "number"? }
- Response 200:
```json
{ "data": { "id": "2", "building_id": "1", "number": 2 }, "error": null }
```

### DELETE /floors/:id (adminOnly)
- Response 200:
```json
{ "data": { "id": "2", ... }, "error": null }
```

---

## Rooms

### POST /rooms (adminOnly)
- Request body: { "building_id": string, "floor_id": string, "code": string, "name"?: string, "capacity"?: int, "location"?: { lat, lng } }
- Response 201:
```json
{ "data": { "id": "3", "building_id": "1", "floor_id": "2", "code": "DFT-101", "name": "Sala 101" }, "error": null }
```

### GET /rooms?building_id=&floor_id=&search=
- Response 200:
```json
{ "data": [ { "id": "3", "building_id": "1", "floor_id": "2", "code": "DFT-101", "name": "Sala 101" } ], "error": null }
```

### GET /rooms/:id
- Response 200:
```json
{ "data": { "id": "3", "building_id": "1", "floor_id": "2", "code": "DFT-101", "name": "Sala 101" }, "error": null }
```

### PUT /rooms/:id (adminOnly)
- Request body: partial { "building_id"?, "floor_id"?, "code"?, "name"?, "capacity"?, "location"? }
- Response 200:
```json
{ "data": { "id": "3", ... }, "error": null }
```

### DELETE /rooms/:id (adminOnly)
- Response 200:
```json
{ "data": { "id": "3", ... }, "error": null }
```
