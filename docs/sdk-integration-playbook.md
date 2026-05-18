# SDK Integration Playbook

Документ описывает практический путь подключения `@mathculture/ab-sdk` в React-приложение. Главная идея: команда-потребитель получает не только npm-пакет, но и понятный маршрут от установки SDK до проверки первого эксперимента.

## 1. Роль SDK в платформе

`@mathculture/ab-sdk` — это клиентский runtime-слой AB Platform.

SDK отвечает за:

1. Загрузку активных конфигураций экспериментов с backend.
2. Детерминированный расчет `enabled` и `variant` для текущего пользователя.
3. React-интеграцию через `ABProvider` и `useAB`.
4. Автоматическую фиксацию `impression` через `impressionRef`.
5. Ручную отправку `click`, `conversion`, `custom` через `track(...)`.
6. Буферизацию и batch-отправку событий.

SDK не отвечает за:

1. Хранение конфигураций.
2. Управление группами и тогглами.
3. Авторизацию админки.
4. PostgreSQL и ClickHouse.
5. Admin UI.

Простая формула:

> Admin UI через backend сохраняет правила, backend хранит их в PostgreSQL, SDK получает активные правила через backend и применяет их внутри React-приложения.

## 2. Варианты внедрения

### Вариант A. Полный self-host-комплект AB Platform

Команда разворачивает:

1. Backend API.
2. Admin UI.
3. PostgreSQL.
4. ClickHouse.
5. SDK в своем React-приложении.

Это основной сценарий для проекта.

### Вариант B. Только SDK и собственный backend-контракт

Команда устанавливает SDK, но реализует свои endpoint:

1. `GET /sdk/experiments/active?appId=...`
2. `POST /sdk/events/batch`

Такой вариант подходит, если команда хочет использовать assignment/runtime-логику SDK, но хранить конфигурации в своей системе.

### Вариант C. Fork платформы

Команда форкает весь репозиторий и изменяет backend, admin UI, SDK, модель данных или роли под свои процессы.

## 3. Минимальные требования к React-приложению

1. React 18+.
2. Доступный backend API URL.
3. Стабильный `appId`.
4. Стабильный `subjectKey` пользователя.
5. Список `userGroups`, если используется групповая сегментация.
6. Fallback UI для случая `enabled = false`.

## 4. Установка SDK

```bash
pnpm add @mathculture/ab-sdk
```

или

```bash
npm i @mathculture/ab-sdk
```

## 5. Подключение `ABProvider`

`ABProvider` лучше размещать рядом с корневым компонентом приложения, чтобы `useAB` был доступен во всех нужных UI-сценариях.

```tsx
import { ABProvider } from "@mathculture/ab-sdk";
import { App } from "./App";

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

## 6. Как выбирать `subjectKey`

`subjectKey` должен быть стабильным и безопасным для передачи в клиент.

Хорошие варианты:

1. `user:42`, если такой идентификатор не раскрывает чувствительные данные.
2. `subject:uuid`.
3. Opaque key, выданный продуктовым backend.
4. Хешированный идентификатор.

Плохие варианты:

1. Email.
2. Телефон.
3. Паспортные или платежные данные.
4. Нестабильный random id при каждом входе.

Рекомендуемый production-подход:

> Продуктовый backend после авторизации возвращает frontend безопасный `subjectKey`, а frontend передает его в `ABProvider`.

## 7. Как передавать `userGroups`

`userGroups` — это список сегментов пользователя.

Примеры:

```ts
userGroups: ["team:frontend", "role:qa", "region:ru"]
```

Группы можно получать:

1. Из backend приложения.
2. Из профиля пользователя.
3. Из ролей/прав текущей сессии.
4. Из заранее рассчитанного набора сегментов.

Важно: названия групп должны совпадать с группами, настроенными в Admin UI AB Platform.

## 8. Использование boolean-тоггла

Boolean-тоггл управляет включением или скрытием функционального блока.

```tsx
import { useAB } from "@mathculture/ab-sdk";

export function SavingsWidget() {
  const simulator = useAB("savings-income-simulator");

  return simulator.enabled ? (
    <section ref={simulator.impressionRef}>
      <h2>Симулятор накопительного счета</h2>
      <button onClick={() => simulator.track("conversion", { source: "save-plan" })}>
        Зафиксировать параметры
      </button>
    </section>
  ) : null;
}
```

Если пользователь не попал в условия тоггла, SDK вернет:

```ts
{ enabled: false, variant: "control" }
```

## 9. Использование A/B/C/D-варианта

Многовариантный эксперимент управляет вариантом UI.

```tsx
import { useAB } from "@mathculture/ab-sdk";

