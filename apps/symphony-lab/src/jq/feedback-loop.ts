async function feedbackLoop<T>(onIterate: (previousError?: any) => T, retryLeft = 3, previousError?: any) {
  if (retryLeft <= 0) throw new Error("Failed to converge");
  try {
    return await onIterate(previousError);
  } catch (e: any) {
    return feedbackLoop(onIterate, retryLeft - 1, e);
  }
}

async function llmForEachTransform(data: any, goal: string) {
  const onIterate = (previousError?: any) => {};

  return feedbackLoop(onIterate);
}
