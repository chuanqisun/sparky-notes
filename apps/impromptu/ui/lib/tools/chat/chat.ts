import { html } from "lit-html";
import type { ChatMessage, ModelName, SimpleChatProxy } from "plexchat";
import { BehaviorSubject, Observable, Subject, combineLatestWith, firstValueFrom, map } from "rxjs";

import type { MessageFromUI } from "../../../../types/message";
import "./chat.css";

const defaultMessages = [
  {
    role: "system",
    content: "You are a helpful chat bot",
  },
  {
    role: "user",
    content: "Hey buddy!",
  },
];

const defaultTemperature = 0;
const defaultTokenLimit = 200;
const defaultModel = "gpt-3.5";

export interface ChatState {
  messages: { role: string; content: string }[];
  temperature: number;
  tokenLimit: number;
  model: string;
}

export const createChatState = () =>
  new BehaviorSubject<ChatState>({
    messages: [...defaultMessages],
    temperature: defaultTemperature,
    tokenLimit: defaultTokenLimit,
    model: defaultModel,
  });

export const createChat = (config: { $chatProxy: Observable<SimpleChatProxy>; $state: Subject<ChatState>; $tx: Subject<MessageFromUI> }) => {
  const $handlers = config.$state.pipe(
    map((state) => {
      const handleTemperatureChange = (e: InputEvent) => {
        const temp = parseFloat((e.target as HTMLInputElement).value);
        config.$state.next({
          ...state,
          temperature: temp,
        });
      };

      const handleTokenLimitChange = (e: InputEvent) => {
        const limit = parseInt((e.target as HTMLInputElement).value);
        config.$state.next({
          ...state,
          tokenLimit: limit,
        });
      };

      const handleModelChange = (e: InputEvent) => {
        const model = (e.target as HTMLSelectElement).value;
        config.$state.next({
          ...state,
          model,
        });
      };

      const handleInput = (e: InputEvent, index: number) => {
        const messageInput = (e.target as HTMLInputElement).value;
        const updatedMessages = state.messages.map((message, i) => (i === index ? { ...message, content: messageInput } : message));

        config.$state.next({
          ...state,
          messages: updatedMessages,
        });
      };

      const handleSubmit = async () => {
        const chatProxy = await firstValueFrom(config.$chatProxy);
        const messageOutput = await chatProxy({
          messages: state.messages as ChatMessage[],
          temperature: state.temperature,
          max_tokens: state.tokenLimit,
          models: getModels(state.model),
        }).then((output) => output.choices[0].message.content ?? "Error");

        config.$state.next({
          ...state,
          messages: [
            ...state.messages,
            {
              role: "assistant",
              content: messageOutput,
            },
            {
              role: "user",
              content: "",
            },
          ],
        });
      };

      const handleReset = () => {
        config.$state.next({
          ...state,
          temperature: defaultTemperature,
          tokenLimit: defaultTokenLimit,
          messages: [...defaultMessages],
        });
      };

      const handleDelete = (index: number, length: number) => {
        // remove items at index n and n + 1
        let updatedMessages = state.messages.filter((_, i) => i !== index && i !== index + 1);

        // if only 1 message left, insert default message
        updatedMessages = updatedMessages.length === 1 ? [...updatedMessages, defaultMessages[1]] : updatedMessages;

        // if last message is not user message, insert empty user message
        updatedMessages = updatedMessages[updatedMessages.length - 1].role !== "user" ? [...updatedMessages, { role: "user", content: "" }] : updatedMessages;

        config.$state.next({
          ...state,
          messages: updatedMessages,
        });
      };

      const handleSave = () => {
        config.$tx;
      };

      return {
        handleTemperatureChange,
        handleTokenLimitChange,
        handleModelChange,
        handleInput,
        handleSubmit,
        handleReset,
        handleDelete,
        handleSave,
      };
    })
  );

  return config.$state.pipe(
    combineLatestWith($handlers),
    map(
      ([state, handlers]) =>
        html`
          <label for="token-limit">Limit</label>
          <input
            class="c-chat-config-input"
            id="token-limit"
            type="number"
            step="100"
            min="0"
            max="32000"
            .value=${state.tokenLimit}
            @input=${handlers.handleTokenLimitChange}
          />
          <label for="temperature">Temp</label>
          <input
            class="c-chat-config-input"
            id="temperature"
            type="number"
            step="0.1"
            min="0"
            max="1"
            .value=${state.temperature}
            @input=${handlers.handleTemperatureChange}
          />
          <label for="model">Model</label>
          <select class="c-chat-config-select" id="model" .value=${state.model} @input=${handlers.handleModelChange}>
            <option value="gpt-3.5">gpt-3.5</option>
            <option value="gpt-4">gpt-4</option>
          </select>
          <div class="c-chat-list">
            ${state.messages.map(
              (message, index) => html`
                <div class="c-chat-entry">
                  <div>
                    <label for=${`chat-message-${index}`}><b>${message.role === "assistant" ? "┗╸" : ""}${message.role}</b></label
                    >${message.role === "user" ? html`<button @click=${() => handlers.handleDelete(index, state.messages.length)}>Delete</button>` : ""}
                  </div>
                  <div class="u-auto-resize" data-resize-textarea-content=${message.content}>
                    <textarea id=${`chat-message-${index}`} .value=${message.content} @input=${(e: InputEvent) => handlers.handleInput(e, index)}></textarea>
                  </div>
                </div>
              `
            )}
          </div>
          <button @click=${handlers.handleSubmit}>Next</button>
          <button @click=${handlers.handleReset}>Reset</button>
          <button @click=${handlers.handleSave}>Save</button>
        `
    )
  );
};

function getModels(model: string): ModelName[] {
  switch (model) {
    case "gpt-3.5":
      return ["gpt-35-turbo", "gpt-35-turbo-16k"];
    case "gpt-4":
      return ["gpt-4", "gpt-4-32k"];
    default:
      return ["gpt-35-turbo", "gpt-35-turbo-16k"];
  }
}
