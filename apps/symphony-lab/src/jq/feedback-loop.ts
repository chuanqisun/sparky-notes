async function feedbackLoop<T>(runFn: (previousError?: any) => T, retryLeft = 3, previousError?: any) {
  if (retryLeft <= 0) throw new Error("Failed to converge");
  try {
    return await runFn(previousError);
  } catch (e: any) {
    return feedbackLoop(runFn, retryLeft - 1, e);
  }
}
