// This widget will open an Iframe window with buttons to show a toast message and close the window.

const { widget } = figma;
const { useEffect, useSyncedState, Text, AutoLayout } = widget;

function Widget() {
  const [content, setContent] = useSyncedState<null | string>("cardContent", null);

  useEffect(() => {
    figma.ui.onmessage = (msg) => {
      if (msg.type === "selectItem") {
        const { id, title } = msg;

        figma.notify(`${title} added to canvas`);
        setContent(title);
      }
    };
  });

  return (
    <AutoLayout>
      <Text
        fontSize={24}
        onClick={
          // Use async callbacks or return a promise to keep the Iframe window
          // opened. Resolving the promise, closing the Iframe window, or calling
          // "figma.closePlugin()" will terminate the code.
          () =>
            new Promise((resolve) => {
              figma.showUI(__html__, {
                width: 480,
                height: 720,
              });
            })
        }
      >
        {content ? content : "Search in HITS"}
      </Text>
      <Text
        fontSize={24}
        onClick={
          // Use async callbacks or return a promise to keep the Iframe window
          // opened. Resolving the promise, closing the Iframe window, or calling
          // "figma.closePlugin()" will terminate the code.
          () =>
            new Promise((resolve) => {
              figma.showUI(`<script>window.location.href="https://hits.microsoft.com"</script>`);
            })
        }
      >
        Show HITS
      </Text>
    </AutoLayout>
  );
}

widget.register(Widget);
