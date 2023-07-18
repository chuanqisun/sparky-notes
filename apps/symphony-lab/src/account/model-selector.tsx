import { useCallback, useEffect, useMemo, useState } from "react";
import { BasicSelect } from "../form/form";
import { getChatResponse, type ChatMessage, type OpenAIChatPayload } from "../openai/chat";
import { getEmbedding } from "../openai/embedding";
import { useAccountContext } from "./account-context";

export type ChatProxy = (messages: ChatMessage[], modelConfig?: Partial<OpenAIChatPayload>) => Promise<string>;

export function useModelSelector() {
  const [selectedChatModelDisplayId, setSelectedChatModelDisplayId] = useState<string | null>(null);
  const [selectedEmbeddineModelDisplayId, setSelectedEmbeddingModelDisplayId] = useState<string | null>(null);

  const { connections, getChatEndpoint, getEmbeddingEndpoint } = useAccountContext();

  useEffect(() => {
    if (
      selectedChatModelDisplayId &&
      connections?.some((connection) => connection.models?.some((model) => model.displayId === selectedChatModelDisplayId)) &&
      selectedEmbeddineModelDisplayId &&
      connections?.some((connection) => connection.models?.some((model) => model.displayId === selectedEmbeddineModelDisplayId))
    )
      return;

    if (connections) {
      const defaultChatConnection = connections.find((connection) => !!connection.models?.some((model) => model.type === "chat"));
      if (defaultChatConnection) {
        setSelectedChatModelDisplayId(defaultChatConnection.models?.find((model) => model.type === "chat")!.displayId ?? "");
      }
      const defaultEmbeddingConnection = connections.find((connection) => !!connection.models?.some((model) => model.type === "embedding"));
      if (defaultEmbeddingConnection) {
        setSelectedEmbeddingModelDisplayId(defaultEmbeddingConnection.models?.find((model) => model.type === "embedding")!.displayId ?? "");
      }
    }
  }, [selectedEmbeddineModelDisplayId, selectedChatModelDisplayId, connections]);

  const chat = useCallback<ChatProxy>(
    (messages: ChatMessage[], modelConfig?: Partial<OpenAIChatPayload>) => {
      const chatEndpoint = getChatEndpoint?.(selectedChatModelDisplayId ?? "");
      if (!chatEndpoint) throw new Error(`API connection is not set up`);

      return getChatResponse(chatEndpoint.apiKey, chatEndpoint.endpoint, messages, modelConfig).then((res) => res.choices[0].message?.content ?? "");
    },
    [selectedChatModelDisplayId, getChatEndpoint]
  );

  const embed = useCallback(
    (input: string) => {
      const embeddingEndpoint = getEmbeddingEndpoint?.(selectedEmbeddineModelDisplayId ?? "");
      if (!embeddingEndpoint) throw new Error(`API connection is not set up`);

      return getEmbedding(embeddingEndpoint.apiKey, embeddingEndpoint.endpoint, input).then((res) => res.data[0].embedding);
    },
    [selectedEmbeddineModelDisplayId, getChatEndpoint]
  );

  const selectedEndpoint = useMemo(() => {
    if (!selectedChatModelDisplayId) return null;
    const chatEndpoint = getChatEndpoint?.(selectedChatModelDisplayId);
    return chatEndpoint ?? null;
  }, [selectedChatModelDisplayId, getChatEndpoint]);

  const ModelSelectorElement = useMemo(
    () =>
      connections?.length ? (
        <>
          <label>
            Chat model
            <BasicSelect value={selectedChatModelDisplayId ?? ""} onChange={(e: any) => setSelectedChatModelDisplayId(e.target.value)}>
              {connections.map((connection) => (
                <optgroup key={connection.id} label={connection.displayName}>
                  {connection.models
                    ?.filter((model) => model.type === "chat")
                    .map((model) => (
                      <option key={model.displayId} value={model.displayId}>
                        {model.displayName}
                      </option>
                    ))}
                  {!connection.models?.length ? (
                    <option value="" disabled>
                      No models available
                    </option>
                  ) : null}
                </optgroup>
              ))}
            </BasicSelect>
          </label>
          <label>
            Embedding model
            <BasicSelect value={selectedEmbeddineModelDisplayId ?? ""} onChange={(e: any) => setSelectedEmbeddingModelDisplayId(e.target.value)}>
              {connections.map((connection) => (
                <optgroup key={connection.id} label={connection.displayName}>
                  {connection.models
                    ?.filter((model) => model.type === "embedding")
                    .map((model) => (
                      <option key={model.displayId} value={model.displayId}>
                        {model.displayName}
                      </option>
                    ))}
                  {!connection.models?.length ? (
                    <option value="" disabled>
                      No models available
                    </option>
                  ) : null}
                </optgroup>
              ))}
            </BasicSelect>
          </label>
        </>
      ) : null,
    [selectedChatModelDisplayId, selectedEmbeddineModelDisplayId, connections]
  );

  return {
    chat,
    embed,
    selectedEndpoint,
    ModelSelectorElement,
  };
}
