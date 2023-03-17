# Infinite Canvas

- The user interface is an interactive canvas that can zoom or pan indefinitely.
- Progressive rendering of details
- Inspiration from FigJam comment bubble and section labeling, and the Muse app

# 2D graph

- Hierarchical and sequential breakdown of tasks, goals, questions, reasoning chains
- Top-down represent big-small scope, summary-detail, conclusion-evidence, general-specific
- Left-right represent sequence, cause-effect, induction steps
- Inspiration from DoView, Barbara Minto's Pyramid principle, and formal logic philosophy

# Copilot Runtime

- An Agent with general intelligence to understand the goal, evaluate the situation, make plans, create and select tools, and execute tasks
- User can run any number of node in the graph concurrently, starting from the apex node
- User can pause the execution of any number of nodes
- User can inspect the input/output/internal state of any node
- User can modify a node while its running. Modified node causes downstream nodes to re-run
- When a node is started to run, the Agent will either break the task into smaller tasks, or run the task
- Prototype in FigJam with limited interactivity

# Agent

- Based on ReAct framework with enhancement to create/modify tools
- Basic tools can be hard coded: Web Search, Academic Search, Open and read URL
- Advanced tools include Agent-designed tools, human-in-the-loop tools, and child Agents spawned as tools
- Auto-prompt engineering can be used to create pure-LLM based tools
- Documentation + reinforcement-debugging can be used to create public API based tools
- Human-in-the-loop requires user input/selection/clarification/real world task executation
- A higher-order Agent can coordinate the communication among child Agents to accomplish a task
- Insipiration from concensus protocol in distributed computing
