// This widget will open an Iframe window with buttons to show a toast message and close the window.

const { widget } = figma;
const { useEffect, useSyncedState, Text, AutoLayout } = widget;

function Widget() {
  const [content, setContent] = useSyncedState<null | string>("cardContent", null);

  useEffect(() => {
    console.log("updated!!!!", Date.now());
  });

  useEffect(() => {
    figma.ui.onmessage = async (msg) => {
      if (msg.type === "selectItem") {
        const { id, title } = msg;

        figma.notify(`${title} added to canvas`);
        setContent(title);
      } else if (msg.type === "setToken") {
        if (msg.token) {
          await figma.clientStorage.setAsync("token", msg.token);
        } else {
          await figma.clientStorage.deleteAsync("token");
        }
      } else if (msg.type === "getToken") {
        const token = await figma.clientStorage.getAsync("token");
        figma.ui.postMessage({ type: "storedToken", token });
      }
    };
  });

  return (
    <AutoLayout direction="vertical">
      <Text
        fontSize={24}
        onClick={
          // Use async callbacks or return a promise to keep the Iframe window
          // opened. Resolving the promise, closing the Iframe window, or calling
          // "figma.closePlugin()" will terminate the code.
          () =>
            new Promise(async (resolve) => {
              figma.showUI(__html__, {
                width: 480,
                height: 720,
              });
            })
        }
      >
        {content ? content : "Search in HITS"}
      </Text>
      <Text>&nbsp;&nbsp;</Text>
      <Text
        fontSize={24}
        onClick={
          // Use async callbacks or return a promise to keep the Iframe window
          // opened. Resolving the promise, closing the Iframe window, or calling
          // "figma.closePlugin()" will terminate the code.
          () =>
            new Promise((resolve) => {
              figma.showUI(`<script>window.location.href="https://www.wikipedia.org"</script>`, {
                width: 480,
                height: 720,
              });
            })
        }
      >
        Demo Link
      </Text>
    </AutoLayout>
  );
}

widget.register(Widget);
