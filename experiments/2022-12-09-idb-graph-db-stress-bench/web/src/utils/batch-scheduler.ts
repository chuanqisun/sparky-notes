export async function batchScheduler(batchSize: number, total: number, onExecute: (index: number, isBoundary: boolean, isEnd: boolean) => any) {
  let breakPoint = batchSize;
  for (let i = 0; i < total; i++) {
    const isBoundary = i === breakPoint;
    onExecute(i, isBoundary, i === total);
    if (i === breakPoint) await new Promise(tick), (breakPoint += batchSize);
  }
}

const tick = (resolve: Function) => setTimeout(resolve, 0);
