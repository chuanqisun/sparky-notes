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
  - Frame is contained in Node
  - Observer is special type of Operator for human readability
  - Link is the connection from Node to Node
- Pros
  - Clear ownership of data (it belongs to the operator)
  - Simple UX with Node and Connection
- Cons
  - All operators are stateful
  - Fork requires pre-fork selector

## Frame design

- Flexible Underlying data structure
  - Plaintext, list, table, or graph
- Universal traits
  - Iterable (required)
  - Schema reflectable (required)
  - Structural queryable (optional)
  - Embedding queryable (optional)
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

In this example, a UX researcher is using the Grounded Theory approach to analyze a large number of in-app user feedback. The Grounded Theory involves coding, categorizing, and identifying patterns/themes in the data.

1. Import data: First, the researcher imports the raw user feedback data (e.g., JSON, CSV) into the visual programming system using a "Create" Operator. This will create a Frame containing the raw data.
2. Pre-process data: The researcher may want to clean and pre-process the data, such as removing irrelevant information, filtering, or normalizing text. They can use "Transform" Operators to create new Frames containing the pre-processed data.
3. Coding: The researcher starts by coding the data, i.e., assigning labels to different segments of the text. They can use a "Fork" Operator to create separate Frames for each coded segment of the feedback.
4. Categorizing: The researcher now groups the coded segments into categories based on their similarities. They can use "Join" Operators to merge Frames with similar codes, creating new Frames representing the categories.
5. Identifying patterns/themes: The researcher iteratively refines the categories and identifies patterns or themes in the data. They can use "Transform" Operators to further analyze the categories and "Join" Operators to consolidate them into higher-level categories or themes.
6. Visualization: To better understand the patterns and themes, the researcher can use "Observe" Operators to create visual representations of the data (e.g., word clouds, bar charts, network graphs).
7. Exporting: Finally, the researcher can export the analyzed data and visualizations using an "Export" Operator, which allows them to share their findings with others or use them in other applications. Throughout the entire process, the researcher can create multiple Pipelines to handle different stages of the analysis and combine them as needed. The visual programming system will enable the researcher to easily track and manipulate the data in a clear and organized manner, making the Grounded Theory analysis more efficient and comprehensive.

## Appendix I. Issues with Impromptu

- Size change of data sections, forcing the user to adopt a linear layout
  - Solution: fixed window size for data preview. Details available via Observer or popup
- Impossible to work with dynamically generated sections and retain reuseability
  - Solution: monadic operations allow nested JSON arrays and dynamic schema interpretation by LLM
- Stickies afford at most two dimensions. The higher the dimension, the less the interoperability
  - Solution: ibid
- Operator vocabulary is too large and varies in levels of abastraction
  - Solution: use LLM to assist Operator selector as well as LLM-based Operator creation

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

### Concept 5: Data is Operator

- Affordance
  - Node is Operator
  - Frame is Operator
  - Observer is implemented as an Operator too
  - Link is the connection from Node to Node
- Pros
  - All the benefits from Concept 4: Data + Operation hybrid
  - Additional affordance on the Frame for interactive data exploration
  - Reduced connection complexity because all the nodes are operators
- Cons
  - Implementing Observer as an Operator makes the operator stateful. Observer becomes the implicit container for data

## Appendix III. External inspirations

### Visual programming

- Data rabbit
- Grasshopper

### Functional thinking

- jq + json
- datalog + cozo
- monad at massive scale
