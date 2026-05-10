# SDK Integration Playbook

Этот документ описывает практический сценарий интеграции `@mathculture/ab-sdk` в реальное React-приложение и поясняет, какие части платформы обязательны, а какие можно внедрять поэтапно.

## 1. Что получает команда после установки SDK

После:

```bash
npm i @mathculture/ab-sdk
```

или

```bash
pnpm add @mathculture/ab-sdk
```

команда получает только клиентский runtime-слой:

- `ABProvider`
- `useAB(experimentKey)`
- assignment-логику `enabled / variant`
- буферизацию и отправку событий
- `impressionRef` и `track(...)`

SDK не включает:

- backend API;
- admin UI;
- PostgreSQL / ClickHouse;
- хранение конфигурации экспериментов.

## 2. Какие есть режимы использования

### Режим A. Команда использует готовую self-host платформу

Команда:

1. Поднимает `backend + admin + PostgreSQL + ClickHouse`.
2. Подключает `@mathculture/ab-sdk` в свое React-приложение.
3. Управляет конфигурацией через admin UI.

Это самый простой путь, если нужен готовый feature management контур.

### Режим B. Команда использует только SDK и реализует свой runtime-контракт

Команда:

1. Ставит npm-пакет SDK.
2. Реализует минимум два backend endpoints:
   - `GET /sdk/experiments/active?appId=...`
   - `POST /sdk/events/batch`
3. Хранит конфигурации у себя в любой удобной форме.

Этот режим подходит, если команде пока не нужен весь self-host стек AB Platform.

### Режим C. Команда форкает платформу и развивает свою версию

Команда берет исходный репозиторий и меняет:

- backend;
- admin UI;
- SDK;
- модель данных;
- роли и аудит.

Это уже не просто интеграция, а владение собственной версией платформы.

## 3. Что обязательно нужно frontend-приложению

### Минимальные условия

- React 18+
- стабильный `apiUrl`
- стабильный `appId`
- fallback-логика на случай `enabled = false`

### Что frontend должен знать о пользователе

Для корректной сегментации frontend должен передать в SDK:

- `subjectKey`
- `userGroups`

### Требования к `subjectKey`

`subjectKey` должен быть:

- стабильным для одного и того же пользователя;
- непрямым;
- безопасным для передачи в клиент.

Хорошие варианты:

- `subject:uuid`
- opaque key
- заранее подготовленный hash

Плохие варианты:

- raw `userId`
- email
- телефон

Рекомендуемый путь:

backend аутентификации выдает frontend отдельное поле вроде `subject_key`, и именно оно передается в SDK.

### Что такое `userGroups`

`userGroups` — это логические сегменты пользователя, которые frontend получает из своего backend или вычисляет из уже известных прав и признаков.

Примеры:

- `role:owner`
- `role:qa`
- `team:frontend`
- `region:ru`
- `user:egor`

## 4. Базовая интеграция в React

### Подключение `ABProvider`

```tsx
import { ABProvider } from "@mathculture/ab-sdk";

export function Root() {
  return (
    <ABProvider
      config={{
        apiUrl: "http://localhost:3000",
        appId: "finance-tracker",
        subjectKey: "subject:2b3f4a0a",
        userGroups: ["role:owner", "team:frontend"],
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

### Использование в компоненте

```tsx
import { useAB } from "@mathculture/ab-sdk";

