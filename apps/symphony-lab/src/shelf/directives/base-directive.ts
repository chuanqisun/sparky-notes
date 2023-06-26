export interface ShelfDirective {
  match: (source: string) => boolean;
  run: (input: ShelfDirectiveInput) => Promise<ShelfDirectiveOutput> | ShelfDirectiveOutput;
}

export interface ShelfDirectiveInput {
  source: string;
  data: any[];
  updateStatus: (status: string) => void;
  updateData: (data: any[]) => void;
}

export interface ShelfDirectiveOutput {
  data?: any[];
  status?: string;
}
