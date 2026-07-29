import {
  HANDOFF_HEADER_FILENAME,
  HANDOFF_VERSION,
  handoffTokenSchema,
} from "@/shared/contracts/extension-handoff";
import type { ResolvedPhotoInput } from "@/types/converter";

import {
  newInputId,
  PhotoIntakeError,
  validatePhotoBlob,
  type PhotoInputAdapter,
} from "./photo-input";

/**
 * Intake for the Chrome-extension handoff. Redeems the opaque single-use
 * token against the handoff API and receives the image bytes; the bytes
 * then pass the exact same validation as a local upload — nothing the
 * extension sent is trusted, including the claimed MIME type.
 */
export interface ExtensionHandoffPayload {
  token: string;
}

export const extensionHandoffAdapter: PhotoInputAdapter<ExtensionHandoffPayload> =
  {
    source: "chrome-extension",
    async resolve({ token }): Promise<ResolvedPhotoInput> {
      if (!handoffTokenSchema.safeParse(token).success) {
        throw new PhotoIntakeError("handoff-invalid");
      }

      let response: Response;
      try {
        response = await fetch("/api/converter/handoffs/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: HANDOFF_VERSION, token }),
        });
      } catch {
        throw new PhotoIntakeError("network");
      }

      if (response.status === 429) {
        throw new PhotoIntakeError("rate-limited");
      }
      if (!response.ok) {
        // Missing, expired and already-used tokens are indistinguishable
        // by design; all resolve to the same calm recovery message.
        throw new PhotoIntakeError("handoff-expired");
      }

      const blob = await response.blob();
      const { width, height } = await validatePhotoBlob(blob);
      const filename =
        response.headers.get(HANDOFF_HEADER_FILENAME) ?? undefined;

      return {
        id: newInputId(),
        source: "chrome-extension",
        blob,
        mimeType: blob.type,
        width,
        height,
        originalFilename: filename,
        createdAt: new Date().toISOString(),
      };
    },
  };
