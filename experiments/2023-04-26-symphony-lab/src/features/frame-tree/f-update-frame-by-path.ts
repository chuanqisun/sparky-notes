import type { Frame } from "./frame-tree";

export function fUpdateFrameByPath(idPath: string[], update: (frame: Frame) => Frame, frame: Frame) {
  if (!idPath.length) throw new Error("idPath must not be empty");
  const mutableFrame = { ...frame };
  const [currentId, ...remainingIdPath] = idPath;

  if (remainingIdPath.length === 0) {
    if (currentId !== mutableFrame.id) throw new Error(`Frame with id "${currentId}" not found`);
    Object.assign(mutableFrame, update(mutableFrame));
  } else {
    // recreate each frame in the path to the changed goal
    const nextFrameIndex = mutableFrame.children.findIndex((child) => child.id === remainingIdPath[0]);
    mutableFrame.children = [...mutableFrame.children];
    mutableFrame.children[nextFrameIndex] = fUpdateFrameByPath(remainingIdPath, update, mutableFrame.children[nextFrameIndex]);
  }

  return mutableFrame;
}
