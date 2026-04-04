# AB SDK Integration Playbook (Real Team Scenario)

Этот документ описывает реальный сценарий использования `@mathculture/ab-sdk`, когда у команды есть только npm-пакет SDK и нет готового AB runtime.

Ключевая мысль:
1. SDK решает клиентскую часть (assignment + вызовы API + events).
2. Для полноценной работы нужен backend-контракт (минимум 2 endpoint'а).
3. Админка и БД могут быть добавлены позже, но не обязательны для первого запуска.

## 1. Что получает команда из npm-пакета

После `npm i @mathculture/ab-sdk` команда получает:
1. `ABProvider` для подключения AB в корне приложения.
2. `useAB(experimentKey)` для feature gating в компонентах.
3. Автоматические `impression`-события и ручной `track(...)`.
4. Локальную логику выбора `enabled/variant` по правилам эксперимента.

SDK не включает:
1. Хранилище конфигурации экспериментов.
2. Admin UI для управления тогглами.
3. Backend runtime.

## 2. Реальный старт команды без готовой платформы

Если у команды нет готовой AB-инфры, есть рабочий путь в 2 этапа.

Этап A (MVP за 1-2 дня):
1. Реализовать минимум API-контракт для SDK.
2. Хранить конфиг экспериментов хоть в JSON/таблице.
3. Подключить SDK во фронтенд и запустить rollout.

Этап B (production):
1. Добавить admin API + UI.
2. Вынести конфиги в полноценную БД.
3. Добавить аудит, роли и регламент релизов.

## 3. Минимальные требования к frontend-проекту

Обязательно:
1. React 18+.
2. Возможность задать `apiUrl` и `appId`.
3. Fallback-логика в UI при `enabled=false`.

Рекомендуется:
1. Авторизация пользователя в продукте.
2. Формирование `userGroups` (пример: `role:pm`, `region:ru`, `user:123`).
3. Передавать в SDK только безопасный `subject_key` (opaque key/UUID/hash), а не raw `userId` или email.
4. Конфигурация через env:
- `VITE_AB_API_URL`
- `VITE_AB_APP_ID`
- `VITE_AB_USER_GROUPS` (опционально)

## 4. Минимальные требования к backend (чтобы SDK заработал)

Нужны ровно 2 ручки:

1. `GET /sdk/experiments/active?appId=...`
2. `POST /sdk/events/batch`

### 4.1 Формат ответа `GET /sdk/experiments/active`

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
        { "key": "control", "weightPercent": 50 },
        { "key": "variant-a", "weightPercent": 50 }
      ]
    }
  ]
}
```

### 4.2 Формат запроса `POST /sdk/events/batch`

```json
{
  "events": [
    {
      "event_id": "uuid",
      "app_id": "finance-tracker",
      "subject_key": "subject:uuid",
      "experiment_key": "checkout-redesign",
      "variant_key": "variant-a",
      "type": "click",
      "ts": "2026-03-24T21:00:00.000Z",
      "meta": {
        "source": "checkout_cta"
      }
    }
  ]
}
```

Ответ:
```json
{ "accepted": 1 }
```

## 5. Что backend команды должен сделать в первую очередь

Минимальный backlog:
1. Таблица/хранилище экспериментов с полями из контракта.
2. Endpoint выдачи активных экспериментов по `appId`.
3. Endpoint приема батча событий.
4. CORS для домена фронтенда.
5. Стабильный URL для SDK (`https://ab-api.company.local`).

Это уже достаточно, чтобы веб-команда начала A/B и toggles.

## 6. Что веб-команда делает параллельно

1. Ставит SDK:
```bash
npm i @mathculture/ab-sdk
```

2. Подключает провайдер:
```tsx
import { ABProvider } from "@mathculture/ab-sdk";

<ABProvider
  config={{
    apiUrl: import.meta.env.VITE_AB_API_URL,
    appId: import.meta.env.VITE_AB_APP_ID,
    subjectKey: currentUser.subjectKey,
    userGroups: computedGroups,
    cacheTtlMs: 30000,
    flushIntervalMs: 5000,
    batchSize: 20
  }}
>
  <App />
</ABProvider>
```