export function CheckoutCta() {
  const ab = useAB("checkout-redesign");

  if (!ab.enabled) {
    return <button>Старый CTA</button>;
  }

  return (
    <button onClick={() => ab.track("click", { source: "checkout" })}>
      Новый CTA ({ab.variant})
    </button>
  );
}
```

## 5. Текущая runtime-семантика SDK

### Порядок assignment

Для каждого эксперимента SDK проверяет:

1. `featureEnabled`
2. попадание в сегмент:
   - `includeSubjectKeys`
   - `includeGroups`
   - `rolloutPercent`
3. `trafficPercent`
4. выбор `variant` по `weightPercent`

### Разница между `rolloutPercent` и `trafficPercent`

- `rolloutPercent` отвечает за попадание в сегмент;
- `trafficPercent` отвечает за фактическое включение эксперимента в runtime.

### Что возвращает SDK

- если пользователь не прошел сегментацию или трафик — `enabled = false`, `variant = "control"`;
- если прошел, но вариантов нет — `enabled = true`, `variant = "on"`;
- если прошел и варианты есть — `enabled = true`, `variant = A/B/...`

## 6. События SDK

Поддерживаются:

- `impression`
- `click`
- `conversion`
- `custom`

### Текущее поведение

- `impression` отправляется автоматически, когда элемент через `impressionRef` реально попал во viewport и оставался видимым достаточно долго;
- `click`, `conversion`, `custom` отправляются только явным вызовом `track(...)`.

Пример:

```tsx
const ab = useAB("savings-income-simulator");

return (
  <button onClick={() => ab.track("conversion", { source: "fixed-simulation" })}>
    Зафиксировать
  </button>
);
```

## 7. Минимальный backend-контракт для SDK

### `GET /sdk/experiments/active?appId=...`

Ожидается ответ вида:

```json
{
  "experiments": [
    {
      "key": "checkout-redesign",
      "featureKey": "checkout-redesign",
      "featureEnabled": true,
      "segmentRules": {
        "includeSubjectKeys": [],
        "includeGroups": ["role:beta"],
        "rolloutPercent": 25
      },
      "trafficPercent": 100,
      "variants": [
        { "key": "A", "weightPercent": 50 },
        { "key": "B", "weightPercent": 50 }
      ]
    }
  ]
}
```

### `POST /sdk/events/batch`

Ожидается запрос вида:

```json
{
  "events": [
    {
      "event_id": "uuid",
      "app_id": "finance-tracker",
      "subject_key": "subject:2b3f4a0a",
      "experiment_key": "checkout-redesign",
      "variant_key": "A",
      "type": "click",
      "ts": "2026-05-10T12:00:00.000Z",
      "meta": {
        "source": "checkout_cta"
      }
    }
  ]
}
```

Типовой ответ:

```json
{ "accepted": 1 }
```

## 8. Как выглядит интеграция с backend команды

AB Platform не заменяет продуктовый backend команды. Обычно схема такая:

1. backend команды аутентифицирует пользователя;
2. frontend получает безопасный `subjectKey` и признаки сегментации;
3. frontend передает `subjectKey` и `userGroups` в `ABProvider`;
4. SDK ходит в AB backend за активными экспериментами и отправляет события.

То есть продуктовый backend и AB backend — это разные сервисные контуры.

## 9. Self-host сценарий “как есть”

Если команда использует платформу полностью, она поднимает:

```bash
docker compose up -d --build
```

Получает:

- admin UI на `http://localhost:5173`
- backend на `http://localhost:3000`

Текущий bootstrap-admin по умолчанию:

- email: `admin@local.test`
- password: `admin123`

После этого можно:

1. создать группы;
2. создать feature toggles;
3. подключить SDK в React-приложение;
4. смотреть аналитику и audit log в админке.

## 10. Практический checklist интеграции

### Frontend

- вынести `apiUrl` и `appId` в env;
- обеспечить fallback на старое поведение;
- передавать стабильный `subjectKey`;
- передавать актуальные `userGroups`;
- вручную размечать `click` и `conversion` в нужных точках UI.

### Backend команды

- выдавать frontend безопасный `subjectKey`;
- отдавать данные для вычисления `userGroups`;
- при необходимости ограничить доступ к AB backend по CORS / reverse proxy / internal network.

### AB Platform

- завести группы;
- настроить rollout и traffic;
- убедиться, что naming тогглов понятный и стабильный;
- периодически удалять или архивировать устаревшие toggles.

## 11. Связанные документы

- [README](../readme.md)
- [Benchmark Methodology](./benchmark-methodology.md)
