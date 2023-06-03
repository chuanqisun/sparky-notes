const decorators = {
  goals: (concept: string, query: string) => `Can ${concept} achieve "${query}"?`,
  problems: (concept: string, query: string) => `Can ${concept} solve "${query}"?`,
  supporters: (concept: string, query: string) => `Will ${query} benefit from ${concept}?`,
  protesters: (concept: string, query: string) => `Will ${query} dislike ${concept}?`,
  guidanceDo: (concept: string, query: string) => `Is "${query}" a rational recommendation for ${concept}?`,
  guidanceDont: (concept: string, query: string) => `Is "${query}" a rational prohibition for ${concept}?`,
  conceptAlternativeNames: (concept: string, query: string) => `What do we know about the concept similar to ${concept}, called "${query}"?`,
  questionedConcepts: (concept: string, query: string) => `${concept} raises a question about "${query}", what is the answer?`,
  "": (_concept: string, query: string) => query,
};

function getDecoratorName(progressObject: any, query: string): keyof typeof decorators {
  if (progressObject.goals.includes(query)) {
    return "goals";
  } else if (progressObject.problems?.includes(query)) {
    return "problems";
  } else if (progressObject.supporters?.includes(query)) {
    return "supporters";
  } else if (progressObject.protesters?.includes(query)) {
    return "protesters";
  } else if (progressObject.guidance?.dos?.includes(query)) {
    return "guidanceDo";
  } else if (progressObject.guidance?.donts?.includes(query)) {
    return "guidanceDont";
  } else if (progressObject.concept.alternativeNames?.includes(query)) {
    return "conceptAlternativeNames";
  } else if (progressObject.questionedConcepts?.includes(query)) {
    return "questionedConcepts";
  }

  return "";
}

export function decorateQuery(progressObject: any, concept: string, query: string) {
  const decoratorName = getDecoratorName(progressObject, query);
  return decorators[decoratorName](concept, query);
}
