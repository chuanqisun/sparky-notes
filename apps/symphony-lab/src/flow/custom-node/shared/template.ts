import type { GraphOutputItem } from "./graph";

export function getTemplateVariables(template: string) {
  return [...template.matchAll(/\{([^\}]+)\}/g)].map((match) => match[1]);
}

export interface InputCombo {
  variablesDict: Record<string, any>;
  sourceIds: string[];
}

export function getInputCombos(arrs: NamedInput[][]) {
  const decoratedWithSource: InputCombo[][] = arrs.map((arr) =>
    arr.map((item) => ({
      variablesDict: Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v.data])),
      sourceIds: [...new Set(Object.values(item).map((v) => v.id))],
    }))
  );
  return decoratedWithSource.reduce((acc, arr) => {
    const combinations: InputCombo[] = [];

    for (let i = 0; i < acc.length; i++) {
      for (let j = 0; j < arr.length; j++) {
        const combined = {
          variablesDict: { ...acc[i].variablesDict, ...arr[j].variablesDict },
          sourceIds: [...new Set([...acc[i].sourceIds, ...arr[j].sourceIds])],
        };
        combinations.push(combined);
      }
    }
    return combinations;
  });
}

export type NamedInput = Record<string, GraphOutputItem>;
export function bulkBindTemplateVariablesByPositionV2(variables: string[], inputs: GraphOutputItem[][]): NamedInput[][] {
  const variableWithValues = variables.map((variable, variableIndex) => {
    return inputs[variableIndex].map((input) => ({ [variable]: input }));
  });

  return variableWithValues;
}

// for each variable, use the corresponding input to get a list of possible values

export function renderTemplate(template: string, params: any) {
  return template.replace(/\{([^\}]+)\}/g, (_, p1) => {
    return params[p1];
  });
}
