import { RemoteProviderStub } from "./remote-provider-stub";

/**
 * Google Imagen — planned integration.
 *
 * The real implementation calls the Vertex AI images endpoint from a
 * CamiPrints server route with service-account credentials, using the
 * subject photo + a line-art style prompt derived from ConversionSettings.
 * Long-running operations return an operation name — getJob() polls it and
 * maps operation state onto ConversionJobStatus; fetchOutput() decodes the
 * base64 image payload into a Blob.
 */
export class ImagenProvider extends RemoteProviderStub {
  readonly id = "imagen" as const;
  readonly displayName = "Google Imagen";
}
