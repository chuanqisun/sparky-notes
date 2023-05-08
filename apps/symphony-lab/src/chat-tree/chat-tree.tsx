import React, { useCallback, useState } from "react";
import styled from "styled-components";
import { AutoResize } from "../form/basic-form";
import "./chat-tree.css";

export interface ChatNode {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  childIds?: string[];
  isArchieved?: boolean;
  isCollapsed?: boolean;
  isEntry?: boolean;
}

const DEFAULT_NODES: ChatNode[] = [
  {
    id: crypto.randomUUID(),
    role: "system",
    content: "",
    isEntry: true,
  },
  {
    id: crypto.randomUUID(),
    role: "user",
    content: "",
    isEntry: true,
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

export function ChatTree() {
  const [treeNodes, setTreeNodes] = useState(DEFAULT_NODES);

  const handleEdit = (nodeId: string, content: string) => {
    setTreeNodes((rootNodes) => rootNodes.map(repaceNodeContent.bind(null, nodeId, content)));
  };

  const handleKeydown = useCallback(
    async (nodeId: string, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const targetNode = treeNodes.find((node) => node.id === nodeId);
      if (targetNode?.role !== "user") return;

      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === "Enter") {
        // simulate GPT response

        const newUserNode: ChatNode = {
          id: crypto.randomUUID(),
          role: "user",
          content: "",
        };

        const newAssistantNode: ChatNode = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Mock response content at ${new Date().toLocaleTimeString()}`,
          isArchieved: true,
          childIds: [newUserNode.id],
        };

        setTreeNodes((rootNodes) => {
          const newNodes = [...rootNodes, newAssistantNode, newUserNode];
          const targetNodeIndex = newNodes.findIndex((node) => node.id === nodeId);
          newNodes[targetNodeIndex] = {
            ...newNodes[targetNodeIndex],
            childIds: [newAssistantNode.id],
            isArchieved: true,
          };
          return newNodes;
        });
      }
    },
    [treeNodes]
  );

  function renderNode(node: ChatNode) {
    return (
      <div key={node.id}>
        <MessageLayout>
          <Avatar>{roleIcon[node.role]}</Avatar>
          {node.isArchieved ? (
            <div>{node.content}</div>
          ) : (
            <AutoResize data-resize-textarea-content={node.content}>
              <textarea value={node.content} onKeyDown={(e) => handleKeydown(node.id, e)} onChange={(e) => handleEdit(node.id, e.target.value)} />
            </AutoResize>
          )}
        </MessageLayout>
        {node.childIds
          ?.map((id) => treeNodes.find((node) => node.id === id))
          .filter(Boolean)
          .map((node) => renderNode(node as ChatNode))}
      </div>
    );
  }

  return <>{treeNodes.filter((node) => node.isEntry).map(renderNode)}</>;
}

const MessageLayout = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px;
`;

const Avatar = styled.div`
  font-size: 20px;
`;
