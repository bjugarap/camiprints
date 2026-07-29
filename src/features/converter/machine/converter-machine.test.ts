import { describe, expect, it } from "vitest";

import type {
  ConversionJob,
  ConversionSettings,
  ResolvedPhotoMeta,
} from "@/types/converter";

import {
  converterReducer,
  INITIAL_CONVERTER_STATE,
  type ConverterEvent,
  type ConverterState,
} from "./converter-machine";

const photo: ResolvedPhotoMeta = {
  id: "p1",
  source: "file-upload",
  mimeType: "image/jpeg",
  width: 1200,
  height: 1600,
  originalFilename: "cat.jpg",
  createdAt: "2026-07-28T00:00:00.000Z",
};

function job(status: ConversionJob["status"]): ConversionJob {
  return {
    id: "j1",
    provider: "local",
    status,
    createdAt: "2026-07-28T00:00:00.000Z",
    completedAt: null,
    processingDurationMs: null,
    settings: INITIAL_CONVERTER_STATE.settings,
    crop: INITIAL_CONVERTER_STATE.crop,
    output: null,
    error: null,
  };
}

function run(events: ConverterEvent[], from = INITIAL_CONVERTER_STATE) {
  return events.reduce(converterReducer, from);
}

/** State just before conversion: photo resolved, rights confirmed, step 4. */
const adjusting: ConverterState = run([
  { type: "PHOTO_RESOLVED", photo },
  { type: "RIGHTS_CHANGED", confirmed: true },
  { type: "NEXT" },
  { type: "NEXT" },
  { type: "NEXT" },
]);

describe("converter machine — forward path", () => {
  it("walks 1 → 4 once a photo exists and rights are confirmed", () => {
    expect(adjusting.step).toBe(4);
    expect(adjusting.status).toBe("adjusting");
  });

  it("refuses NEXT from step 1 without a photo", () => {
    expect(run([{ type: "NEXT" }])).toEqual(INITIAL_CONVERTER_STATE);
  });

  it("refuses NEXT from step 1 without rights confirmation", () => {
    const state = run([{ type: "PHOTO_RESOLVED", photo }, { type: "NEXT" }]);
    expect(state.step).toBe(1);
  });

  it("runs a job to completion and on to print", () => {
    const state = run(
      [
        { type: "CONVERT_REQUESTED", job: job("processing") },
        {
          type: "JOB_PROGRESS",
          progress: {
            stage: "edges",
            message: "Finding the main outlines…",
            completedStages: 2,
            totalStages: 6,
          },
        },
        { type: "JOB_COMPLETED", job: job("completed") },
        { type: "CONTINUE_TO_PRINT" },
      ],
      adjusting,
    );
    expect(state.step).toBe(6);
    expect(state.status).toBe("printing");
    expect(state.error).toBeNull();
  });
});

describe("converter machine — the failure invariant", () => {
  const customSettings: ConversionSettings = {
    style: "detailed",
    detail: "more-lines",
    advanced: {
      lineWeight: "thick",
      contrast: "softer",
      removeBackground: true,
      invert: false,
    },
  };
  const tuned = run(
    [{ type: "SETTINGS_CHANGED", settings: customSettings }],
    adjusting,
  );
  const failed = run(
    [
      { type: "CONVERT_REQUESTED", job: job("processing") },
      {
        type: "JOB_FAILED",
        job: job("failed"),
        error: { code: "photo-too-dark", message: "Too dark to trace" },
      },
    ],
    tuned,
  );

  it("failure stays on step 5 with every setting intact", () => {
    expect(failed.step).toBe(5);
    expect(failed.status).toBe("error");
    expect(failed.settings).toEqual(customSettings);
    expect(failed.photo).toEqual(photo);
  });

  it("retry-with-more-contrast bumps only contrast", () => {
    const retried = converterReducer(failed, {
      type: "RETRY_WITH_MORE_CONTRAST",
    });
    expect(retried.settings.advanced.contrast).toBe("stronger");
    expect(retried.settings.style).toBe("detailed");
    expect(retried.settings.advanced.removeBackground).toBe(true);
  });

  it("back-to-adjustments clears the error, keeps settings", () => {
    const back = converterReducer(failed, { type: "BACK_TO_ADJUSTMENTS" });
    expect(back.step).toBe(4);
    expect(back.error).toBeNull();
    expect(back.settings).toEqual(customSettings);
  });

  it("cancel during processing returns to step 4 losslessly", () => {
    const processing = run(
      [{ type: "CONVERT_REQUESTED", job: job("processing") }],
      tuned,
    );
    const cancelled = converterReducer(processing, { type: "JOB_CANCELLED" });
    expect(cancelled.step).toBe(4);
    expect(cancelled.settings).toEqual(customSettings);
    expect(cancelled.job).toBeNull();
  });
});

describe("converter machine — guards", () => {
  it("ignores navigation while processing", () => {
    const processing = run(
      [{ type: "CONVERT_REQUESTED", job: job("processing") }],
      adjusting,
    );
    expect(converterReducer(processing, { type: "BACK" }).status).toBe(
      "processing",
    );
    expect(converterReducer(processing, { type: "NEXT" }).status).toBe(
      "processing",
    );
    expect(
      converterReducer(processing, { type: "GO_TO_STEP", step: 1 }).status,
    ).toBe("processing");
  });

  it("ignores stray job events outside processing", () => {
    expect(
      converterReducer(adjusting, {
        type: "JOB_COMPLETED",
        job: job("completed"),
      }),
    ).toEqual(adjusting);
  });

  it("stepper can revisit earlier steps but never skip ahead", () => {
    expect(
      converterReducer(adjusting, { type: "GO_TO_STEP", step: 2 }).step,
    ).toBe(2);
    expect(
      converterReducer(adjusting, { type: "GO_TO_STEP", step: 6 }).step,
    ).toBe(4);
  });

  it("replace-photo keeps settings but drops photo, crop and rights", () => {
    const replaced = converterReducer(
      run([{ type: "SETTINGS_CHANGED", settings: { detail: "simpler" } }], adjusting),
      { type: "PHOTO_REPLACED" },
    );
    expect(replaced.photo).toBeNull();
    expect(replaced.rightsConfirmed).toBe(false);
    expect(replaced.settings.detail).toBe("simpler");
    expect(replaced.step).toBe(1);
  });
});

describe("converter machine — session restore", () => {
  it("restores a mid-flow session as saved", () => {
    const restored = converterReducer(INITIAL_CONVERTER_STATE, {
      type: "SESSION_RESTORED",
      state: adjusting,
    });
    expect(restored).toEqual(adjusting);
  });

  it("never restores into a mid-flight or failed job", () => {
    const processing = run(
      [{ type: "CONVERT_REQUESTED", job: job("processing") }],
      adjusting,
    );
    const restored = converterReducer(INITIAL_CONVERTER_STATE, {
      type: "SESSION_RESTORED",
      state: processing,
    });
    expect(restored.step).toBe(4);
    expect(restored.status).toBe("adjusting");
    expect(restored.job).toBeNull();
  });
});
