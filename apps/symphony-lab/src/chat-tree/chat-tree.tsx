import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { AutoResize } from "../form/basic-form";
import "./chat-tree.css";

export interface ChatNode {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  childIds?: string[];
  isLocked?: boolean;
  isCollapsed?: boolean;
  isEntry?: boolean;
  isEditing?: boolean;
}

const defaultUserNodeId = crypto.randomUUID();
const DEFAULT_NODES: ChatNode[] = [
  {
    id: crypto.randomUUID(),
    role: "system",
    content: "",
    isEntry: true,
    isEditing: true,
    childIds: [defaultUserNodeId],
  },
  {
    id: defaultUserNodeId,
    role: "user",
    isEditing: true,
    content: "",
  },
];

function repaceNodeContent(id: string, content: string, candidateNode: ChatNode) {
  return candidateNode.id === id
    ? {
        ...candidateNode,
        content,
      }
    : candidateNode;
}

const roleIcon = {
  system: "⚙️",
  user: "👤",
  assistant: "🤖",
};

function getReachableIds(nodes: ChatNode[], rootId: string): string[] {
  const rootNode = nodes.find((node) => node.id === rootId);
  if (!rootNode) return [];

  return [rootId, ...(rootNode.childIds ?? []).flatMap((childId) => getReachableIds(nodes, childId))];
}

