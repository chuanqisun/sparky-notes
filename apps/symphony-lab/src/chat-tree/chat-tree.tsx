import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useAccountContext } from "../account/account-context";
import { AutoResize } from "../form/basic-form";
import { getChatResponse, type ChatMessage, type OpenAIChatPayload } from "../openai/chat";
import { isSucceeded, listDeployments, type ModelDeployment } from "../openai/model-management";
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
  isNextFocus?: boolean;
}

const INITIAL_USER_NODE = getUserNode(crypto.randomUUID());
const INITIAL_SYSTEM_NODE: ChatNode = {
  id: crypto.randomUUID(),
  role: "system",
  content: "",
  isEntry: true,
  isEditing: true,
  childIds: [INITIAL_USER_NODE.id],
};
const INITIAL_NODES = [INITIAL_SYSTEM_NODE, INITIAL_USER_NODE];

function getUserNode(id: string, configOverrides?: Partial<ChatNode>): ChatNode {
  return {
    id,
    role: "user",
    content: "",
    isEditing: true,
    isNextFocus: true,
    ...configOverrides,
  };
}

function patchNode(predicate: (node: ChatNode) => boolean, patch: Partial<ChatNode>) {
  return (candidateNode: ChatNode) => (predicate(candidateNode) ? { ...candidateNode, ...patch } : candidateNode);
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

export interface ChatConnection {
  endpoint: string;
  apiKey: string;
}

export function ChatTree() {
  const [treeNodes, setTreeNodes] = useState(INITIAL_NODES);
  const treeRootRef = useRef<HTMLDivElement>(null);

  const { azureOpenAIConnection } = useAccountContext();
  const [modelOptions, setModelOptions] = useState<ModelDeployment[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelDeployment | null>(null);

  const chat = useCallback(
    async (messages: ChatMessage[], config?: Partial<OpenAIChatPayload>) => {
      if (!azureOpenAIConnection || !selectedModel) throw new Error("Chat endpoint not available");
      const endpoint = `${azureOpenAIConnection.endpoint}openai/deployments/${selectedModel.id}/chat/completions?api-version=2023-03-15-preview`;
      return getChatResponse(azureOpenAIConnection.apiKey, endpoint, messages, config).then((response) => response.choices[0].message.content ?? "");
    },
    [azureOpenAIConnection, selectedModel]
  );

  useEffect(() => {
    if (azureOpenAIConnection) {
      listDeployments(azureOpenAIConnection.apiKey, azureOpenAIConnection.endpoint).then((deployments) => {
        const validModels = deployments.filter(isSucceeded).filter((maybeModel) => ["gpt-35-turbo", "gpt-4", "gpt-4-32k"].includes(maybeModel.model));
        setModelOptions(validModels);
        setSelectedModel(validModels[0] ?? null);
      });
    }
  }, [azureOpenAIConnection]);

  const focusById = useCallback((nodeId: string) => {
    setTimeout(() => {
      document.getElementById(nodeId)?.focus();
      (document.getElementById(nodeId) as HTMLTextAreaElement)?.select();
    }, 0);
  }, []);

  useEffect(() => {
    const needFocusNodes = treeNodes.filter((node) => node.isNextFocus);
    if (!needFocusNodes.length) return;

    focusById(needFocusNodes.at(-1)!.id);

    setTreeNodes((rootNodes) => rootNodes.map(patchNode((node) => node.isNextFocus === true, { isNextFocus: false })));
  }, [treeNodes]);

  const handleTextChange = useCallback((nodeId: string, content: string) => {
    setTreeNodes((rootNodes) => rootNodes.map(patchNode((node) => node.id === nodeId, { content })));
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
        newNodes.push(getUserNode(newUserNodeId));
      }

      return newNodes;
    });
  }, []);

  const handleFork = useCallback((siblingId: string, baseContent: string) => {
    // insert a new user node before the forked node
    const newUserNode: ChatNode = getUserNode(crypto.randomUUID(), { content: baseContent });

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
    setTreeNodes((rootNodes) => rootNodes.map(patchNode((node) => node.id === nodeId, { isEditing: true, isNextFocus: true })));
  }, []);

  const handleKeydown = useCallback(
    async (nodeId: string, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const targetNode = treeNodes.find((node) => node.id === nodeId);
      if (targetNode?.role !== "user") return;

      if (e.key === "Escape") {
        setTreeNodes((rootNodes) => rootNodes.map(patchNode((node) => node.id === nodeId, { isEditing: false })));
        return;
      }

      if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.key === "Enter") {
        e.preventDefault();

        // simulate GPT response
        const response = await chat([{ role: "user", content: "hello gpt 3.5" }]);

        const newUserNode = getUserNode(crypto.randomUUID());

        const newAssistantNode: ChatNode = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response,
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
    [chat, treeNodes]
  );

  const renderNode = useCallback(
    (node: ChatNode, hasSibling?: boolean) => {
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
                  placeholder={node.role === "user" ? "Enter to send, Esc to cancel" : "System message"}
                />
              </AutoResize>
            ) : (
              <MessageWithActions>
                <Message draft={!node.isLocked && !node.isEditing && !node.isEditing ? "true" : undefined}>{node.content}</Message>
                <MessageActions>
                  {node.role === "user" ? (
                    <>
                      {" "}
                      {node.isLocked ? null : (
                        <>
                          <button onClick={() => handleStartEdit(node.id)}>Edit</button>
                          {" · "}
                        </>
                      )}
                      <button onClick={() => handleFork(node.id, node.content)}>Fork</button>
                      {" · "}
                      <button onClick={() => handleDelete(node.id)}>Delete</button>
                    </>
                  ) : null}
                </MessageActions>
              </MessageWithActions>
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
    },
    [handleKeydown]
  );

  return (
    <ChatAppLayout>
      <ModelSelector>
        {modelOptions.map((option) => (
          <label key={option.id}>
            <input type="radio" value={option.model} checked={option.id === selectedModel?.id} onChange={() => setSelectedModel(option)} />
            <span>{option.model}</span>
          </label>
        ))}
      </ModelSelector>
      <MessageList ref={treeRootRef}>{treeNodes.filter((node) => node.isEntry).map((node) => renderNode(node))}</MessageList>
    </ChatAppLayout>
  );
}

const ChatAppLayout = styled.div`
  display: grid;
  gap: 16px;
`;

const ModelSelector = styled.menu`
  padding: 0;
  display: flex;
  gap: 12px;
  padding-left: 32px;
  flex-wrap: wrap;

  label {
    font-weight: 600;
    display: flex;
    gap: 4px;
  }
`;

const Thread = styled.div<{ showrail?: "true" }>`
  display: grid;
  gap: 8px;
  margin-left: ${(props) => (props.showrail ? "14px" : "0")};
  padding-left: ${(props) => (props.showrail ? "13px" : "0")};
  border-left: 1px solid ${(props) => (props.showrail ? "#aaa" : "transparent")};
`;

const MessageList = styled.div`
  display: grid;
  gap: 16px;
`;

const MessageActions = styled.span`
  > * {
    opacity: 0.5;
  }
  button {
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    &:hover {
      opacity: 1;
      text-decoration: underline;
    }
  }
`;

const MessageWithActions = styled.div`
  position: relative;
`;

const Message = styled.span<{ draft?: "true" }>`
  white-space: pre-wrap;
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
