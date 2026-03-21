# AB Platform
https://www.npmjs.com/package/@mathculture/ab-sdk
Официальная документация проекта AB Platform: open-source self-host решение для feature toggle и A/B-тестирования в React-приложениях.

## 1. Назначение платформы

AB Platform решает две задачи:

1. Управление фича-тогглами и раскаткой функциональности по сегментам.
2. Проведение A/B-тестов с централизованной аналитикой (impression/click/conversion, CTR, CR, Wilson interval).

Главный публичный артефакт - npm SDK для React (`@mathculture/ab-sdk`).

Self-host часть платформы:

- `@ab/backend` - API и обработка событий (NestJS)
- `@ab/admin` - админ-панель (React)
- PostgreSQL - конфигурации экспериментов/тогглов/групп
- ClickHouse - события и аналитические выборки

## 2. Статус

- Текущий статус: `v0.1.0` (MVP baseline, условно минимально рабочая версия)

## 3. Состав репозитория

- `apps/backend` - backend API и аналитика
- `apps/admin` - админ-панель
- `apps/demo-app` - демонстрационное React-приложение
- `packages/sdk` - React SDK для встраивания в сторонние приложения
- `packages/shared-types` - общие типы

## 4. Ключевые сущности системы

- `Group` (группа): логический сегмент, например команда разработки, бета-группа, регион, тип клиентов.
- `Group member`: идентификатор участника сегмента (в MVP это `anonymous_id`/`member_key`).
- `Feature Toggle / Experiment`: правило показа фичи и вариантности.
- `Variant`: вариант эксперимента (`A`, `B`, ...), влияет на поведение/UI.
- `Segment Rules`: условия включения (группы, `anonymous_id`, rollout%).

## 5. Как работает система (E2E)

1. Администратор в админке создает группы и фича-тогглы.
2. React-приложение подключает SDK (`ABProvider`, `useAB`).
3. SDK запрашивает активные эксперименты через backend:
   - `GET /sdk/experiments/active?appId=...`
4. SDK определяет, включен ли эксперимент для текущего пользователя:
   - по `anonymous_id`
   - по переданным `userGroups`
   - по rollout%.
5. Компонент получает `enabled` и `variant`, показывает нужный UI.
6. SDK буферизует события и отправляет батчами:
   - `POST /sdk/events/batch`
7. Backend сохраняет события в ClickHouse и строит метрики для admin dashboard.

## 6. Инструкция для команды, которая хочет начать пользоваться платформой

Ниже описан полный onboarding для абстрактной продуктовой команды.

### 6.1. Подготовить инфраструктуру

Минимальные требования:

- Docker + Docker Compose
- Node.js 20+ (рекомендуется 22)
- pnpm

Клонирование и установка:

```bash
git clone <repo-url>
cd diplom
pnpm install
```

Запуск self-host окружения:

```bash
docker compose up -d --build
```

После запуска по умолчанию:

- Admin UI: `http://localhost:5173`
- Demo app: `http://localhost:5176`
- Backend API: `http://localhost:3000`

Дефолтный админ:

- `email`: `admin@local.test`
- `password`: `admin123`

### 6.2. Подключить SDK в целевое React-приложение

Установка SDK:

```bash
npm i @mathculture/ab-sdk
# или pnpm add @mathculture/ab-sdk
```

Подключение провайдера в root:

```tsx
import { ABProvider } from "@mathculture/ab-sdk";

export function Root() {
  return (
    <ABProvider
      config={{
        apiUrl: "https://ab.company.internal",
        appId: "web-main",
        userGroups: ["frontend-team"],
        cacheTtlMs: 30000,
        flushIntervalMs: 5000,
        batchSize: 20
      }}
    >
      <App />
    </ABProvider>
  );
}
```

Использование в feature-компоненте:

```tsx
import { useAB } from "@mathculture/ab-sdk";

export function CheckoutCTA() {
  const { enabled, variant, track } = useAB("checkout-cta");

  if (!enabled) {
    return <button>Старый CTA</button>;
  }

  return (
    <button
      onClick={() => track("click", { source: "checkout" })}
      data-variant={variant}
    >
      Новый CTA ({variant})
    </button>
  );
}
```

