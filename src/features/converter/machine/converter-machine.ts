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
export type ConverterStep = 1 | 2 | 3 | 4 | 5 | 6;

export type ConverterStatus =
  | "idle" // step 1, no photo yet
  | "uploaded" // step 1, photo resolved, rights pending/confirmed
  | "cropping" // step 2
  | "style-selected" // step 3
  | "adjusting" // step 4
  | "processing" // step 5, job running
  | "completed" // step 5, result ready for review
  | "printing" // step 6
  | "error"; // step 5, job failed — settings intact

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
  | { type: "CONVERT_REQUESTED"; job: ConversionJob }
  | { type: "JOB_PROGRESS"; progress: ConversionProgress }
  | { type: "JOB_COMPLETED"; job: ConversionJob }
  | { type: "JOB_FAILED"; job: ConversionJob | null; error: ConversionErrorInfo }
  | { type: "JOB_CANCELLED" } // returns to step 4, settings intact
  | { type: "RETRY_WITH_MORE_CONTRAST" } // remedy: bump contrast, stay on 5
  | { type: "CONTINUE_TO_PRINT" }
  | { type: "BACK_TO_ADJUSTMENTS" }
  | { type: "START_OVER" }
  | { type: "SESSION_RESTORED"; state: ConverterState };

/** Steps whose entry requirements are met, given the current state. */
export function reachableStep(state: ConverterState): ConverterStep {
  if (!state.photo || !state.rightsConfirmed) return 1;
  if (state.job?.status === "completed") return 6;
  return 4;
}

const STEP_STATUS: Record<ConverterStep, ConverterStatus> = {
  1: "uploaded",
  2: "cropping",
  3: "style-selected",
  4: "adjusting",
  5: "completed",
  6: "printing",
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
      if (state.step >= 4) return state; // 4→5 is CONVERT_REQUESTED, 5→6 is CONTINUE_TO_PRINT
      return atStep(state, (state.step + 1) as ConverterStep);
    }

    case "BACK": {
      if (state.status === "processing") return state;
      if (state.step === 1) return state;
      // From step 5/6, Back returns to Adjust — lossless by construction.
      const target = (state.step >= 5 ? 4 : state.step - 1) as ConverterStep;
      return atStep(state, target);
    }

    case "GO_TO_STEP": {
      if (state.status === "processing") return state;
      if (event.step >= state.step) return state; // stepper only goes back
      if (event.step === 5 || event.step === 6) return state;
      return atStep(state, event.step);
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
      return {
        ...state,
        status: "processing",
        step: 5,
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
        step: 5,
        job: event.job,
        progress: null,
        error: null,
      };

    case "JOB_FAILED":
      if (state.status !== "processing") return state;
      // The core invariant: stay on step 5, keep every setting.
      return {
        ...state,
        status: "error",
        step: 5,
        job: event.job,
        progress: null,
        error: event.error,
      };

    case "JOB_CANCELLED":
      if (state.status !== "processing") return state;
      return {
        ...atStep(state, 4),
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
      return atStep(state, 6);

    case "BACK_TO_ADJUSTMENTS":
      if (state.status === "processing") return state;
      return { ...atStep(state, 4), error: null };

    case "START_OVER":
      return { ...INITIAL_CONVERTER_STATE, engine: state.engine };

    case "SESSION_RESTORED":
      // Never restore into a mid-flight job — the work is gone after a
      // refresh; land on the nearest safe step with everything else intact.
      if (
        event.state.status === "processing" ||
        event.state.status === "error"
      ) {
        return { ...atStep(event.state, 4), job: null, progress: null, error: null };
      }
      return event.state;

    default:
      return state;
  }
}
