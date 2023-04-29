export interface ClaimTriple extends Triple {
  claimId: string;
}

export interface Triple {
  s: string;
  p: string;
  o: string;
}

export async function ontologicalQuery(triples: Triple): Promise<ClaimTriple[]> {
  // to be implemented
  return [];
}
