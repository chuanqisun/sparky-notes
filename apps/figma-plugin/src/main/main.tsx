const { widget } = figma;
const { useEffect, useSyncedState, Text, AutoLayout, SVG, Frame, Rectangle } = widget;
import lightBulb from "./assets/light-bulb.svg";
import thumbUp from "./assets/thumb-up.svg";

const entities = {
  1: {
    icon: lightBulb,
    name: "Insight",
    color: "#FFE457",
  },
  25: {
    icon: thumbUp,
    name: "Recommendation",
    color: "#57C3FF",
  },
};

export interface WidgetEntity {
  title: string;
  id: string;
  entityType: number;
}

function Widget() {
  const [entity, setEntity] = useSyncedState<null | WidgetEntity>("widgetEntity", null);

  useEffect(() => {
    figma.ui.onmessage = async (msg) => {
      if (msg.type === "selectItem") {
        figma.notify(`${msg.title} added to canvas`);
        setEntity(msg);
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
    <AutoLayout cornerRadius={8}>
      {entity === null ? (
        <Text
          fontSize={24}
          onClick={
            // Use async callbacks or return a promise to keep the Iframe window
            // opened. Resolving the promise, closing the Iframe window, or calling
            // "figma.closePlugin()" will terminate the code.
            () =>
              new Promise((resolve) => {
                figma.showUI(`<script>window.location.href="http://localhost:5173"</script>`, {
                  width: 480,
                  height: 720,
                });
              })
          }
        >
          Add from HITS
        </Text>
      ) : (
        <AutoLayout direction="horizontal">
          <AutoLayout fill="#3A3735" width={40} height="fill-parent" horizontalAlignItems="center" padding={8}>
            <SVG src={entities[entity.entityType].icon} tooltip={entities[entity.entityType].name} />
          </AutoLayout>
          <AutoLayout fill={entities[entity.entityType].color} width={240} height="fill-parent" padding={8}>
            <Text width="fill-parent">{entity.title}</Text>
          </AutoLayout>
        </AutoLayout>
      )}
    </AutoLayout>
  );
}

widget.register(Widget);
