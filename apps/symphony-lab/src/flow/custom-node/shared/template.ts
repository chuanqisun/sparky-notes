import type { GraphOutputItem } from "./graph";

function combineTwoArrays(arr1: any[], arr2: any[]): any[] {
  const combinations = [];
  for (let i = 0; i < arr1.length; i++) {
    for (let j = 0; j < arr2.length; j++) {
      combinations.push({ ...arr1[i], ...arr2[j] });
    }
  }
  return combinations;
}

export function combineNArrays(...arrs: any[][]) {
  // use reducer and `combineTwoArrays` to combine all arrays
  return arrs.reduce((acc, arr) => combineTwoArrays(acc, arr));
}

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

/** @deprecated due to lack of provenance. */
export function bulkBindTemplateVariablesByPosition(variables: string[], inputs: any[][]) {
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
