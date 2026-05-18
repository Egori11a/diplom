# Production Integration Guide

Документ описывает, как подготовить AB Platform к использованию за пределами локального демонстрационного стенда. Это не заменяет внутренние регламенты эксплуатации команды, но фиксирует безопасный и воспроизводимый путь внедрения backend, admin UI и SDK.

## 1. Что именно разворачивается

Минимальная self-host-инсталляция включает четыре компонента:

1. Backend API на NestJS.
2. Admin UI для управления группами, тогглами, пользователями и audit log.
3. PostgreSQL для конфигураций платформы.
4. ClickHouse для событий `impression`, `click`, `conversion`, `custom`.

React-приложение-потребитель отдельно устанавливает `@mathculture/ab-sdk` и подключается к backend API.

## 2. Базовая схема потоков

1. Admin UI отправляет защищенные запросы в backend по `/admin/*`.
2. Backend валидирует данные, проверяет JWT/роль и сохраняет конфигурации в PostgreSQL.
3. SDK в React-приложении запрашивает активные правила через `GET /sdk/experiments/active`.
4. SDK локально вычисляет `enabled` и `variant` для текущего пользователя.
5. SDK отправляет события через `POST /sdk/events/batch`.
6. Backend сохраняет события в ClickHouse.

SDK не подключается к PostgreSQL или ClickHouse напрямую.

## 3. Переменные окружения

В репозитории есть шаблон `.env.example`. Его можно использовать как checklist, но реальные production-секреты не должны попадать в git.

Обязательные параметры backend:

| Переменная | Назначение |
|---|---|
| `PORT` | Порт backend внутри контейнера или процесса |
| `JWT_SECRET` | Секрет подписи JWT |
| `ADMIN_EMAIL` | Bootstrap email первого администратора |
| `ADMIN_PASSWORD` | Временный bootstrap password первого администратора |
| `ADMIN_ROLE` | Роль bootstrap-пользователя, обычно `owner` |
| `POSTGRES_URL` | Строка подключения к PostgreSQL |
| `CLICKHOUSE_URL` | HTTP URL ClickHouse |
| `CLICKHOUSE_USER` | Пользователь ClickHouse |
| `CLICKHOUSE_PASSWORD` | Пароль ClickHouse |

Параметр сборки Admin UI:

| Переменная | Назначение |
|---|---|
| `PUBLIC_API_URL` | Публичный URL backend API, который будет использовать браузер |

## 4. Секреты

Для локального стенда допустимы демонстрационные значения из `docker-compose.yml`. Для production нужно использовать защищенный способ доставки секретов:

1. Protected variables в CI/CD.
2. `.env` на сервере вне репозитория.
3. Docker secrets.
4. Kubernetes Secrets.
5. Vault, 1Password, AWS Secrets Manager, Yandex Lockbox или аналог.

Нельзя использовать в production значения вида `admin123`, `postgres`, `ab_pass`, `local-dev-secret`.

## 5. Production-like Docker Compose

В репозитории есть пример:

```bash
docker compose --env-file .env -f docker-compose.prod.example.yml up -d --build
```

Особенности production-like compose:

1. PostgreSQL и ClickHouse не пробрасываются наружу через `ports`.
2. Backend получает секреты из env.
3. Admin UI собирается с `PUBLIC_API_URL`.
4. Сервисы баз данных имеют healthcheck.
5. Данные PostgreSQL и ClickHouse хранятся в named volumes.

Этот файл является примером, а не универсальным production-манифестом для любой инфраструктуры.

## 6. Сетевой доступ

Рекомендуемая схема доступа:

1. Backend API доступен React-приложениям и Admin UI через HTTPS.
2. Admin UI доступен только внутренним пользователям команды или через защищенный корпоративный контур.
3. PostgreSQL и ClickHouse доступны только backend-сервису.
4. Внешний доступ к портам `5432`, `8123`, `9000` закрыт.

Для публичного HTTPS обычно используется reverse proxy: Nginx, Traefik, Caddy или корпоративный ingress.

## 7. Пользователи и роли

После первого запуска backend создает bootstrap-администратора из `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_ROLE`.

Дальше рекомендуется:

1. Создать персональные аккаунты для участников команды.
2. Назначить роли `owner`, `admin`, `editor`, `viewer` по уровню ответственности.
3. Сменить временный bootstrap password.
4. Отключить лишние учетные записи.
5. Периодически просматривать audit log.

Пароли администраторов в PostgreSQL должны храниться как `password_hash`, а не открытым текстом.

## 8. Интеграция SDK в React-приложение

Установка:

```bash
pnpm add @mathculture/ab-sdk
```

Подключение:

```tsx
import { ABProvider } from "@mathculture/ab-sdk";

export function Root() {
  return (
    <ABProvider
      config={{
        apiUrl: "https://ab-api.company.local",
        appId: "finance-tracker",
        subjectKey: "user:42",
        userGroups: ["team:frontend", "role:beta"],
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

Использование:

```tsx
import { useAB } from "@mathculture/ab-sdk";

export function AnalyticsPeriodSwitcher() {
  const experiment = useAB("analytics-default-period");

  return (
    <section ref={experiment.impressionRef}>
      <button onClick={() => experiment.track("click")}>Выбрать период</button>
      <span>Вариант: {experiment.variant}</span>
    </section>
  );
}
```

## 9. Проверка первого запуска

После запуска backend:

```bash
curl "http://localhost:3000/sdk/experiments/active?appId=demo-app"
```

Ожидаемый результат: HTTP 200 и JSON с массивом `experiments`.

Проверка отправки событий:

```bash
curl -X POST "http://localhost:3000/sdk/events/batch" \
  -H "Content-Type: application/json" \
  -d '{"events":[{"event_id":"smoke-1","app_id":"demo-app","subject_key":"user:smoke","experiment_key":"demo-toggle","variant_key":"control","type":"custom","ts":"2026-05-18T12:00:00.000Z","meta":{"source":"smoke"}}]}'
```

Ожидаемый результат: backend принимает запрос без ошибки и возвращает статус успешной обработки.

## 10. Fail-safe поведение SDK

SDK должен безопасно деградировать:

1. Если эксперимент не найден, возвращается `enabled = false`, `variant = "control"`.
2. Если пользователь не проходит segmentation или traffic, возвращается `control`.
3. Если эксперимент включен и variants пустые, возвращается технический вариант `on`.
4. Если `enabled = false`, ручной `track(...)` не отправляет событие.
5. Если отправка событий временно не удалась, `EventBuffer` возвращает payload в очередь для повторной отправки.