# Provider pattern — photo conversion

The UI never knows which engine converts a photo. All conversion goes
through one interface (`src/features/converter/providers/provider.ts`):

```ts
interface PhotoConversionProvider {
  readonly id: "local" | "openai" | "flux" | "imagen";
  readonly displayName: string;
  readonly mode: "immediate" | "async";
  convert(request: ConversionRequest, callbacks?): Promise<ConversionJob>;
  getJob(jobId: string): Promise<ConversionJob | null>;
  fetchOutput(jobId: string): Promise<Blob | null>;
  cancel(jobId: string): Promise<void>;
  preview?(request: ConversionRequest): Promise<Blob | null>; // optional
}
```

The interface is shaped for the **hardest** provider — an asynchronous,
job-submitting, polling vendor API. `ConversionRequest` carries the photo
Blob, the crop and the neutral settings vocabulary (style, word-valued
detail/line-weight/contrast, background/invert flags); each provider maps
those to its own parameters internally. Progress arrives via `onProgress`
with real stage counts; cancellation via `AbortSignal`; every run produces
a `ConversionJob` record (ADR 010).

The active provider is configuration:

```
NEXT_PUBLIC_COLORING_PROVIDER=local   # default
```

| Provider | Status | Notes |
|---|---|---|
| `LocalProvider` | **Implemented** | On-device Canvas + typed-array pipeline (ADR 011). No data leaves the browser. Implements `preview()`. |
| `OpenAIProvider` (GPT Image) | Stub | Selectable today; `convert()` fails as a normal "provider-not-configured" job, which the wizard renders with its standard failure shell — proving zero UI changes are needed. Integration notes in the class docblock. |
| `FluxProvider` (Flux Pro) | Stub | Flux's submit → poll → download maps 1:1 onto the interface. |
| `ImagenProvider` (Google Imagen) | Stub | Vertex AI long-running operation maps onto `getJob` polling. |

The registry (`FACTORIES`) lazy-imports implementations, so the local
pipeline never ships to a deployment on a remote provider and vice versa.
The wizard's polling loop already drives `mode: "async"` providers
(convert returns a queued job → poll `getJob` → `fetchOutput`); webhooks
can later short-circuit polling server-side without touching the UI.

Adding a real AI provider = one class + credentials in a server route +
one env var. No UI changes; that is enforced by the e2e suite, which only
ever speaks to the wizard.

Privacy contract every provider must honour (ADR 003): the photo is never
published, never added to the library, and deleted per
`docs/privacy-and-retention.md`.
