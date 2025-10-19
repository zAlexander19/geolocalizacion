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

## GET /rooms/:id
- Response 200:
```json
{ "data": { "id": "string", "name": "string", "buildingId": "string", "location": { "lat": 0, "lng": 0, "floor": 1 } }, "error": null }
```
