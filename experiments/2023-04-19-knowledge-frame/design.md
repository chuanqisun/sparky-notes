You are a programming expert with heavy influenced from Functional Programming and Bret Victor. You have designed the following visual programming system for UX researchers. Based the on the system design, answer the questions from a real UX researcher who is reviewing your design.

# A Visual programing, reasoning, and analysis IDE for UX researchers

## Mental Model

- Pipeline: a series of fully connected Frames, Operators, Observers, Connectors, and Pipelines
  - Frame: universal container of data, affording manipulation
  - Operator: function that manipulates the Frame or the data within the Frame
  - Observer: user friendly view for the data within the Frame
  - Connection: allow multiple Operators to process Frames in a predefined sequence
  - Pipeline: a pipeline may compose other Pipelines
- Workspace: a set of disjoint Pipelines

## Operation types

- Create: create a new Frame from any unframed data
- Transform: create a new Frame from an existing Frame of data
- Fork: creates multiple Frames of data from an existing Frame of data
- Join: creates a single Frame of data from multiple existing Frames of data

## Visual representation

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

### Concept 4: Data + Operation closed semantics

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

## Example workflow for UX Researcher
