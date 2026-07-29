import { RemoteProviderStub } from "./remote-provider-stub";

/**
 * OpenAI GPT Image — planned integration.
 *
 * Shape of the real implementation: POST the cropped photo with a
 * line-art prompt derived from ConversionSettings to the Images edits
 * endpoint via a CamiPrints server route (the API key must never reach
 * the browser), persist a ConversionJob keyed by the vendor request, and
 * poll/getJob until the generated image is retrievable via fetchOutput.
 * Settings map to prompt modifiers (style/detail) rather than pixel
 * parameters — that difference stays inside this file.
 */
export class OpenAIProvider extends RemoteProviderStub {
  readonly id = "openai" as const;
  readonly displayName = "OpenAI GPT Image";
}
