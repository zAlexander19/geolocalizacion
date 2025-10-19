# Geolocalización Monorepo

Monorepo con dos aplicaciones: web (React + Vite) y api (Node). Basado en npm workspaces.

## Estructura

- apps/
	- web/ (React)
	- api/ (Node)
- docs/
	- api.md (Contratos API-first)
- .nvmrc (Node 20.11.1)
- .editorconfig, .prettierrc, eslint configs por paquete

## Requisitos

- Node 20.11.1 (usa nvm) y npm 10

## Instalación

```powershell
npm install
```

## Desarrollo

- Web:

```powershell
npm run dev:web
```

- API:

```powershell
npm run dev:api
```

## Variables de entorno

- apps/web/.env.example
- apps/api/.env.example

No subas archivos .env reales; ya están ignorados por .gitignore.

## Flujo de trabajo Git

- Ramas por feature: feat/web-auth, feat/api-auth, etc.
- PRs pequeños a develop; merge a main cuando haya algo demostrable.

## Convenciones

- Respuestas de API: `{ data, error }` como en `docs/api.md`.

