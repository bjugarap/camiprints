import {
  DEFAULT_CROP,
  DEFAULT_SETTINGS,
  type ConversionEngine,
  type ConversionErrorInfo,
  type ConversionJob,
  type ConversionProgress,
  type ConversionSettings,
  type CropState,
  type ResolvedPhotoMeta,
} from "@/types/converter";

/**
 * The converter state machine. Every UI action and provider callback is an
 * explicit event; `converterReducer` is a pure function, so every legal
 * transition is unit-testable and every illegal one is a no-op rather than
 * a corrupt state. Two invariants come straight from the design handoff:
 *
 *  - A failure never leaves step 5 and never touches settings — "Your
 *    settings are still here" must always be literally true.
 *  - Back and Cancel are lossless.
 *
 * The whole state (minus blobs) is serializable so a browser refresh can
 * restore the session.
 */
export type ConverterStep = 1 | 2 | 3 | 4 | 5;

/**
 * Five steps: Photo · Crop · Style · Preview · Print. The style is the
 * one creative control — generation fires from the Style step and each
 * page is exactly one generation (there is no adjust/redraw loop, by
 * design: simple, predictable, and no multiplying AI traffic).
 */
export type ConverterStatus =
  | "idle" // step 1, no photo yet
  | "uploaded" // step 1, photo resolved, rights pending/confirmed
  | "cropping" // step 2
  | "style-selected" // step 3 — style home; generation starts here
  | "processing" // step 4, job running
  | "completed" // step 4, the finished page under review
  | "printing" // step 5
  | "error"; // step 4, job failed — settings intact

export interface ConverterState {
  status: ConverterStatus;
  step: ConverterStep;
  /** "ai" (the default, best quality) or "local" (Quick Outline). */
  engine: ConversionEngine;
  photo: ResolvedPhotoMeta | null;
  rightsConfirmed: boolean;
  crop: CropState;
  settings: ConversionSettings;
  /** Serializable snapshot of the active/last job (output blob in IDB). */
  job: ConversionJob | null;
  progress: ConversionProgress | null;
  error: ConversionErrorInfo | null;
}

export const INITIAL_CONVERTER_STATE: ConverterState = {
  status: "idle",
  step: 1,
  engine: "ai",
  photo: null,
  rightsConfirmed: false,
  crop: DEFAULT_CROP,
  settings: DEFAULT_SETTINGS,
  job: null,
  progress: null,
  error: null,
};

export type ConverterEvent =
  | { type: "PHOTO_RESOLVED"; photo: ResolvedPhotoMeta }
  | { type: "PHOTO_REPLACED" } // "Replace photo" — back to empty step 1
  | { type: "RIGHTS_CHANGED"; confirmed: boolean }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "GO_TO_STEP"; step: ConverterStep } // stepper: completed steps only
  | { type: "CROP_CHANGED"; crop: Partial<CropState> }
  | { type: "ENGINE_SELECTED"; engine: ConversionEngine }
  | { type: "STYLE_SELECTED"; style: ConversionSettings["style"] }
  | { type: "SETTINGS_CHANGED"; settings: Partial<ConversionSettings> }
  | { type: "CONVERT_REQUESTED"; job: ConversionJob } // 3→4, or a retry on 4
  | { type: "JOB_PROGRESS"; progress: ConversionProgress }
  | { type: "JOB_COMPLETED"; job: ConversionJob }
  | { type: "JOB_FAILED"; job: ConversionJob | null; error: ConversionErrorInfo }
  | { type: "JOB_CANCELLED" } // returns to step 3, settings intact
  | { type: "RETRY_WITH_MORE_CONTRAST" } // remedy: bump contrast, stay on 4
  | { type: "CONTINUE_TO_PRINT" } // 4 (completed) → 5
  | { type: "BACK_TO_SETTINGS" } // failure remedy → step 3, error cleared
  | { type: "START_OVER" }
  | { type: "SESSION_RESTORED"; state: ConverterState };

const STEP_STATUS: Record<ConverterStep, ConverterStatus> = {
  1: "uploaded",
  2: "cropping",
  3: "style-selected",
  4: "completed",
  5: "printing",
};

function atStep(state: ConverterState, step: ConverterStep): ConverterState {
  return {
    ...state,
    step,
    status: step === 1 && !state.photo ? "idle" : STEP_STATUS[step],
  };
}

