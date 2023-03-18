import type { MessageToFigma } from "@symphony/types";

const showUI = (href: string, options?: ShowUIOptions) => figma.showUI(`<script>window.location.href="${href}"</script>`, options);

const { widget } = figma;
const { useEffect, AutoLayout, useSyncedState, usePropertyMenu, useWidgetId, SVG, Text, Input } = widget;

export type InjectedContext = {};

let injectedMessageHandler: any;
let injectedSelectionChangeHandler: any;
let injectedContext: InjectedContext = {};

function resetContext() {
  for (const x in injectedContext) if (injectedContext.hasOwnProperty(x)) delete (injectedContext as any)[x];
}

async function bootstrapHandler(message: MessageToFigma) {
  if (message.injectMessageHandler) {
    figma.ui.off("message", injectedMessageHandler);
    resetContext();
    injectedMessageHandler = new Function("context", "message", message.injectMessageHandler).bind(null, injectedContext);
    figma.ui.on("message", injectedMessageHandler as any);
  }
  if (message.injectSelectionHandler) {
    figma.off("selectionchange", injectedSelectionChangeHandler);
    resetContext();
    injectedSelectionChangeHandler = new Function("context", "message", message.injectSelectionHandler).bind(null, injectedContext);
    figma.on("selectionchange", injectedSelectionChangeHandler as any);
  }
}

figma.ui.on("message", bootstrapHandler);

function Widget() {
  return (
    <AutoLayout
      padding={0}
      direction="vertical"
      cornerRadius={6}
      strokeWidth={4}
      onClick={() =>
        new Promise((_resolve) => {
          showUI(`${process.env.VITE_WEB_HOST}/index.html?t=${Date.now()}`, { height: 600, width: 420 });
        })
      }
    >
      <Text fontSize={80} fontWeight={700}>
        Open Composer
      </Text>
    </AutoLayout>
  );
}

widget.register(Widget);
