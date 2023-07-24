export async function feedbackLoop<T>(onIterate: (previousError?: any) => T, retryLeft = 3, previousError?: any) {
  if (retryLeft <= 0) {
    console.error("Feedback loop retry limit reached");
    throw previousError ?? new Error("Unknown error");
  }
  try {
    return await onIterate(previousError);
  } catch (e: any) {
    return feedbackLoop(onIterate, retryLeft - 1, e);
  }
}