Где брать `subjectKey`:
- из auth/backend-контракта (отдельное поле, например `subject_key`);
- не использовать напрямую внутренние ID, email или телефон;
- ключ должен быть стабильным для пользователя в рамках приложения.

3. Использует тоггл в коде:
```tsx
import { useAB } from "@mathculture/ab-sdk";

const exp = useAB("checkout-redesign");

if (exp.enabled) {
  return <NewCheckout />;
}
return <OldCheckout />;
```

4. Логирует пользовательские действия:
```tsx
exp.track("click", { source: "checkout_button" });
```

## 7. Где хранить данные, если admin UI пока нет

Рабочие варианты MVP:
1. JSON-файл в репозитории backend (для dev/stage).
2. Таблица в Postgres (рекомендуемо даже на MVP).
3. Конфиг в key-value хранилище.

Важно:
1. Контракт API для SDK должен оставаться стабильным.
2. UI и способ редактирования можно менять позже.

## 8. Путь от MVP к полноценной AB-платформе

Шаг 1:
1. Только 2 SDK endpoint'а + простое хранение.

Шаг 2:
1. CRUD для experiments и groups.
2. JWT-авторизация для админских ручек.

Шаг 3:
1. Admin UI для продукта/аналитиков.
2. Ролевой доступ (admin/editor/viewer).
3. История изменений тогглов.

Шаг 4:
1. Дашборды по событиям.
2. Аудит и governance-политики.

## 9. Чек-лист готовности перед первой боевой фичей

Frontend:
1. Есть fallback на старую логику.
2. `appId` и `apiUrl` вынесены в env.
3. `userGroups` формируются стабильно после логина.

Backend:
1. `GET /sdk/experiments/active` отвечает валидным JSON.
2. `POST /sdk/events/batch` не падает и возвращает `accepted`.
3. Включен CORS для frontend-домена.

Процесс:
1. У команды есть naming convention ключей (`kebab-case`).
2. Есть правило lifecycle тоггла (создали -> раскатили -> удалили/архивировали).
3. Для каждой фичи зафиксированы KPI и критерий успеха.

## 10. Текущая семантика runtime (v0.1.1)

Этот раздел отражает фактическое поведение текущей реализации SDK/Admin/Backend.

### 10.1 Порядок assignment в SDK

Для каждого ключа эксперимента SDK принимает решение в таком порядке:
1. Проверка `featureEnabled`.
2. Проверка попадания в сегмент (`includeSubjectKeys`, `includeGroups`, `rolloutPercent`).
3. Применение `trafficPercent` для пользователей, прошедших сегментацию.
4. Выбор варианта по `weightPercent` (если варианты настроены).

Если `variants` пустой и фича включена для пользователя, SDK возвращает технический вариант `"on"`.

### 10.2 Rollout и Traffic

- `rolloutPercent`: определяет, кто попадает в сегмент эксперимента.
- `trafficPercent`: определяет, кто из этого сегмента реально получает экспериментный runtime.

Эти параметры не взаимозаменяемы и применяются последовательно.

### 10.3 Additional subject keys в Admin UI

Поле `Additional subject keys (comma-separated)` используется только для ручного точечного таргетинга.

Текущее поведение:
- участники групп автоматически в это поле не подмешиваются;
- при редактировании тоггла идентификаторы, полученные из выбранных групп, из поля исключаются;
- поле предназначено только для явно заданных персональных идентификаторов.

### 10.4 Поведение при удалении группы

При удалении группы backend удаляет ее имя из `segmentRules.includeGroups` у связанных тогглов.

### 10.5 Типы событий и метрики

Типы событий SDK/Backend:
- `impression` (автоматически из SDK при `enabled=true`)
- `click` (вручную: `track("click")`)
- `conversion` (вручную: `track("conversion")`)
- `custom` (вручную: `track("custom")`)

Текущие формулы аналитики на backend:
- `CTR = clicks / impressions`
- `CR = conversions / impressions`
- `Wilson 95%` рассчитывается для вероятности клика (`clicks` от `impressions`).
