import { html } from "lit-html";
import type { ChatMessage, ModelName, SimpleChatProxy } from "plexchat";
import { Observable, firstValueFrom, of, type Subject } from "rxjs";
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

export const createChat = (config: { $chatProxy: Observable<SimpleChatProxy> }) => (props: { id: string; parsedBlob: any; $tx: Subject<MessageFromUI> }) => {
  const currentMessages = (props.parsedBlob.messages as { role: string; content: string }[]) ?? defaultMessages;

  const { temperature = defaultTemperature, tokenLimit = defaultTokenLimit, model = defaultModel } = props.parsedBlob;

  const handleTempChange = (e: InputEvent) => {
    const temp = parseFloat((e.target as HTMLInputElement).value);
    props.$tx.next({
      setNodeBlob: {
        id: props.id,
        blob: JSON.stringify({
          ...props.parsedBlob,
          temperature: temp,
        }),
      },
    });
  };

  const handleTokenLimitChange = (e: InputEvent) => {
    const limit = parseInt((e.target as HTMLInputElement).value);
    props.$tx.next({
      setNodeBlob: {
        id: props.id,
        blob: JSON.stringify({
          ...props.parsedBlob,
          tokenLimit: limit,
        }),
      },
    });
  };

  const handleModelChange = (e: InputEvent) => {
    const model = (e.target as HTMLSelectElement).value;
    props.$tx.next({
      setNodeBlob: {
        id: props.id,
        blob: JSON.stringify({
          ...props.parsedBlob,
          model,
        }),
      },
    });
  };

  const handleInput = (e: InputEvent, index: number) => {
    const messageInput = (e.target as HTMLInputElement).value;
    const updatedMessages = currentMessages.map((message, i) => (i === index ? { ...message, content: messageInput } : message));

    props.$tx.next({
      setNodeBlob: {
        id: props.id,
        blob: JSON.stringify({
          ...props.parsedBlob,
          messages: updatedMessages,
        }),
      },
    });
  };

  const handleSubmit = async () => {
    const chatProxy = await firstValueFrom(config.$chatProxy);
    const messageOutput = await chatProxy({
      messages: currentMessages as ChatMessage[],
      temperature,
      max_tokens: tokenLimit,
      models: getModels(model),
    }).then((output) => output.choices[0].message.content ?? "Error");

    props.$tx.next({
      setNodeBlob: {
        id: props.id,
        blob: JSON.stringify({
          ...props.parsedBlob,
          messages: [
            ...currentMessages,
            {
              role: "assistant",
              content: messageOutput,
            },
            {
              role: "user",
              content: "",
            },
          ],
        }),
      },
    });
  };

  const handleReset = () => {
    props.$tx.next({
      setNodeBlob: {
        id: props.id,
        blob: JSON.stringify({
          ...props.parsedBlob,
          temperature: defaultTemperature,
          tokenLimit: defaultTokenLimit,
          messages: [...defaultMessages],
        }),
      },
    });
  };

  const handleDelete = (index: number, length: number) => {
    // remove items at index n and n + 1
    let updatedMessages = currentMessages.filter((message, i) => i !== index && i !== index + 1);

    // if only 1 message left, insert default message
    updatedMessages = updatedMessages.length === 1 ? [...updatedMessages, defaultMessages[1]] : updatedMessages;

    // if last message is not user message, insert empty user message
    updatedMessages = updatedMessages[updatedMessages.length - 1].role !== "user" ? [...updatedMessages, { role: "user", content: "" }] : updatedMessages;

    props.$tx.next({
      setNodeBlob: {
        id: props.id,
        blob: JSON.stringify({
          ...props.parsedBlob,
          messages: updatedMessages,
        }),
      },
    });
  };

  const handleSave = () => {};

  return of(html`
    <label for="token-limit">Limit</label>
    <input class="c-chat-config-input" id="token-limit" type="number" step="100" min="0" max="32000" .value=${tokenLimit} @input=${handleTokenLimitChange} />
    <label for="temperature">Temp</label>
    <input class="c-chat-config-input" id="temperature" type="number" step="0.1" min="0" max="1" .value=${temperature} @input=${handleTempChange} />
    <label for="model">Model</label>
    <select class="c-chat-config-select" id="model" .value=${model} @input=${handleModelChange}>
      <option value="gpt-3.5">gpt-3.5</option>
      <option value="gpt-4">gpt-4</option>
    </select>
    <div class="c-chat-list">
      ${currentMessages.map(
        (message, index) => html`
          <div class="c-chat-entry">
            <div>
              <label for=${`chat-message-${index}`}><b>${message.role === "assistant" ? "┗╸" : ""}${message.role}</b></label
              >${message.role === "user" ? html`<button @click=${() => handleDelete(index, currentMessages.length)}>Delete</button>` : ""}
            </div>
            <div class="u-auto-resize" data-resize-textarea-content=${message.content}>
              <textarea id=${`chat-message-${index}`} .value=${message.content} @input=${(e: InputEvent) => handleInput(e, index)}></textarea>
            </div>
          </div>
        `
      )}
    </div>
    <button @click=${handleSubmit}>Next</button>
    <button @click=${handleReset}>Reset</button>
    <button @click=${handleSave}>Save</button>
  `);
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
