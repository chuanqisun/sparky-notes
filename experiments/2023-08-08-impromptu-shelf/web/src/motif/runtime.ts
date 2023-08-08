import type { RuntimePlugin } from "@h20/motif-lang";

export interface ShelfItem {
  displayName: string;
  data: any;
}

export type ShelfPlugin = RuntimePlugin<ShelfRuntime>;

export interface ShelfRuntime {
  getItems: () => ShelfItem[];
  setItems: (items: ShelfItem[]) => void;
  setStatus: (status: string) => void;
  signal: AbortSignal;
}
