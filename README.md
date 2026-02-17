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
  - [Environment variables](#environment-variables)
  - [Run App Docker Recommended](#run-app-docker-recommended)
  - [Run app Manual](#run-app-manual)

## Execution

This section contains how to execute the application once you have cloned the repository.

### Environment variables

1. Copy the enviroment template of the `backend` folder:

```
cd backend && cp .env.template .env
```

> [!NOTE]
> In the `template_secrets.env` file you can find the following variables:
>
> - `PORT=3334`
> - `PUBLIC_PATH=public`
> - `BASE_URL=your_domain`
> - `POSTGRES_URL=postgresql://postgres:123456@localhost:5432/URL`
> - `POSTGRES_USER=postgres`
> - `POSTGRES_DB=URL`
> - `POSTGRES_PORT=5432`
> - `POSTGRES_PASSWORD=123456`

> [!IMPORTANT]
> `POSTGRES` variables need to be modified with your local databse or external database if you wish.

### Run App Docker Recommended

There are two options avaliable. If you alredy have an external `PostgreSql` database, you can only execute the backend service with the `docker-compose.yml` inside the `backend/` folder:

```
cd backend && docker compose up -d
```

> [!NOTE]
> The frontend project is alredy built and inside the `public` folder of backend project.
>
> If you modified the frontend you will need to build it and move it to `backend/public` folder.

If you also need a local database you can run the `docker-compose.yml` at the root of the repository:

```
docker compose up -d
```

### Run app Manual

For this project, I used the package manager of `bun` avilable on: [Bun](https://bun.com/)

1. Hava a PostgresSql database running or run the docker-compose.database.yml to run one container:

```
docker compose -f docker-compose.database.yml up -d
```

2. Install the backend dependencies:

```
bun install
```

3. Run the backend project:

```
bun run dev
```
