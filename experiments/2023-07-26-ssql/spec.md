# Semi-structured Query Language

## Principles

1. Expressive
2. Flexible
3. Learnable

## Data structure

- Primarily support list of items with mixed type: `List<unknown>`
- Secondarily support list of items of the same type: `List<T>`
- No support for non-list data structure

## Primary tasks

- Prioritizing
- Inference
- Computation
- Categorization
- Aggregation
- Reporting
- Correlation
- Extraction

## Supportive tasks

- Importing
- Searching
- Annotation
- Decluttering
- Transformation
- Pivoting

## Operations

Exposed as SDK functions to the tools, not the user
Goal is maintaining records for provenance

```
workspace level
  create list
  remove list
  update list
  switch active list
list level
  add items
  remove items
  update items
  sort items
  group items
  rename list
item level
  add field
  remove field
  update field
```

## Future operations

- Multi-list operations

## Statement design

- Non-destructive by default

## Implementation examples

- HITS
  - `/hits/search <query>`
  - `/core/use title /hits/search`
  - `/core/filterTo items tagged with "UX Problem" /core/use title /hits/similar`
- LLM
  - `/core/use title and content /llm/filterTo items that mention the "create new" UX pattern`
  - `/core/use speech text /llm/infer speaker's sentiment`
  - `/core/filterTo negative sentiment items /llm/sortBy severity`
  - `/llm/chat <message>`
  - `/llm/themesOf <topic>`
  - `/llm/categorize <categories>`
- Core utils
  - `/core/filterTo`
  - `/core/sortBy`
  - `/core/item`
  - `/core/list`
  - `/core/workspace`
  - `/core/history`
  - `/core/groupBy`
  - `/core/new`
  - `/core/import`
  - `/core/export`
  - `/core/clear`
  - `/core/new`
- Agent
  - `@hits review the literature about "create new" pattern`

Note: `All /core/<operator>` can be simplified to `/<operator>`

## Extended examples
