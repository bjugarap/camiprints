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
    provider: "flux",
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

/** Settings home: photo resolved, rights confirmed, at Style (step 3). */
const styling: ConverterState = run([
  { type: "PHOTO_RESOLVED", photo },
  { type: "RIGHTS_CHANGED", confirmed: true },
  { type: "NEXT" },
  { type: "NEXT" },
]);

/** A finished result under review on the Preview step. */
const reviewing: ConverterState = run(
  [
    { type: "CONVERT_REQUESTED", job: job("processing") },
    { type: "JOB_COMPLETED", job: job("completed") },
  ],
  styling,
);

describe("converter machine — forward path", () => {
  it("walks 1 → 3; generation is the only door to the preview", () => {
    expect(styling.step).toBe(3);
    expect(styling.status).toBe("style-selected");
    expect(converterReducer(styling, { type: "NEXT" }).step).toBe(3);
  });

  it("refuses NEXT from step 1 without a photo or rights", () => {
    expect(run([{ type: "NEXT" }])).toEqual(INITIAL_CONVERTER_STATE);
    const noRights = run([{ type: "PHOTO_RESOLVED", photo }, { type: "NEXT" }]);
    expect(noRights.step).toBe(1);
  });

  it("generation lands the result on the preview, then print", () => {
    expect(reviewing.step).toBe(4);
    expect(reviewing.status).toBe("completed");
    const printing = converterReducer(reviewing, {
      type: "CONTINUE_TO_PRINT",
    });
    expect(printing.step).toBe(5);
    expect(printing.status).toBe("printing");
  });

  it("CONTINUE_TO_PRINT only works from a completed result", () => {
    expect(
      converterReducer(styling, { type: "CONTINUE_TO_PRINT" }).step,
    ).toBe(3);
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
    styling,
  );
  const failed = run(
    [
      { type: "CONVERT_REQUESTED", job: job("processing") },
      {
        type: "JOB_FAILED",
        job: job("failed"),
        error: { code: "ai-bad-output", message: "Didn’t come out right" },
      },
    ],
    tuned,
  );

  it("failure stays on step 4 with every setting intact", () => {
    expect(failed.step).toBe(4);
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
  });

  it("back-to-settings clears the error, keeps settings, lands on Style", () => {
    const back = converterReducer(failed, { type: "BACK_TO_SETTINGS" });
    expect(back.step).toBe(3);
    expect(back.error).toBeNull();
    expect(back.settings).toEqual(customSettings);
  });

  it("cancel during processing returns to Style losslessly", () => {
    const processing = run(
      [{ type: "CONVERT_REQUESTED", job: job("processing") }],
      tuned,
    );
    const cancelled = converterReducer(processing, { type: "JOB_CANCELLED" });
    expect(cancelled.step).toBe(3);
    expect(cancelled.settings).toEqual(customSettings);
    expect(cancelled.job).toBeNull();
  });
});

describe("converter machine — guards", () => {
  const processing = run(
    [{ type: "CONVERT_REQUESTED", job: job("processing") }],
    styling,
  );

  it("ignores navigation and duplicate converts while processing", () => {
    expect(converterReducer(processing, { type: "BACK" }).status).toBe(
      "processing",
    );
    expect(converterReducer(processing, { type: "NEXT" }).status).toBe(
      "processing",
    );
    expect(
      converterReducer(processing, {
        type: "CONVERT_REQUESTED",
        job: job("queued"),
      }).job?.status,
    ).toBe("processing");
  });

  it("ignores stray job events outside processing", () => {
    expect(
      converterReducer(styling, { type: "JOB_COMPLETED", job: job("completed") }),
    ).toEqual(styling);
  });

  it("stepper revisits earlier steps; the preview only exists with a result", () => {
    expect(converterReducer(reviewing, { type: "GO_TO_STEP", step: 2 }).step).toBe(2);
    const printingNoJob = { ...reviewing, step: 5 as const, job: null };
    expect(
      converterReducer(printingNoJob, { type: "GO_TO_STEP", step: 4 }).step,
    ).toBe(5);
  });

  it("back from print returns to the result, not the settings", () => {
    const printing = converterReducer(reviewing, { type: "CONTINUE_TO_PRINT" });
    const back = converterReducer(printing, { type: "BACK" });
    expect(back.step).toBe(4);
    expect(back.status).toBe("completed");
    expect(back.job?.status).toBe("completed");
  });

  it("back from a failure clears it and lands on Style", () => {
    const failed = run(
      [
        {
          type: "JOB_FAILED",
          job: job("failed"),
          error: { code: "ai-timeout", message: "Too slow" },
        },
      ],
      processing,
    );
    const back = converterReducer(failed, { type: "BACK" });
    expect(back.step).toBe(3);
    expect(back.error).toBeNull();
  });

  it("replace-photo keeps settings and engine but drops photo state", () => {
    const replaced = converterReducer(
      run([{ type: "SETTINGS_CHANGED", settings: { detail: "simpler" } }], reviewing),
      { type: "PHOTO_REPLACED" },
    );
    expect(replaced.photo).toBeNull();
    expect(replaced.rightsConfirmed).toBe(false);
    expect(replaced.settings.detail).toBe("simpler");
    expect(replaced.step).toBe(1);
  });
});

describe("converter machine — engine selection", () => {
  it("switches engine and keeps it across replace-photo and start-over", () => {
    const local = converterReducer(styling, {
      type: "ENGINE_SELECTED",
      engine: "local",
    });
    expect(local.engine).toBe("local");
    expect(converterReducer(local, { type: "PHOTO_REPLACED" }).engine).toBe(
      "local",
    );
    expect(converterReducer(local, { type: "START_OVER" }).engine).toBe(
      "local",
    );
  });

  it("cannot switch engine mid-processing", () => {
    const processing = run(
      [{ type: "CONVERT_REQUESTED", job: job("processing") }],
      styling,
    );
    expect(
      converterReducer(processing, { type: "ENGINE_SELECTED", engine: "local" })
        .engine,
    ).toBe("ai");
  });
});

describe("converter machine — session restore", () => {
  it("restores a completed result onto the Adjust step as saved", () => {
    const restored = converterReducer(INITIAL_CONVERTER_STATE, {
      type: "SESSION_RESTORED",
      state: reviewing,
    });
    expect(restored).toEqual(reviewing);
  });

  it("never restores into a mid-flight or failed job — lands on Style", () => {
    const processing = run(
      [{ type: "CONVERT_REQUESTED", job: job("processing") }],
      styling,
    );
    const restored = converterReducer(INITIAL_CONVERTER_STATE, {
      type: "SESSION_RESTORED",
      state: processing,
    });
    expect(restored.step).toBe(3);
    expect(restored.status).toBe("style-selected");
    expect(restored.job).toBeNull();
  });
});
