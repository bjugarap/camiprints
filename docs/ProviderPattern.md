# Provider pattern — photo conversion

Two layers of "which engine": the **user** picks an engine (AI Coloring
Page — the default — or Quick Outline), and for the AI engine the
**server** picks a vendor (`AI_PROVIDER`: flux today, mock for dev/e2e,
openai/imagen later). The browser bundle contains no vendor name, URL or
key — it talks only to `/api/conversions` (ADR 012).

All conversion goes through one interface
(`src/features/converter/providers/provider.ts`):

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

Engine availability and default are configuration
(`NEXT_PUBLIC_AI_ENABLED`, `NEXT_PUBLIC_LOCAL_ENABLED`,
`NEXT_PUBLIC_LOCAL_DEFAULT`); the AI vendor is server configuration
(`AI_PROVIDER`, plus `BFL_*` for Flux).

| Implementation | Where | Status | Notes |
|---|---|---|---|
| `LocalProvider` ("Quick Outline") | client | Implemented | On-device Canvas + typed-array pipeline (ADR 011). Photo never leaves the device. Implements `preview()`. |
| `ServerAiProvider` ("AI Coloring Page") | client shim | Implemented | Crops the original photo on-canvas, uploads once to `/api/conversions`, polls with an opaque encrypted token. Vendor-agnostic. |
| `FluxVendorAdapter` | server | **Implemented** | Black Forest Labs async API: create → poll → download, `x-key` auth, host allowlists. Model/base URL from env. |
| `MockVendorAdapter` | server | Implemented | Dev/e2e: the full production path with a deterministic generated page — no cost, no key. |
| OpenAI / Imagen adapters | server | Future | One `AiVendorAdapter` class each in `src/server/conversions/`; prompt comes from the shared prompt builder. |

The wizard's polling loop drives any `mode: "async"` provider (convert
returns a queued job → poll `getJob` → `fetchOutput`); webhooks can later
short-circuit vendor polling server-side without touching the UI.

Adding a new AI vendor = one server adapter class + `AI_PROVIDER=<id>`.
No UI changes; that is enforced by the e2e suite, which only ever speaks
to the wizard (and runs the AI path against the mock adapter).

Privacy contract every provider must honour (ADR 003): the photo is never
published, never added to the library, and deleted per
`docs/privacy-and-retention.md`.
