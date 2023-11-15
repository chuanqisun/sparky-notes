import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  deduplicateByModelName,
  getModelType,
  isChatModel,
  isEmbeddingModel,
  isSucceeded,
  listDeployments,
  removeTrailingSlash,
  smartSort,
  type ModelDeployment,
} from "../openai/management";

export interface Connection {
  id: string;
  endpoint: string;
  apiKey: string;
}

export interface RuntimeConnection extends Connection {
  displayName: string;
  models: RuntimeModel[] | undefined;
  errorMessage?: string;
}

export interface RuntimeModel {
  displayId: string;
  modelId: string;
  displayName: string;
  type: "chat" | "embedding";
}

export interface AccountContextType {
  connections?: RuntimeConnection[];
  addConnection?: (connection: Connection) => void;
  deleteConnection?: (id: string) => void;
  refreshConnection?: (id: string) => void;
  getChatEndpoint?: (modelDisplayId: string) => null | { endpoint: string; apiKey: string };
  getEmbeddingEndpoint?: (modelDisplayId: string) => null | { endpoint: string; apiKey: string };
}

export interface StoredContext {
  connections: Connection[];
}

export const AccountContext = createContext<AccountContextType>({});

const initialValue = JSON.parse(localStorage.getItem("accountContext") ?? "{}");
const validatedInitialValue: StoredContext = validateInitialValue(initialValue) ? initialValue : { connections: [] };
const initialRuntimeConnections = validatedInitialValue.connections.map((connection) => ({
  ...connection,
  displayName: new URL(connection.endpoint).hostname,
  models: undefined,
}));

export const AccountContextProvider = (props: { children?: JSX.Element | JSX.Element[] }) => {
  const [runtimeConnections, setRuntimeConnections] = useState<RuntimeConnection[]>(initialRuntimeConnections);

  useEffect(() => {
    Promise.all(runtimeConnections.map(discoverModels));
  }, []);

  const setConnections = useCallback((update: (previousConnections: RuntimeConnection[]) => RuntimeConnection[]) => {
    setRuntimeConnections((previousConnections) => {
      const newConnections = update(previousConnections);
      const persistedConnections: Connection[] = newConnections.map((connection) => ({
        id: connection.id,
        endpoint: connection.endpoint,
        apiKey: connection.apiKey,
      }));
      localStorage.setItem("accountContext", JSON.stringify({ connections: persistedConnections }));
      return newConnections;
    });
  }, []);

  const addConnection = useCallback(
    async (connection: Connection) => {
      setConnections((prevConnections) => [{ ...connection, displayName: new URL(connection.endpoint).hostname, models: undefined }, ...prevConnections]);
      await discoverModels(connection);
    },
    [setConnections]
  );

  const refreshConnection = useCallback(
    async (id: string) => {
      const connection = runtimeConnections?.find((connection) => connection.id === id);
      if (!connection) return;
      await discoverModels(connection);
    },
    [runtimeConnections]
  );

  const deleteConnection = useCallback((id: string) => {
    setConnections((prevConnections) => prevConnections.filter((connection) => connection.id !== id));
  }, []);

  const getEndpoint = useCallback(
    (endpointTemplate: (endpoint: string, modelId: string) => string, displayId: string) => {
      const [connectionId, modelId] = displayId?.split(":") ?? [];
      if (!connectionId || !modelId) return null;

      const connection = runtimeConnections?.find((connection) => connection.id === connectionId);
      if (!connection) return null;

      const model = connection.models?.find((model) => model.modelId === modelId);
      if (!model) return null;

      const endpoint = endpointTemplate(connection.endpoint, modelId);

      return { endpoint, apiKey: connection.apiKey };
    },
    [runtimeConnections]
  );

  const getChatEndpoint = useMemo(
    () =>
      getEndpoint.bind(
        null,
        (apiHost: string, modelId: string) => `${removeTrailingSlash(apiHost)}/openai/deployments/${modelId}/chat/completions?api-version=2023-07-01-preview`
      ),
    [getEndpoint]
  );

  const getEmbeddingEndpoint = useMemo(
    () =>
      getEndpoint.bind(
        null,
        (apiHost: string, modelId: string) => `${removeTrailingSlash(apiHost)}/openai/deployments/${modelId}/embeddings?api-version=2023-05-15`
      ),
    [getEndpoint]
  );

  const discoverModels = useCallback((connection: Connection) => {
    setRuntimeConnections((prev) =>
      prev.map((prevConnection) => (prevConnection.id === connection.id ? { ...prevConnection, models: undefined } : prevConnection))
    );

    listDeployments(connection.apiKey, connection.endpoint)
      .then((deployments) => {
        const validModels = deployments
          .filter(isSucceeded)
          .filter((model) => isChatModel(model) || isEmbeddingModel(model))
          .sort(smartSort)
          .filter(deduplicateByModelName)
          .map(toDisplayModel.bind(null, connection));

        setRuntimeConnections((prev) =>
          prev.map((prevConnection) =>
            prevConnection.id === connection.id
              ? {
                  ...prevConnection,
                  models: validModels,
                  errorMessage: validModels.length ? undefined : "No chat models found",
                }
              : prevConnection
          )
        );
      })
      .catch((e) => {
        setRuntimeConnections((prev) =>
          prev.map((prevConnection) =>
            prevConnection.id === connection.id
              ? {
                  ...prevConnection,
                  models: [],
                  errorMessage: e.message,
                }
              : prevConnection
          )
        );
      });
  }, []);

  return (
    <AccountContext.Provider
      value={{ connections: runtimeConnections, addConnection, refreshConnection, deleteConnection, getChatEndpoint, getEmbeddingEndpoint }}
    >
      {props.children}
    </AccountContext.Provider>
  );
};

export const useAccountContext = () => useContext(AccountContext);

function validateInitialValue(maybeValid: any): maybeValid is StoredContext {
  return Array.isArray(maybeValid.connections);
}

function toDisplayModel(connection: Connection, deployment: ModelDeployment): RuntimeModel {
  return { displayId: `${connection.id}:${deployment.id}`, modelId: deployment.id, displayName: deployment.model, type: getModelType(deployment) };
}
