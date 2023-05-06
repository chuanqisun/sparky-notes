## Assistant

- BUG: when last insight was deleted, new insights cannot be added
- In-figma button/card hover effect: toggle shadow
- In-app click to browse without adding to canvas
- Provide feedback menu action
- Handle permission errors when loading other people's work
- New card positioning improvements
- Auto push code update to Figma Widget instance
- Auth | Timestamp last access token usage
- Auth | Sign out from all HITS Assistants
- Progressively disclose more non-highlight items

## Impromptu

- Add publish to HITS action
- Restore the chatbot agent
- Add wikipedia search
- Add interactive task break down maybe a separate tool: for each task, interactively/progressive break down to smaller tasks
- Add quick input/output draw. Select a program node to add input/output. Otherwise draw with connection semi-attached
- Force agent conclusion after max_iter
- Reimplement URL crawl as an agent with tools
- Improve crawler queue priority management
- Auto reduce prompt size when token limit exceeded
- Add a 2D quadrant mapping node
- Add DevOps query node
- Convert to Widget for relaunch discoverability
- Fix filter output auto-rename

## Symphony

- History compression: preserve handle turning points and compress straight lines
- Output thoughts from ambient only
- Rethink the "Thought" node
- When there is momentum, allow multiple "Thought" nodes in a row/column chain
- Category design
  - Nouns: Question, Thought, Action plan, Observation, Answer, Mixed
  - Verb: Think, Act, Conclude, Step, Auto-run
- Workflow design
  - Workflow starts with Question, expand into Thoughts, Action plans, Observations, and Answers
  - Applying Think to Question leads to Thoughts, Action plans, or Answers
  - Applying Act to Action plans leads to Observations
  - Applying Think to Observations leads to Thoughts, Action plans, or Answers
  - Applying Conclude to anything leads to Answers
- Causally connected steps are joined by directed edge
  - No cycle allowed
  - All nodes along the path to the root are collectively considered "Context"
  - When selection is mixed, context is topological sort of the superset of all paths
- Details
  - Use constant connector color
- Context order control (topological sort leads to serveral equivalent orders)
- Idea: grow the visualization iteratively via GPT-4

## Figma runtime pain point

- Progress/status display can be stuck when user force closes the plugin
- Sticky forbids nesting
- Lack of interactive form elements on the UI (checkbox, toggle, radio, etc)
- Difficult to draw links between nodes
- Widget mode has difficult dev inner loop because widget code cannot be easily hot-reloaded
- "Load more" requires interactive canvas buttons. How does this work with hundreds of items
- 2D layout tradeoff: chainable vs. resizable

## Demo ideas

- Demo fractal concept
  - Bottom level: program node
  - Mid level: agent node
  - Fractal level 0: agent node consume static sticky
  - Fractal level 1: agent node consume program node
  - Fractal level 2: agent node consume agent node
  - Fractal level 3: agent node produces agent node
- Interactively/progressive break down UX for problem solving at any scale
  - How to solve Seattle traffic congestion?
  - How to solve Seattle Homeless problem?
