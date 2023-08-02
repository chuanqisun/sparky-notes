# Motif Language

Modular Object Transform and Inference Formula

- Address issues from v1
  - No clear separation between statement and nested expressions
    - Multi-line string may cause additional confusion
  - "/" symbol is commonly used in natural language
- Expressivity
  - Cannot easily represent hierarchical programs
- Whitespace significance
  - Whitespace appear frequently in natrual language
  - Inserting tabs is easy, maintaining tabs on multiple rows is hard
- Inspirations
  - Literate programming
  - Smalltalk: dynamic function argument encapsulated as object
  - Haskell
  - TOML
  - Lisp
  - Bash
  - SQL

## Ideas for v2

- Use literate blocks for goal declaration
- Use `!<identifier>` for directives
- Use `$(<shelf>)` for variables
- Use `@<identifier>` for functions
- Use `;` to separate statements
- White space significant at line start
- Tab based indentation for hierarchical programs

```text
fn-name-1:
  arg1
  fn-name-2:
    arg1
    "long string that wraps to next
    line must be quoted"
  fn-name-3:
    arg1
```

- With the assumption that each function can only take one or two arguments, the syntax can be simplified to

```text
!clear

// comment
>namespace.fn-name do stuff
  >namespace.nested-fn-name do stuff
  >namespace.nested-fn-name do stuff

>namespace.fn-name do stuff
  >namespace.nested-fn-name do stuff
    >namespace.nested-fn-name do stuff

>namespace.fn-name do stuff with long
wrapped text input
  >namespace.nested-fn-name.namespace.part do stuff with
  long wrapped text input

  and it's ok even with empty line above

;
>namespace.fn-name @variableName
```
