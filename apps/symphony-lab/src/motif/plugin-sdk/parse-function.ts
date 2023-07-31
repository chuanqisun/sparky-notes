export function parseFunction<ParamsType extends any[], ReturnType>(src: string): (...args: ParamsType) => ReturnType {
  const functionParams =
    src
      ?.match(/function\s*.+?\((.+?)\)/m)?.[1]
      .trim()
      ?.split(",")
      .map((i) => i.trim())
      .filter(Boolean) ?? [];

  const functionBody = src?.match(/function\s*.+?\s*\{((.|\n)*)\}/m)?.[1].trim() ?? "";
  if (!functionBody) throw new Error("Function body not found between curly braces");

  const parsedFunction = new Function(...[...functionParams, functionBody]) as (...args: ParamsType) => ReturnType;
  return parsedFunction;
}
