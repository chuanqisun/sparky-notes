# Motif Language

Modular Object Transform and Inference Formula

- Address issues from v1
  - No clear separation between statement and nested expressions
    - Multi-line string may cause additional confusion
  - "/" symbol is commonly used in natural language
- Inspirations
  - Haskell
  - TOML
  - Lisp

## Concepts v2

- Use `!<identifier>` for directives
- Use `$(<shelf>)` for variables
- Use `@<identifier>` for functions
- Use `;` to separate statements
- White space significant at line start
