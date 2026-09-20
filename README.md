<img width="1129" height="341" alt="image" src="https://github.com/user-attachments/assets/c942b256-96fe-4b0b-9455-78cc569275f0" />

---

Url shortener fully functional with a modern, geometric design and tracking of statistics for generated links.

[🔗 You can Try it Here!](https://bjurl.botij0tech.com/)

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Shadcn](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)
![Axios](https://img.shields.io/badge/axios-671ddf?&style=for-the-badge&logo=axios&logoColor=white)
![ExpressJs](https://img.shields.io/badge/Express%20js-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSql](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

## Contents

- [Contents](#contents)
- [Execution](#execution)
  - [Prerequisites](#prerequisites)
  - [Environment variables](#environment-variables)
  - [Run App Docker Recommended](#run-app-docker-recommended)
  - [Run app Manual](#run-app-manual)
  - [Tests](#tests)
- [Architecture](#architecture)
- [API overview](#api-overview)
- [Project structure](#project-structure)

## Execution

This section contains how to execute the application once you have cloned the repository.

### Prerequisites

- [Bun](https://bun.com/) (package manager used by both `backend/` and `frontend/`)
- [Docker](https://www.docker.com/) (for the recommended run, or for the local Postgres container)

### Environment variables

1. Copy the environment template of the `backend` folder:

```
cd backend && cp .env.template .env
```

> [!NOTE]
> In the `backend/.env.template` file you can find the following variables:
>
> - `PORT=3334`
> - `PUBLIC_PATH=public`
> - `BASE_URL=your_domain`
> - `POSTGRES_URL=postgresql://postgres:123456@localhost:5432/URL`
> - `POSTGRES_USER=postgres`
> - `POSTGRES_DB=URL`
> - `POSTGRES_PORT=5432`
> - `POSTGRES_PASSWORD=123456`
> - `IP_HASH_SALT=REPLACE_WITH_RANDOM_SECRET` (generate one with `openssl rand -hex 32`; the app refuses to start with a placeholder value)
> - `CORS_ORIGIN=*`
>
> `BASE_URL` is the public origin used to build the returned `shortUrl` (e.g. `https://bjurl.example.com`).

> [!IMPORTANT]
> `POSTGRES_*` variables need to be modified with your local database or external database if you wish.

### Run App Docker Recommended

There are two options available. If you already have an external `PostgreSQL` database, you can only execute the backend service with the `docker-compose.yml` inside the `backend/` folder:

```
cd backend && docker compose up -d
```

> [!NOTE]
> The frontend project is already built and inside the `public` folder of the backend project.
>
> If you modified the frontend you will need to rebuild it (`cd frontend && bun install && bun run build`) and copy the output of `frontend/dist/` into the `backend/public/` folder before building the image.

If you also need a local database you can run the `docker-compose.yml` at the root of the repository (app + database):

```
docker compose up -d
```

### Run app Manual

1. Have a PostgreSQL database running or run the `docker-compose.database.yml` to run one container:

```
docker compose -f docker-compose.database.yml up -d
```

2. Configure `backend/.env` (see [Environment variables](#environment-variables)) and apply the database migrations:

```
cd backend && bun install && bunx prisma migrate deploy
```

3. Run the backend project:

```
bun run dev
```

4. Optional: run the frontend in dev mode (separate terminal). It talks to the backend via `VITE_API_URL` (`frontend/.env.template` → `frontend/.env`):

```
cd frontend && bun install && bun run dev
```

### Tests

```
cd backend && bun run test
cd frontend && bun run test
```

## Architecture

<img width="4320" height="2392" alt="image" src="https://github.com/user-attachments/assets/20467dfb-e18d-4245-a72e-2acc7bc71ab1" />

## API overview

| Method | Route                         | Description                                                               |
| ------ | ----------------------------- | ------------------------------------------------------------------------- |
| `POST` | `/api/url`                    | Create a short link (optional `custom_alias`, `expires_at`, `max_clicks`) |
| `GET`  | `/:shortUrl`                  | Redirect (`302`), `404` unknown, `410` expired/spent                      |
| `GET`  | `/api/alias/:alias/available` | Alias verdict: `invalid \| reserved \| taken \| free`                     |
| `GET`  | `/api/url/:shortUrl/stats`    | Per-link analytics                                                        |
| `POST` | `/api/url/batch-stats`        | Click counts for up to 100 codes (dashboard history)                      |
| `GET`  | `/api/stats`                  | Global `{ urls, clicks }`                                                 |

Frontend routes: `/` (shortener), `/links` (browser-local history, `localStorage: bjurl:links`), `/stats/:shortUrl` (public stats page).

Alias rules: 3–30 chars of letters, numbers, `-`/`_`, and not reserved (`api`, `stats`, `links`, `dashboard`, `admin`, `assets`, `static`, `healthz`, `favicon`, `robots`).

## Project structure

```
backend/          Express + Prisma API, serves backend/public/
  prisma/         schema + migrations (tables: url, click)
  src/
    routes.ts     route table
    controllers/  HTTP layer (status codes, alias verdicts)
    services/     UrlService: codes, redirects, click logging
    data/         LinkStore (Prisma prod / InMemory tests)
frontend/         React + Vite + Tailwind SPA
  src/pages/      HomePage, LinksDashboard, LinkStatsPage
```