### 6.3. Настроить платформу в админке

Рекомендуемый порядок:

1. Экран `Обучение`: ознакомиться с семантикой сущностей.
2. Экран `Группы`: создать группы (например `frontend-team`, `beta-testers`).
3. Через `Изменить` у группы:
   - добавить состав (member ids)
   - проверить, к каким тогглам группа подключена.
4. Экран `Фича-тогглы`:
   - создать тоггл/эксперимент
   - назначить группы
   - задать rollout%
   - включить/выключить фичу.

### 6.4. Проверить работоспособность

Чек-лист интеграции:

1. В приложении под `ABProvider` экспериментный компонент показывает ожидаемый вариант.
2. В Network есть вызовы:
   - `GET /sdk/experiments/active`
   - `POST /sdk/events/batch`
3. В админке меняешь правила -> клиент через TTL подхватывает новые настройки.
4. События отражаются в аналитике.

### 6.5. Рекомендации эксплуатации

- Использовать отдельный `appId` для каждого приложения и среды (`web-prod`, `web-stage`).
- Включать rollout поэтапно: `1% -> 10% -> 25% -> 50% -> 100%`.
- Держать понятные ключи тогглов в kebab-case.
- После завершения эксперимента архивировать/удалять неактуальные тогглы.

## 7. Как стыкуется AB Platform с backend команды

Частый вопрос: если у команды уже есть свой backend, как это совместить?

### 7.1. Базовая схема (рекомендуемая для MVP)

- Frontend команды напрямую ходит в AB backend по SDK endpoints.
- Основной backend команды остается независимым.
- Связь между системами происходит через клиентский контекст (`userGroups`, user traits).

То есть AB backend - отдельный сервис управления экспериментами, а не замена продуктового backend.

### 7.2. Какие данные должна отдавать система команды

Чтобы сегментация была полезной, backend команды обычно отдает frontend данные о пользователе:

- роль/команда
- регион
- флаги доступа
- идентификаторы сегментов

Frontend преобразует эти данные в `userGroups` и передает в `ABProvider`.

### 7.3. Продвинутая схема (опционально)

Если политика компании запрещает прямые клиентские вызовы во внутренний сервис:

- backend команды делает BFF-прокси к AB backend
- или периодически синхронизирует правила из AB backend
- SDK конфигурируется на этот proxy endpoint.

### 7.4. Важные интеграционные моменты

- CORS на AB backend должен разрешать домены приложений.
- Нужен HTTPS в production.
- Для `dev/stage/prod` рекомендуется разделять инстансы AB backend и БД.
- Admin endpoints (JWT) не должны быть доступны без контроля доступа.

## 8. API (MVP)

### 8.1. Public SDK endpoints

- `GET /sdk/experiments/active?appId=...`
- `POST /sdk/events/batch`

### 8.2. Admin endpoints (JWT)

Auth:

- `POST /auth/login`

Feature toggles/experiments:

- `GET /admin/feature-toggles`
- `POST /admin/feature-toggles`
- `PATCH /admin/feature-toggles/:id`
- `DELETE /admin/feature-toggles/:id`

Groups:

- `GET /admin/groups`
- `POST /admin/groups`
- `PATCH /admin/groups/:id`
- `DELETE /admin/groups/:id`
- `POST /admin/groups/:id/members`
- `DELETE /admin/groups/:id/members/:memberKey`

Analytics:

- `GET /admin/analytics/experiment/:key`

## 9. Локальная разработка

### 9.1. Без Docker

Нужны локальные PostgreSQL и ClickHouse, затем:

```bash
pnpm dev
```

### 9.2. Проверки качества

```bash
pnpm typecheck
pnpm build
pnpm test
```

## 10. Публикация SDK в npm

Минимальный процесс:

1. Проверить `packages/sdk/package.json` (имя, версия, exports).
2. Выполнить:

```bash
pnpm --filter @mathculture/ab-sdk build
cd packages/sdk
npm pack --dry-run
npm publish --access public
```

3. Для следующих релизов:

```bash
npm version patch
npm publish --access public
```

## 11. Лицензия

MIT