type Period = "month" | "quarter" | "year" | "all";

const variantToPeriod: Record<string, Period> = {
  A: "month",
  B: "quarter",
  C: "year",
  D: "all",
  control: "month"
};

export function AnalyticsScreen() {
  const periodExperiment = useAB("analytics-default-period");
  const defaultPeriod = variantToPeriod[periodExperiment.variant] ?? "month";

  return (
    <section ref={periodExperiment.impressionRef}>
      <AnalyticsChart defaultPeriod={defaultPeriod} />
      <button onClick={() => periodExperiment.track("click", { period: defaultPeriod })}>
        Сменить период
      </button>
    </section>
  );
}
```

## 10. События

SDK поддерживает типы событий:

1. `impression`
2. `click`
3. `conversion`
4. `custom`

`impression` можно фиксировать автоматически через `impressionRef`.

`click`, `conversion`, `custom` отправляются вручную:

```tsx
const experiment = useAB("checkout-redesign");

<button onClick={() => experiment.track("click", { source: "cta" })}>
  Продолжить
</button>
```

События не отправляются сразу по одному. `EventBuffer` копит их и отправляет батчами на backend.

## 11. Runtime-семантика assignment

SDK применяет правила в таком порядке:

1. Проверяет `featureEnabled`.
2. Проверяет явное включение по `includeSubjectKeys`.
3. Проверяет попадание по `includeGroups`.
4. Проверяет `rolloutPercent`.
5. Проверяет `trafficPercent`.
6. Выбирает variant по `weightPercent`.

Возвращаемые состояния:

| Ситуация | Результат |
|---|---|
| Эксперимент не найден | `enabled = false`, `variant = "control"` |
| Пользователь не прошел сегмент/traffic | `enabled = false`, `variant = "control"` |
| Фича включена, variants пустые | `enabled = true`, `variant = "on"` |
| Фича включена, variants есть | `enabled = true`, `variant = "A"/"B"/...` |

## 12. Минимальный backend-контракт SDK

Если команда использует backend AB Platform, эти endpoint уже реализованы.

### Получение активных экспериментов

```text
GET /sdk/experiments/active?appId=finance-tracker
```

Ожидаемый ответ:

```json
{
  "experiments": [
    {
      "key": "analytics-default-period",
      "featureKey": "analytics-default-period",
      "featureEnabled": true,
      "segmentRules": {
        "includeSubjectKeys": [],
        "includeGroups": ["team:frontend"],
        "rolloutPercent": 100
      },
      "trafficPercent": 100,
      "variants": [
        { "key": "A", "weightPercent": 25 },
        { "key": "B", "weightPercent": 25 },
        { "key": "C", "weightPercent": 25 },
        { "key": "D", "weightPercent": 25 }
      ]
    }
  ]
}
```

### Отправка событий

```text
POST /sdk/events/batch
```

Пример payload:

```json
{
  "events": [
    {
      "event_id": "event-1",
      "app_id": "finance-tracker",
      "subject_key": "user:42",
      "experiment_key": "analytics-default-period",
      "variant_key": "A",
      "type": "click",
      "ts": "2026-05-18T12:00:00.000Z",
      "meta": {
        "source": "period-switcher"
      }
    }
  ]
}
```

## 13. Проверка интеграции

После подключения SDK нужно проверить:

1. React-приложение успешно рендерится внутри `ABProvider`.
2. Backend отвечает на `GET /sdk/experiments/active`.
3. В Admin UI создан тоггл с тем же `appId` и `experimentKey`.
4. `useAB("experiment-key")` возвращает ожидаемые `enabled` и `variant`.
5. `impressionRef` отправляет `impression` только при видимости элемента.
6. `track("click")` или `track("conversion")` приводит к событию в аналитике.

Smoke-команда для проверки backend:

```bash
curl "http://localhost:3000/sdk/experiments/active?appId=finance-tracker"
```

## 14. Production notes для потребителя SDK

Для боевого использования важно:

1. Передавать в SDK HTTPS `apiUrl`.
2. Не использовать email/телефон как `subjectKey`.
3. Обеспечить fallback UI при `enabled = false`.
4. Не завязывать критичную безопасность продукта только на клиентский тоггл.
5. Проверять, что CORS backend разрешает домен приложения.
6. Использовать backend/admin версии, совместимые с SDK.
7. Не интерпретировать dev-секреты из `docker-compose.yml` как production-настройки.

Подробная эксплуатационная инструкция: [Production Integration Guide](./production-integration.md).

## 15. Связанные документы

1. [README](../readme.md)
2. [Production Integration Guide](./production-integration.md)
3. [Benchmark Methodology](./benchmark-methodology.md)
