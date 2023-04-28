export interface ClaimWithTriples extends Claim {
  triples: string[];
}

export interface Claim {
  claimId: string;
  claimType: number;
  claimTitle: string;
  claimContent: string;
  rootDocumentId: string;
  rootDocumentTitle: string;
  rootDocumentContext: string;
  methods: string[];
  products: string[];
  topics: string[];
  researchers: string[];
}
