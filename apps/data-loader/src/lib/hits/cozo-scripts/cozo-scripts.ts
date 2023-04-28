export const CREATE_GRAPH_SCHEMA = `
:create triple {
  id: String
  => 
  subject: String,
  predicate: String,
  object: String,
  subjectVec: <F32; 1536>,
  predicateVec: <F32; 1536>,
  objectVec: <F32; 1536>,
}
`;
