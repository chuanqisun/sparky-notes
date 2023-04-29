export const CREATE_GRAPH_SCHEMA = `
:create triple {
  id: String
  => 
  s: String,
  p: String,
  o: String,
  sVec: <F32; 1536>,
  pVec: <F32; 1536>,
  oVec: <F32; 1536>,
}
`;

export const CREATE_HNSW_INDEX = `
::hnsw create triple:semantic{
  fields: [sVec, pVec, oVec],
  dim: 1536,
  ef: 16,
  m: 32,
}
`;

export const PUT_CLAIM_TRIPLE = `
?[id, s, p, o, sVec, pVec, oVec] <- [[
  $id,
  $s,
  $p,
  $o,
  $sVec,
  $pVec,
  $oVec,
]]

:put triple {
  id
  =>
  s,
  p,
  o,
  sVec,
  pVec,
  oVec,
}

:timeout 0
`;
