import { getCombo } from "../../utils/keyboard";
import "./editor-element.css";
import template from "./editor-element.html?raw";

export interface EditorProps {
  tree: TreeNode[];
  onSubmit: (node: TreeNode) => void;
  onDelete: (id: string) => void;
  onEdit: (node: TreeNode) => void;
}
export interface TreeNode {
  id: string;
  text: string;
  classList?: string[];
}

export class EditorElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = template;
    this.addEventListener("keydown", this.handleKeydown.bind(this));
    this.appendTreeNode({ id: crypto.randomUUID(), text: "What's on your mind?" });
  }

  handleKeydown(e: Event) {
    switch (getCombo(e as KeyboardEvent)) {
      case "ctrl+enter": {
        const target = document.getSelection()?.anchorNode?.parentElement?.closest("[data-node]") as HTMLElement;
        const id = target?.getAttribute("data-node");
        if (!id) break;

        e.preventDefault();

        const text = target.textContent ?? "";
        this.dispatchEvent(new CustomEvent("execute", { detail: { id, text } }));
        break;
      }
      case "ctrl+x": {
        const node = document.getSelection()?.anchorNode?.parentElement?.closest("[data-node]");

        if (node && node === this.querySelector("[data-node]")) {
          node.innerHTML = "";
        } else {
          node?.remove();
        }

        break;
      }
    }
  }

  appendTreeNode(node: TreeNode, afterId?: string) {
    const newNode = document.createElement("div");
    newNode.setAttribute("data-node", node.id);
    newNode.classList.add("c-editor__node");
    newNode.innerHTML = node.text;
    if (node.classList) newNode.classList.add(...node.classList);
    const afterNode = this.querySelector(`[data-node="${afterId}"]`);
    this.childNodes[0].insertBefore(newNode, afterNode?.nextSibling ?? null);
  }

  replaceTreeNodeText(id: string, text: string) {
    const replaceNode = this.querySelector(`[data-node="${id}"]`);
    if (!replaceNode) return;
    replaceNode.textContent = text;
  }
}
