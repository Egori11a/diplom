# @ab/sdk

React 18+ SDK for local/self-host A/B experiments.

## API

- `ABProvider({ config: { apiUrl, appId } })`
- `useAB(experimentKey)` -> `{ variant, track }`
- `track(type, meta?)`

## Quick example

```tsx
<ABProvider config={{ apiUrl: "http://localhost:3000", appId: "my-app" }}>
  <App />
</ABProvider>
```

See root `readme.md` for full self-host setup.