export function ChatTree() {
  const [treeNodes, setTreeNodes] = useState(DEFAULT_NODES);
  const treeRootRef = useRef<HTMLDivElement>(null);

  const focusById = useCallback((nodeId: string) => {
    setTimeout(() => {
      document.getElementById(nodeId)?.focus();
      (document.getElementById(nodeId) as HTMLTextAreaElement)?.select();
    }, 0);
  }, []);

  const seenIds = useRef<Set<string>>(new Set());

  // auto focus
  // TODO: Esc and re-edit doesn't work
  useEffect(() => {
    const allIds = treeNodes.map((node) => node.id);
    const newIds = allIds.filter((id) => !seenIds.current.has(id));
    if (newIds.at(-1)) {
      focusById(newIds.at(-1)!);
    }
    newIds.forEach((id) => seenIds.current.add(id));
  }, [treeNodes]);

  const handleTextChange = useCallback((nodeId: string, content: string) => {
    setTreeNodes((rootNodes) => rootNodes.map(repaceNodeContent.bind(null, nodeId, content)));
  }, []);

  const handleDelete = useCallback((nodeId: string) => {
    setTreeNodes((rootNodes) => {
      // resurvively find all ids to be deleted
      const reachableIds = getReachableIds(rootNodes, nodeId);

      // filter out the node to be deleted
      const remainingNodes = rootNodes.filter((node) => !reachableIds.includes(node.id));

      let newUserNodeId = "";

      // make sure all system/assistant nodes have at least one child
      const newNodes = remainingNodes.map((node) => {
        if (node.childIds?.includes(nodeId)) {
          const updated: ChatNode = {
            ...node,
            childIds: node.childIds?.filter((childId) => childId !== nodeId),
          };

          if (updated.role !== "user" && updated.childIds?.length === 0) {
            newUserNodeId = crypto.randomUUID();
            updated.childIds = [newUserNodeId];
          }

          return updated;
        } else {
          return node;
        }
      });

      if (newUserNodeId) {
        newNodes.push({
          id: newUserNodeId,
          role: "user",
          content: "",
          isEditing: true,
        });
      }

      return newNodes;
    });
  }, []);

  const handleFork = useCallback((siblingId: string, baseContent: string) => {
    // insert a new user node before the forked node
    const newUserNode: ChatNode = {
      id: crypto.randomUUID(),
      role: "user",
      content: baseContent,
      isEditing: true,
    };

    setTreeNodes((rootNodes) => {
      const newNodes = [...rootNodes, newUserNode];
      const parentNode = newNodes.find((node) => node.childIds?.includes(siblingId))!; // safe assert: the top most user node is under the system node
      const allSiblingIds = [...(parentNode?.childIds || [])];
      const siblingIndex = allSiblingIds.findIndex((id) => id === siblingId);
      allSiblingIds.splice(siblingIndex, 0, newUserNode.id);
      newNodes[newNodes.findIndex((node) => node.id === parentNode.id)!] = {
        ...parentNode,
        childIds: allSiblingIds,
      };

      return newNodes;
    });
  }, []);

  const handleToggleAccordion = useCallback((nodeId: string) => {
    setTreeNodes((rootNodes) => {
      const targetNode = rootNodes.find((node) => node.id === nodeId);
      if (!targetNode?.childIds?.length) return rootNodes;

      const newNodes = [...rootNodes];
      const targetNodeIndex = newNodes.findIndex((node) => node.id === nodeId);
      newNodes[targetNodeIndex] = {
        ...targetNode,
        isCollapsed: !targetNode.isCollapsed,
      };
      return newNodes;
    });
  }, []);

  const handleStartEdit = useCallback((nodeId: string) => {
    setTreeNodes((rootNodes) =>
      rootNodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            isEditing: true,
          };
        } else {
          return node;
        }
      })
    );
  }, []);

  const handleKeydown = useCallback(
    async (nodeId: string, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const targetNode = treeNodes.find((node) => node.id === nodeId);
      if (targetNode?.role !== "user") return;

      if (e.key === "Escape") {
        setTreeNodes((rootNodes) =>
          rootNodes.map((node) => {
            if (node.id === nodeId) {
              return {
                ...node,
                isEditing: false,
              };
            } else {
              return node;
            }
          })
        );
        return;
      }

      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === "Enter") {
        e.preventDefault();

        // simulate GPT response

        const newUserNode: ChatNode = {
          id: crypto.randomUUID(),
          role: "user",
          content: "",
          isEditing: true,
        };

        const newAssistantNode: ChatNode = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Mock response content at ${new Date().toLocaleTimeString()}`,
          isLocked: true,
          childIds: [newUserNode.id],
        };

        setTreeNodes((rootNodes) => {
          const newNodes = [...rootNodes, newAssistantNode, newUserNode];
          const targetNodeIndex = newNodes.findIndex((node) => node.id === nodeId);
          newNodes[targetNodeIndex] = {
            ...newNodes[targetNodeIndex],
            childIds: [newAssistantNode.id],
            isEditing: false,
            isLocked: true,
          };
          return newNodes;
        });
      }
    },
    [treeNodes]
  );

  function renderNode(node: ChatNode, hasSibling?: boolean): any {
    return (
      <Thread showrail={hasSibling ? "true" : undefined} key={node.id}>
        <MessageLayout>
          <Avatar onClick={() => handleToggleAccordion(node.id)}>
            {roleIcon[node.role]} {node.childIds?.length && node.isCollapsed ? "🔽" : null}
          </Avatar>
          {node.isEditing ? (
            <AutoResize data-resize-textarea-content={node.content}>
              <textarea
                id={node.id}
                value={node.content}
                onKeyDown={(e) => handleKeydown(node.id, e)}
                onChange={(e) => handleTextChange(node.id, e.target.value)}
                placeholder={node.role === "user" ? "Ctrl + Enter to send, Esc to cancel" : "System message"}
              />
            </AutoResize>
          ) : (
            <div>
              <Message draft={!node.isLocked && !node.isEditing && !node.isEditing ? "true" : undefined}>{node.content}</Message>{" "}
              <span>
                {node.role === "user" ? (
                  <>
                    {node.isLocked ? null : <button onClick={() => handleStartEdit(node.id)}>Edit</button>}
                    <button onClick={() => handleFork(node.id, node.content)}>Fork</button>
                    <button onClick={() => handleDelete(node.id)}>Delete</button>
                  </>
                ) : null}
              </span>
            </div>
          )}
        </MessageLayout>
        {!!node.childIds?.length ? (
          node.isCollapsed ? null : (
            <MessageList>
              {node.childIds
                ?.map((id) => treeNodes.find((node) => node.id === id))
                .filter(Boolean)
                .map((childNode) => renderNode(childNode as ChatNode, (node?.childIds ?? []).length > 1))}
            </MessageList>
          )
        ) : null}
      </Thread>
    );
  }

  return <MessageList ref={treeRootRef}>{treeNodes.filter((node) => node.isEntry).map((node) => renderNode(node))}</MessageList>;
}

const Thread = styled.div<{ showrail?: "true" }>`
  display: grid;
  gap: 8px;
  margin-left: ${(props) => (props.showrail ? "10px" : "0")};
  padding-left: ${(props) => (props.showrail ? "9px" : "0")};
  border-left: 1px solid ${(props) => (props.showrail ? "#aaa" : "transparent")};
`;

const MessageList = styled.div`
  display: grid;
  gap: 16px;
`;

const Message = styled.span<{ draft?: "true" }>`
  &::before {
    content: ${(props) => (props.draft ? '"*"' : "")};
  }
`;

const MessageLayout = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px;
`;

const Avatar = styled.button`
  padding: 0;
  background: none;
  border: 1px solid transparent;
  border-radius: 2px;
  cursor: pointer;
  font-size: 20px;
  width: 28px;
  display: flex;
  align-items: baseline;
  justify-content: center;

  &:hover {
    background-color: white;
  }
`;
