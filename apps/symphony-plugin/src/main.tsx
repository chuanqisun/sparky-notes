import { cssPadding } from "./utils/css-padding";
import { useInjectedRuntime } from "./utils/injected-runtime";

const showUI = (href: string, options?: ShowUIOptions) => figma.showUI(`<script>window.location.href="${href}"</script>`, options);

const { widget } = figma;
const { useEffect, AutoLayout, useSyncedState, usePropertyMenu, useWidgetId, SVG, Text, Input } = widget;

function Widget() {
  useInjectedRuntime();

  return (
    <AutoLayout
      padding={cssPadding(80, 40, 80, 40)}
      direction="vertical"
      cornerRadius={20}
      fill={"#333333"}
      strokeWidth={4}
      onClick={() =>
        new Promise((_resolve) => {
          showUI(`${process.env.VITE_WEB_HOST}/index.html?t=${Date.now()}`, { height: 600, width: 420 });
        })
      }
    >
      <Text fontSize={80} fontWeight={700} fill="#ffffff">
        Open Composer
      </Text>
    </AutoLayout>
  );
}

widget.register(Widget);
