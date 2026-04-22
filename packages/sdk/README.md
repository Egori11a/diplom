# @mathculture/ab-sdk

React 18+ SDK for local/self-host A/B experiments.

## Documentation

- Full repository and detailed docs: https://github.com/Egori11a/diplom
- SDK integration playbook: https://github.com/Egori11a/diplom/blob/main/docs/sdk-integration-playbook.md

## API

- `ABProvider({ config: { apiUrl, appId } })`
- `useAB(experimentKey)` -> `{ variant, enabled, impressionRef, track }`
- `track(type, meta?)`
- `impressionRef` — callback ref: impression отправляется только когда связанный элемент виден во viewport (>=50% и >=700мс)

## Quick example

```tsx
<ABProvider config={{ apiUrl: "http://localhost:3000", appId: "my-app" }}>
  <App />
</ABProvider>
```

See root `readme.md` for full self-host setup.

## Viewport impression example

```tsx
function Banner() {
  const ab = useAB("planning-studio-refresh");

  return (
    <div ref={ab.impressionRef}>
      {ab.enabled ? `Вариант: ${ab.variant}` : "control"}
    </div>
  );
}
```

