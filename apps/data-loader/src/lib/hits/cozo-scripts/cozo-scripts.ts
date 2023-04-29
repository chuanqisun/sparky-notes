export const CREATE_GRAPH_SCHEMA = `
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
