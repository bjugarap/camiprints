import { RemoteProviderStub } from "./remote-provider-stub";

/**
 * Black Forest Labs Flux Pro — planned integration.
 *
 * Flux is job-based: submit → job id → poll for sample → download. That is
 * exactly the PhotoConversionProvider contract, so the real implementation
 * is a thin mapping: convert() submits through a CamiPrints server route
 * (keeping credentials server-side) and returns a "queued" ConversionJob;
 * getJob() polls and maps Flux's Pending/Ready/Error onto
 * ConversionJobStatus; fetchOutput() downloads the signed result URL
 * server-side and streams it back as a Blob.
 */
export class FluxProvider extends RemoteProviderStub {
  readonly id = "flux" as const;
  readonly displayName = "Flux Pro";
}
