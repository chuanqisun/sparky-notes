import { html } from "lit-html";
import type { SimpleChatProxy } from "plexchat";
import { firstValueFrom, Observable, of, type Subject } from "rxjs";
import type { MessageFromUI } from "../../../types/message";

export const createChat = (config: { $chatProxy: Observable<SimpleChatProxy> }) => (props: { id: string; parsedBlob: any; $tx: Subject<MessageFromUI> }) => {
  const handleInput = (e: InputEvent) => {
    const messageInput = (e.target as HTMLInputElement).value;
    props.$tx.next({
      setNodeBlob: {
        id: props.id,
        blob: JSON.stringify({
          ...props.parsedBlob,
          messageInput,
        }),
      },
    });
  };

  const handleSubmit = async () => {
    const chatProxy = await firstValueFrom(config.$chatProxy);
    const messageInput = props.parsedBlob.messageInput ?? "";
    const messageOutput = await chatProxy({
      messages: [
        {
          role: "user",
          content: messageInput,
        },
      ],
    }).then((output) => output.choices[0].message.content ?? "Error");

    props.$tx.next({
      setNodeBlob: {
        id: props.id,
        blob: JSON.stringify({
          ...props.parsedBlob,
          messages: [
            ...(props.parsedBlob.messages ?? []),
            {
              role: "user",
              content: messageInput,
            },
            {
              role: "assistant",
              content: messageOutput,
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
          messageInput: "",
          messages: [],
        }),
      },
    });
  };

  const handleSave = () => {};

  return of(html`
    <input type="text" placeholder="Hello, chat bot" @input=${handleInput} .value=${props.parsedBlob.messageInput ?? ""} /><button @click=${handleSubmit}>
      Submit
    </button>
    <dl>
      ${((props.parsedBlob?.messages as { role: string; content: string }[]) ?? []).map(
        (message) => html`
          <dt>${message.role}</dt>
          <dd>${message.content}</dd>
        `
      )}
    </dl>
    <button @click=${handleReset}>Reset</button>
    <button @click=${handleSave}>Save</button>
  `);
};
