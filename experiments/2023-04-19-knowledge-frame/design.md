# A Visual programing, reasoning, and analysis IDE for UX researchers

## Mental Model

- Pipeline: a series of fully connected Frames, Operators, Observers, Connectors, and Pipelines
  - Frame: universal container of data, affording manipulation
  - Operator: function that manipulates the Frame or the data within the Frame
  - Observer: user friendly view for the data within the Frame
  - Connection: allow multiple Operators to process Frames in a predefined sequence
  - Pipeline: a pipeline may compose other Pipelines
- Workspace: a set of disjoint Pipelines

## Visual representation

- Affordance
  - Node is Operator
  - Frame is Operator
  - Observer is implemented as an Operator too
  - Link is the connection from Node to Node
- Pros
  - All the benefits from Concept 4: Data + Operation hybrid
  - Additional affordance on the Frame for interactive data exploration
  - Reduced connection complexity because all the nodes are operators

## Frame design

- Flexible Underlying data structure
  - Plaintext, list, table, or graph
- Universal query interface
  - Schema reflection
  - Precise: GraphQL like structural query on JSON
  - Fuzzy: Keyword search and embedding based search
  - With pagination
  - Iteratable
- Immutable by nature, Operator should create new Frame instead of mutating existing Frames
  - Replace the need for mutation with the composition of Query and Construction
- Universal construction interface

## Operator design

- Create: create a new Frame from any unframed data (fp e.g. lift)
- Transform: create a new Frame from an existing Frame of data (fp e.g. map)
- Fork: creates multiple Frames of data from an existing Frame of data
- Join: creates a single Frame of data from multiple existing Frames of data
- Observe: provide a specific view of the data without changing the Frame or the data (tap)

## Example workflow for UX Researcher

## Appendix I. Issues with Impromptu

- Sizing change of data sections, forcing the user to adopt a linear layout
- Impossible to work with dynamically generated sections and retain reuseability
- Stickies afford at most two dimensions. The higher the dimension, the less the interoperability

## Appendix II. Alternative visual representations

### Concept 1: Data first

- Affordance
  - Node is Frame
  - Link is the Operator with Connections from the Frame before, and to the Frame after
- Pros
  - Easy data inspection
  - Explicit manipulation of data
- Cons
  - Link can not represent Fork and Join Operator

### Concept 2: Operation first

- Affordance
  - Node is Operator
  - Link is the Frame with Connections from the Operator before, and to the Operator after
- Pro
  - Easy programming and sharing of programs
  - Explicit manipulation of process
- Cons
  - Cognitive load for higher-order manipulation
  - Difficult to implement Fork and Join Operators beyond simple cloning and merging
  - Difficult to represent the heads and tails of the Pipelines

### Concept 3: Data + Operation closed semantics

- Affordance
  - Node is either a Frame, an Operator, or an Observer
  - Link is Connection from Operator to Operator/Observer, or from Operator/Observer to Frame
- Pro
  - Flexible semantics
    - Forking after and Joining before Frames means naïve cloning/merging
    - Forking after and Joining before Operators allows Operator to define its meaning
- Con
  - Difficult to implement
    - Connection requires type checking
  - Difficult to build
    - Must alternate between Operator/Observer and Frame

### Concept 4: Data + Operation open semantics

- Affordance
  - Node is either a Frame, an Operator, or an Observer
  - Link is Connection of arbitrary types
- Pro
  - Most flexible semantics
    - Forking after and Joining before Frames means naïve cloning/merging
    - Forking after and Joining before Operators allows Operator to define its meaning
    - Frame to Frame means clone
    - Operator/Observer to Operator/Observer means data forwarding
- Con
  - Most difficult to implement
  - Most difficult to learn
