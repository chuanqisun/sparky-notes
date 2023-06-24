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

- Use "lens" to achieve universal object r/w
- Every object has `id` and `data`
- Every shelf has its data (list of objects) and the source code that generated it
- First empty shelf comes with `/clear` command
- "lens" should come with live preview
- Only support few commands:
- `/lens` alone behaves like `/code`
- `/lens + /code` for deterministic non-destructive transform
- `/lens + /gpt` for probabilistic non-destructive transform
- `/code` for destructive transform
- `/gpt` for probabilistic destructive transform
- With proxy, lens can track provenance

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
