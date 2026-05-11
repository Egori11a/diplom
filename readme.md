# AB Platform

AB Platform — self-host платформа для feature toggles, controlled rollout и базового A/B-тестирования в React-приложениях.

Публичный SDK:

- npm: `@mathculture/ab-sdk`
- пакет: https://www.npmjs.com/package/@mathculture/ab-sdk

Платформа решает две практические задачи:

1. Управление включением функциональности без обязательного нового релиза клиентского приложения.
2. Запуск и сопровождение простых A/B-экспериментов с событиями `impression`, `click`, `conversion` и базовой аналитикой.

## Состав репозитория

- `apps/backend` — backend API на NestJS
- `apps/admin` — административный UI на React
- `packages/sdk` — React SDK `@mathculture/ab-sdk`
- `packages/shared-types` — общие типы
- `docs` — эксплуатационная и интеграционная документация

## Архитектура

Платформа состоит из четырех основных частей:

1. `SDK runtime`
   SDK встраивается в React-приложение, запрашивает активные эксперименты, локально вычисляет `enabled` и `variant`, а также отправляет события.

2. `Backend`
   Backend хранит конфигурации, выдает их SDK, принимает батчи событий и обслуживает административный API.

3. `Admin UI`
   Админка позволяет управлять группами, тогглами, пользователями административного контура и просматривать аудит изменений.

4. `Хранилища`
   - PostgreSQL — конфигурации, административные пользователи, audit log
   - ClickHouse — продуктовые события и аналитические выборки

## Основные сущности

- `Group` — логический сегмент пользователей
- `Group member` — участник группы, идентифицируемый по `memberKey`
- `Feature toggle / experiment` — правило включения фичи и выбора варианта
- `Variant` — вариант эксперимента с весом `weightPercent`
- `Admin user` — пользователь административного контура с ролью
- `Audit log` — журнал административных действий

## Как работает runtime

### Порядок принятия решения в SDK

Для каждого эксперимента SDK действует так:

1. Проверяет `featureEnabled`.
2. Проверяет попадание в сегмент:
   - `includeSubjectKeys`
   - `includeGroups`
   - `rolloutPercent`
3. Для прошедшего сегмента применяет `trafficPercent`.
4. Если эксперимент включен и варианты существуют, выбирает `variant` по весам.
5. Если вариантов нет, для включенной фичи возвращает технический вариант `"on"`.

### Разница между `rolloutPercent` и `trafficPercent`

- `rolloutPercent` определяет, кто попадает в сегмент.
- `trafficPercent` определяет, кому из этого сегмента реально включается экспериментальный контур.

### Почему assignment не хранится в базе

В базе хранятся не индивидуальные решения для пользователей, а правила эксперимента. Конечное решение для конкретного `subjectKey` вычисляется в SDK детерминированно. Это упрощает runtime-контур и не требует отдельной таблицы assignments.

## События и аналитика

Поддерживаются события:

- `impression`
- `click`
- `conversion`
- `custom`

Текущее поведение:

- `impression` отправляется автоматически, когда целевой элемент через `impressionRef` реально попадает во viewport и остается видимым не менее короткого порога времени;
- `click`, `conversion` и `custom` отправляются только явным вызовом `track(...)`.

Текущие метрики на backend:

- `CTR = clicks / impressions`
- `CR = conversions / impressions`
- `Wilson 95%` рассчитывается для вероятности клика по числу `impressions`

## Административный контур

### Аутентификация и роли

Для входа в админку используется JWT-аутентификация.

Поддерживаются роли:

- `owner`
- `admin`
- `editor`
- `viewer`

Текущая модель:

- bootstrap-администратор создается из env-переменных;
- основной сценарий входа использует `password_hash`;
- сохранена совместимость со старым plaintext bootstrap-сценарием как миграционный слой.

### Пользователи админки

В admin UI реализован экран `Пользователи`.

Сейчас можно:

- создать административного пользователя;
- изменить роль;
- сбросить пароль;
- активировать или деактивировать пользователя.

Экран доступен роли `owner`.

### Audit log

Платформа фиксирует административные действия в `audit_logs`.

Примеры событий:

- `experiment.created`
- `experiment.updated`
- `experiment.deleted`
- `group.created`
- `group.updated`
- `group.deleted`
- `group.member_added`
- `group.member_removed`
- `admin.created`
- `admin.role_changed`
- `admin.password_reset`
- `admin.activated`
- `admin.deactivated`

В admin UI реализована вкладка `Аудит` с таблицей событий и деталями `beforeState / afterState`.

## Локальный запуск

### Требования

- Docker Desktop / Docker Engine
- Node.js 20+ (рекомендуется 22)
- pnpm

### Установка зависимостей

```bash
pnpm install
```

### Поднять self-host стек

```bash
docker compose up -d --build
```

После запуска по умолчанию:

- admin UI: `http://localhost:5173`
- backend: `http://localhost:3000`

Bootstrap-админ по умолчанию:

- email: `admin@local.test`
- password: `admin123`

### Запуск локальной разработки

Корневые команды:

```bash
pnpm dev
pnpm build
pnpm test
pnpm typecheck
pnpm bench:api
```

### Остановить стек

```bash
docker compose down
```

## API

### Public SDK endpoints

- `GET /sdk/experiments/active?appId=...`
- `POST /sdk/events/batch`

### Auth

- `POST /auth/login`
- `GET /auth/me`

### Admin: groups

- `GET /admin/groups`
- `POST /admin/groups`
- `PATCH /admin/groups/:id`
- `DELETE /admin/groups/:id`
- `POST /admin/groups/:id/members`
- `DELETE /admin/groups/:id/members/:memberKey`

### Admin: feature toggles

- `GET /admin/feature-toggles`
- `POST /admin/feature-toggles`
- `PATCH /admin/feature-toggles/:id`
- `DELETE /admin/feature-toggles/:id`

### Admin: analytics

- `GET /admin/analytics/feature-toggles/:experimentKey?appId=...`

### Admin: users

- `GET /admin/users`
- `POST /admin/users`
- `PATCH /admin/users/:id`
- `POST /admin/users/:id/reset-password`
- `POST /admin/users/:id/activate`
- `POST /admin/users/:id/deactivate`

### Admin: audit

- `GET /admin/audit-logs`

## Тестирование

В проекте есть несколько уровней автоматических проверок:

- unit-тесты SDK;
- unit-тесты backend-сервисов;
- backend e2e по административному и SDK API;
- admin UI smoke и e2e-сценарии Playwright.

Практически это покрывает:

- assignment-логику SDK;
- batching и отправку событий;
- CRUD по группам и feature toggles;
- аналитику по тогглам;
- роли, пользователей админки и audit log;
- базовую навигацию административного UI.

## Документация

- [SDK Integration Playbook](./docs/sdk-integration-playbook.md)
- [Benchmark Methodology](./docs/benchmark-methodology.md)

## Лицензия

MIT