export function converterReducer(
  state: ConverterState,
  event: ConverterEvent,
): ConverterState {
  switch (event.type) {
    case "PHOTO_RESOLVED":
      // A new photo resets crop and any previous result, keeps settings —
      // adults often convert several photos with the same preferences.
      return {
        ...state,
        status: "uploaded",
        step: 1,
        photo: event.photo,
        rightsConfirmed: false,
        crop: DEFAULT_CROP,
        job: null,
        progress: null,
        error: null,
      };

    case "PHOTO_REPLACED":
      // Settings and engine are preferences, not photo state — keep them.
      return {
        ...INITIAL_CONVERTER_STATE,
        settings: state.settings,
        engine: state.engine,
      };

    case "ENGINE_SELECTED":
      if (state.status === "processing") return state;
      return { ...state, engine: event.engine };

    case "RIGHTS_CHANGED":
      if (!state.photo) return state;
      return { ...state, rightsConfirmed: event.confirmed };

    case "NEXT": {
      if (state.status === "processing") return state;
      if (state.step === 1 && (!state.photo || !state.rightsConfirmed))
        return state;
      // 3→4 is CONVERT_REQUESTED (the picture must exist before Adjust);
      // 4→5 is CONTINUE_TO_PREVIEW; 5→6 is CONTINUE_TO_PRINT.
      if (state.step >= 3) return state;
      return atStep(state, (state.step + 1) as ConverterStep);
    }

    case "BACK": {
      if (state.status === "processing") return state;
      if (state.step === 1) return state;
      // Leaving a failure via Back is the same as the remedy: settings
      // home, error cleared. All Back moves are lossless by construction.
      const target = (state.status === "error" ? 3 : state.step - 1) as ConverterStep;
      return { ...atStep(state, target), error: null, progress: null };
    }

    case "GO_TO_STEP": {
      if (state.status === "processing") return state;
      if (event.step >= state.step) return state; // stepper only goes back
      if (event.step === 5) return state;
      // Step 4 only exists once a result does.
      if (event.step === 4 && state.job?.status !== "completed") return state;
      return { ...atStep(state, event.step), error: null };
    }

    case "CROP_CHANGED":
      if (!state.photo) return state;
      return { ...state, crop: { ...state.crop, ...event.crop } };

    case "STYLE_SELECTED":
      if (!state.photo) return state;
      return {
        ...state,
        settings: { ...state.settings, style: event.style },
      };

    case "SETTINGS_CHANGED":
      return {
        ...state,
        settings: {
          ...state.settings,
          ...event.settings,
          advanced: {
            ...state.settings.advanced,
            ...event.settings.advanced,
          },
        },
      };

    case "CONVERT_REQUESTED":
      if (!state.photo || !state.rightsConfirmed) return state;
      if (state.status === "processing") return state;
      return {
        ...state,
        status: "processing",
        step: 4,
        job: event.job,
        progress: null,
        error: null,
      };

    case "JOB_PROGRESS":
      if (state.status !== "processing") return state;
      return { ...state, progress: event.progress };

    case "JOB_COMPLETED":
      if (state.status !== "processing") return state;
      return {
        ...state,
        status: "completed",
        step: 4,
        job: event.job,
        progress: null,
        error: null,
      };

    case "JOB_FAILED":
      if (state.status !== "processing") return state;
      // The core invariant: stay put (step 4), keep every setting.
      return {
        ...state,
        status: "error",
        step: 4,
        job: event.job,
        progress: null,
        error: event.error,
      };

    case "JOB_CANCELLED":
      if (state.status !== "processing") return state;
      return {
        ...atStep(state, 3),
        job: null,
        progress: null,
        error: null,
      };

    case "RETRY_WITH_MORE_CONTRAST": {
      // Bumps the likely fix; the caller then issues CONVERT_REQUESTED,
      // which is what moves status to "processing".
      if (state.status !== "error") return state;
      const bumped: ConversionSettings = {
        ...state.settings,
        advanced: { ...state.settings.advanced, contrast: "stronger" },
      };
      return { ...state, settings: bumped };
    }

    case "CONTINUE_TO_PRINT":
      if (state.status !== "completed") return state;
      return atStep(state, 5);

    case "BACK_TO_SETTINGS":
      if (state.status === "processing") return state;
      return { ...atStep(state, 3), error: null, progress: null };

    case "START_OVER":
      return { ...INITIAL_CONVERTER_STATE, engine: state.engine };

    case "SESSION_RESTORED":
      // Never restore into a mid-flight job — the work is gone after a
      // refresh; land back at the settings home with everything intact.
      if (
        event.state.status === "processing" ||
        event.state.status === "error"
      ) {
        return { ...atStep(event.state, 3), job: null, progress: null, error: null };
      }
      return event.state;

    default:
      return state;
  }
}
