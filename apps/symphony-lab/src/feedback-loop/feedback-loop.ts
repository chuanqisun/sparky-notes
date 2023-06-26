export interface FeedbackLoopConfig<T> {
  state: T;
  iterate: (state: T) => IterateOutput<T>;
  retry?: number;
}

export interface IterateOutput<T> {
  success?: boolean;
  state: T;
}

export async function runFeedbackLoop<T>(config: FeedbackLoopConfig<T>): Promise<T> {
  const { state, iterate, retry = 3 } = config;
  const resut = await iterate(state);

  if (resut.success) return resut.state;
  if (retry <= 0) throw new Error("Max retry failed");

  return runFeedbackLoop({ state: resut.state, iterate: iterate, retry: retry - 1 });
}

export interface LensLoopState {
  testData: any;
  attempts: {
    lens?: any;
    result?: any;
    feedback?: any;
  }[];
}

export async function iterateLens(state: LensLoopState) {
  try {
    const currentAttempt = state.attempts.at(-1)!;
    currentAttempt.lens = await proposeLens(state);
    const result = applyLens(currentAttempt.lens, state.testData);
    if (!validateLensResult(result)) throw new Error("Invalid lens");

    return {
      success: true,
      state,
    };
  } catch (e: any) {
    const sensibleErrorMessage = [e?.name, e?.message ?? e?.stack].filter(Boolean).join(" ").trim();
    return {
      success: false,
      state: {
        ...state,
        attempts: [...state.attempts, { lens: state.proposedLens, result: null, feedback: sensibleErrorMessage }],
      },
    };
  }
}

async function proposeLens(state: LensLoopState) {
  return "";
}

function applyLens(lens: any, data: any) {
  return lens(data);
}

function validateLensResult(result: any) {
  return true;
}
