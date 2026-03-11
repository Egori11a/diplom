# AB Platform (Diploma MVP)

Open-source платформа A/B-тестирования UI-фич для React 18+.

## Статус

- `v0.1.0` - условно минимально рабочая версия (MVP baseline)

Главный артефакт: npm SDK `@ab/sdk`, который подключается в React-приложение с минимальными изменениями.

Self-host часть:
- `@ab/backend` (NestJS + JWT + REST API)
- `@ab/admin` (React + TanStack Query)
- PostgreSQL (конфигурации экспериментов)
- ClickHouse (события и агрегированная аналитика)

## Monorepo

- `apps/backend` - API и аналитика
- `apps/admin` - админ-панель
- `apps/demo-app` - demo React-приложение с SDK
- `packages/sdk` - публичный React SDK
- `packages/shared-types` - общие типы

## MVP features

- Создание/обновление экспериментов (admin CRUD)
- `GET /sdk/experiments/active` для SDK
- `POST /sdk/events/batch` для батч-событий
- JWT логин админа `POST /auth/login`
- Аналитика `GET /admin/analytics/experiment/:key`
- Метрики: impressions, clicks, conversions, CTR, conversion rate, Wilson 95%
- Sticky assignment по `anonymous_id` с deterministic hashing

## Quick start (local)

### 1. Install

```bash
pnpm install
```

### 2. Run infra (recommended)

```bash
docker compose up --build
```

После запуска:
- Admin: `http://localhost:5173`
- Demo app: `http://localhost:5176`
- Backend API: `http://localhost:3000`

Default admin credentials:
- email: `admin@local.test`
- password: `admin123`

### 3. Dev mode (without Docker)

Нужны локальные PostgreSQL и ClickHouse, затем:

```bash
pnpm dev
```

## SDK integration example

```tsx
import { ABProvider, useAB } from "@ab/sdk";

function CTA() {
  const { variant, track } = useAB("cta-color");

  return (
    <button onClick={() => track("click", { source: "cta" })}>
      Variant: {variant}
    </button>
  );
}

export default function App() {
  return (
    <ABProvider config={{ apiUrl: "http://localhost:3000", appId: "my-app" }}>
      <CTA />
    </ABProvider>
  );
}
```

## API (MVP)

Public SDK endpoints:
- `GET /sdk/experiments/active?appId=...`
- `POST /sdk/events/batch`

Admin endpoints (JWT):
- `POST /auth/login`
- `GET /admin/experiments`
- `POST /admin/experiments`
- `PATCH /admin/experiments/:id`
- `GET /admin/analytics/experiment/:key`

## Quality checks

```bash
pnpm build
pnpm typecheck
pnpm test
```

## License

MIT
