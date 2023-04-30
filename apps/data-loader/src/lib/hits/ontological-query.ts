export interface ClaimTriple extends Triple {
  claimId: string;
}

export interface Triple {
  s: string;
  p: string;
  o: string;
}

export async function fullTripleQuery(triples: Triple): Promise<ClaimTriple[]> {
  // to be implemented
  return [];
}

export async function entityQuery(entity: string): Promise<ClaimTriple[]> {
  // to be implemented
  return [];
}
