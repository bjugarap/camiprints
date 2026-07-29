import type { ConversionJob, ConversionProviderId } from "@/types/converter";

import {
  ProviderNotConfiguredError,
  type PhotoConversionProvider,
} from "./provider";

/**
 * Base for remote AI providers that are registered but not yet integrated.
 * Each stub is selectable via NEXT_PUBLIC_COLORING_PROVIDER today; until
 * its integration lands, convert() fails as a normal job failure
 * ("provider-not-configured"), which the wizard already renders calmly —
 * proving the UI needs zero changes when a real integration arrives.
 *
 * A real integration replaces the four methods with:
 *  - convert():    upload the cropped photo + settings to the vendor API,
 *                  create the job as "queued", return it for polling.
 *  - getJob():     poll the vendor job endpoint, map vendor states onto
 *                  ConversionJobStatus, stamp completedAt/duration.
 *  - fetchOutput(): download the finished image as a Blob.
 *  - cancel():     withdraw the vendor job where the API supports it.
 * Webhook-capable vendors can short-circuit polling by pushing status into
 * the same job record server-side.
 */
export abstract class RemoteProviderStub implements PhotoConversionProvider {
  abstract readonly id: ConversionProviderId;
  abstract readonly displayName: string;
  readonly mode = "async" as const;

  async convert(): Promise<ConversionJob> {
    throw new ProviderNotConfiguredError(this.id);
  }

  async getJob(): Promise<ConversionJob | null> {
    return null;
  }

  async fetchOutput(): Promise<Blob | null> {
    return null;
  }

  async cancel(): Promise<void> {
    // Nothing to withdraw until the integration exists.
  }
}
