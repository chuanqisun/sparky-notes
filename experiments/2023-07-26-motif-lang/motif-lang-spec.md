# Motif Language

Modular Object Transform and Inference Formula

## Principles

1. Expressive
2. Natural
3. Modular

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
  - `/core/compute`
- Agent
  - `@hits review the literature about "create new" pattern`

Note: `All /core/<operator>` can be simplified to `/<operator>`

## Language frontend

```

# Item level by default
/<do>
/each /<do>

# Item level with field lens
/each title /<do>

# Shelf level
/all /<do>

# Shelf level with field lens
/all titles /<do>

# Item level operators can affect total number of items
/filter <predicate>
/each /filter <predicate>

# Item level operator can affect shape of all items
/groupBy <criteria>
/each /groupBy <criteria>

# Most operators has, blank, auto, infer, compute variants. Blank must behalf as one of the infer, compute, or auto variants
/filter
/filter/auto
/filter/infer
/filter/compute

# Some operators may ignore /each /all selectors
/import/json
/export/excel

# When an operator is unambiguous, prefix can be omitted
/llm/infer
/infer # OK

/llm/sort
/core/sort
/sort # ERR: ambiguous operator, which one?

```

## Language backend (future)

Programs can be "compiled" to achieve deterministic behaviors

- All `/compute` tasks should be persisted with the code
- All natural language queries should be transformed to hard parameters
- When running against new data, the program might need JIT-compiled to handle data type changes

## Multi-clause program (future)

```
# Each clause can span multiple lines
/each title
/filter/infer contains positive sentiment

# Multiple clauses can be "piped", even with newlines in between
/each title
/filter/infer contains positive sentiment
|
/each title
/filter/infer is related to Azure

# Alternatively
/each title
/filter/infer contains positive sentiment
/pipe
/each title
/filter/infer is related to Azure
```
