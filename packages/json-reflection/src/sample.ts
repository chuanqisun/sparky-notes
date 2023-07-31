/**
 * A utility function for sampling data
 *
 * Walk the entire json tree and output a reduced json object by sampling the input
 * long strings will be cropped
 * arrays will be cropped to 3 elements (head, middle, tail)
 */
export function sample(object: any): any {
  const type = typeof object;
  switch (type) {
    case "object":
      if (object === null) {
        return null;
      } else if (Array.isArray(object)) {
        // sample head, middle, tail
        if (!object.length) return [];
        const uniqueSamples = threePointSampleArrayItems(object);
        return uniqueSamples.map(sample);
      } else {
        return Object.fromEntries(
          Object.entries(object).map(([key, value]) => {
            return [key, sample(value)];
          })
        );
      }
    case "string":
      return trimTextIfOverflow(48)(object); // for reference: uuid is 36 char long
    default:
      return object;
  }
}

function trimTextIfOverflow(length: number) {
  return (text: string) => {
    if (text.length > length) {
      return text.slice(0, length) + "...";
    } else {
      return text;
    }
  };
}

function threePointSampleArrayItems<T extends any>(arr: T[]): T[] {
  if (!arr.length) return [];
  const samplePoints = [0, Math.floor(arr.length / 2), -1].map((index) => arr.at(index)).filter(Boolean) as T[];
  const uniqueSamples = [...new Set(samplePoints)];

  return uniqueSamples;
}
