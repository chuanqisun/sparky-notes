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

export const CREATE_CLAIM_TRIPLE_SCHEMA = `
:create claimTriple {
  claimId: String,
  s: String,
  p: String,
  o: String,
}`;

export const CREATE_HNSW_INDEX = `
::hnsw create entity:semantic{
  fields: [vec],
  dim: 1536,
  ef: 16,
  m: 32,
}
`;

export const PUT_ENTITY = `
?[text, vec] <- [[
  $text,
  $vec,
]]

:put entity {
  text,
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
