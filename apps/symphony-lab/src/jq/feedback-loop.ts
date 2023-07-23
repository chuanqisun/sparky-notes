async function feedbackLoop<T>(onIterate: (previousError?: any) => T, retryLeft = 3, previousError?: any) {
  if (retryLeft <= 0) throw new Error("Failed to converge");
  try {
    return await onIterate(previousError);
  } catch (e: any) {
    return feedbackLoop(onIterate, retryLeft - 1, e);
  }
}

async function llmForEachTransform(data: any, goal: string, fnCall: any, chatCall: any) {
  const designLens = async (previousError?: any) => {
    const messages = getChatMessages(goal, data, previousError);
    const result = await fnCall(messages);
    const createLens = getLensFactory(result);
    return createLens(data);
  };

  const lenses = await feedbackLoop(designLens);
  const results = lenses.map((lens) => lens.set(chatCall(lens.get())));

  return results;
}
function getChatMessages(goal: string, data: any, previousError: any) {
  return [] as string[];
}

function getLensFactory(result: any) {
  return (...args: any[]) => ({} as any[]);
}
