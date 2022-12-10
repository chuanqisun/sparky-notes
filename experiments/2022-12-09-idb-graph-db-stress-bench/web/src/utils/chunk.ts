export function getPageOffsets(size: number, total: number): number[] {
  let offset = 0;
  const offsets: number[] = [];
  while (offset < total) {
    offsets.push(offset);
    offset += size;
  }

  return offsets;
}
