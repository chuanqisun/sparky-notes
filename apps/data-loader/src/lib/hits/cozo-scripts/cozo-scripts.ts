export const GET_RELATIONS = `
::relations
`;

export const CREATE_ENTITY_SCHEMA = `
:create entity {
  text: String
  =>
  vec: <F32; 1536>,
}
`;

export const CREATE_HNSW_INDEX = `
::hnsw create entity:semantic{
  fields: [vec],
  dim: 1536,
  ef: 16,
  m: 32,
}
`;

export const CREATE_CLAIM_SCHEMA = `
:create claim {
  claimId: String
  =>
  claimType: Int,
  claimTitle: String,
  claimContent: String,
  rootDocumentId: String,
  rootDocumentTitle: String,
  rootDocumentContext: String,
  methods: [String],
  products: [String],
  topics: [String],
  researchers: [String],
}
`;

export const CREATE_CLAIM_FTS_INDEX = `
::fts create claim:fts {
  extractor: claimTitle,
  tokenizer: Simple,
}
`;

export const CREATE_CLAIM_TRIPLE_SCHEMA = `
:create claimTriple {
  claimId: String,
  s: String,
  p: String,
  o: String,
}`;

export const PUT_CLAIM = `
?[claimId, claimType, claimTitle, claimContent, rootDocumentId, rootDocumentTitle, rootDocumentContext, methods, products, topics, researchers] <- [[
  $claimId,
  $claimType,
  $claimTitle,
  $claimContent,
  $rootDocumentId,
  $rootDocumentTitle,
  $rootDocumentContext,
  $methods,
  $products,
  $topics,
  $researchers,
]]

:put claim {
  claimId
  =>
  claimType,
  claimTitle,
  claimContent,
  rootDocumentId,
  rootDocumentTitle,
  rootDocumentContext,
  methods,
  products,
  topics,
  researchers,
}

:timeout 0
`;

export const SEARCH_CLAIMS = `

?[s, claimTitle, claimId] := ~claim:fts {claimTitle |
  query: $q,
  k: 10,
  score_kind: 'tf_idf',
  bind_score: s
}, *claim{claimId, claimTitle}

:order -s
`;

export const PUT_ENTITY = `
?[text, vec] <- [[
  $text,
  $vec,
]]

:put entity {
  text
  =>
  vec,
}

:timeout 0
`;

export const PUT_CLAIM_TRIPLE = `
?[claimId, s, p, o] <- [[
  $claimId,
  $s,
  $p,
  $o,
]]

:put claimTriple {
  claimId,
  s,
  p,
  o,
}

:timeout 0
`;
