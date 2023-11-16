import { html } from "lit-html";
import type { ChatMessage, SimpleChatProxy } from "plexchat";
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

export const createChat = (config: { $chatProxy: Observable<SimpleChatProxy> }) => (props: { id: string; parsedBlob: any; $tx: Subject<MessageFromUI> }) => {
  const currentMessages = (props.parsedBlob.messages as { role: string; content: string }[]) ?? defaultMessages;

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
    <div class="c-chat-list">
      ${currentMessages.map(
        (message, index) => html`
          <div class="c-chat-entry">
            <div>
              <b>${message.role === "assistant" ? "┗╸" : ""}${message.role}</b>${message.role === "user"
                ? html`<button @click=${() => handleDelete(index, currentMessages.length)}>Delete</button>`
                : ""}
            </div>
            <div class="u-auto-resize" data-resize-textarea-content=${message.content}>
              <textarea .value=${message.content} @input=${(e: InputEvent) => handleInput(e, index)}></textarea>
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
