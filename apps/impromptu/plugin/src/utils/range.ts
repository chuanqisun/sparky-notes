// check if two ranges overlap. A and B may partially overlap or fully overlap
export function isRangeOverlap(rangeA: [number, number], rangeB: [number, number]): boolean {
  const [startA, endA] = rangeA;
  const [startB, endB] = rangeB;
  return (startA <= startB && startB <= endA) || (startA <= endB && endB <= endA);
}

// based on Separating Axis Theorem
export function doesRectIntersect(rectA: Rect, rectB: Rect): boolean {
  return rectA.x < rectB.x + rectB.width && rectA.x + rectA.width > rectB.x && rectA.y < rectB.y + rectB.height && rectA.y + rectA.height > rectB.y;
}
