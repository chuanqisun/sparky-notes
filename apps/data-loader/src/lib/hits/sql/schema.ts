export const SCHEMA = `
CREATE TABLE IF NOT EXISTS Embedding (
  id TEXT PRIMARY KEY,
  vec TEXT
);
`;

export const UPSERT_EMBEDDING = `
INSERT INTO Embedding (id, vec) VALUES (?, ?)
ON CONFLICT(id) DO UPDATE SET vec = excluded.vec;
`;

export const GET_EMBEDDING = `
SELECT vec FROM Embedding WHERE id = ?
`;
