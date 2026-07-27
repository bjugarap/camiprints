# Provider pattern — photo conversion

The UI never knows which engine converts a photo. All conversion goes through
one interface (landing in Phase 4 at `src/server/providers/`):

```ts
interface ColoringProvider {
  convert(
    input: { image: Buffer; settings: ConversionSettings },
    signal?: AbortSignal,
  ): Promise<ConversionResult>;
}
```

The active provider is chosen by environment variable:

```
COLORING_PROVIDER=local   # default
```

| Provider | Status | Notes |
|---|---|---|
| `LocalProvider` | Implemented (Phase 4) | Sharp preprocessing + OpenCV.js edge detection/contour cleanup. No external API calls, no data leaves the server. |
| `OpenAIProvider` (GPT Image) | Stub | Proves the seam; throws "not configured". |
| `FluxProvider` (Flux Pro) | Stub |〃 |
| `GoogleImagenProvider` (Imagen) | Stub | 〃 |

Adding a real AI provider means writing one class and setting one env var —
no UI changes. Style names (Simple / Standard / Detailed / Thick Lines /
Portrait Friendly), the detail slider and the four expert adjustments are
part of `ConversionSettings`; each provider maps them to its own parameters.

Privacy contract every provider must honour: the uploaded photo is never
published, never added to the library, and is deleted after the session.
