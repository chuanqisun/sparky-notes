interface IteratorConfig<TGoal, TPlan, TResult, TFeedback> {
  goal: TGoal;
  plan?: TPlan;
  result?: TResult;
  feedback?: TFeedback;
  onPlan: (goal: TGoal, plan?: TPlan, result?: TResult, feedback?: TFeedback) => Promise<TPlan> | TPlan;
  onRun: (plan: TPlan) => Promise<TResult> | TResult;
  onEval: (goal: TGoal, plan: TPlan, result: TResult) => Promise<TFeedback> | TFeedback;
  onExit: (goal: TGoal, result: TResult, feedback: TFeedback) => boolean;
}

async function iterate<TGoal, TPlan, TResult, TFeedback>(config: IteratorConfig<TGoal, TPlan, TResult, TFeedback>) {
  const { goal, plan: prevPlan, result: prevResult, feedback: prevFeedback } = config;

  const newPlan = await config.onPlan(goal, prevPlan, prevResult, prevFeedback);
  const newResult = await config.onRun(newPlan);
  const newFeedback = await config.onEval(goal, newPlan, newResult);

  if (config.onExit(goal, newResult, newFeedback)) {
    return { plan: newPlan, result: newResult, feedback: newFeedback };
  } else {
    return iterate({ ...config, goal, plan: newPlan, result: newResult, feedback: newFeedback });
  }
}
