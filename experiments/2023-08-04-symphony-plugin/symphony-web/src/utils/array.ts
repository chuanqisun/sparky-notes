export function randomSampleArrayItems<T extends any>(arr: T[], itemCount: number): T[] {
  const shuffled = arr.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, itemCount);
}

export function threePointSampleArrayItems<T extends any>(arr: T[]): T[] {
  if (!arr.length) return [];
  const samplePoints = [0, Math.floor(arr.length / 2), -1].map((index) => arr.at(index)).filter(Boolean) as T[];
  const uniqueSamples = [...new Set(samplePoints)];

  return uniqueSamples;
}

export function getChunks<T extends any>(array: T[], chunkSize: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
