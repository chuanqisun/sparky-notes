const showUI = (href: string, options?: ShowUIOptions) => figma.showUI(`<script>window.location.href="${href}"</script>`, options);

const { widget } = figma;
const { useEffect, AutoLayout, useSyncedState, usePropertyMenu, useWidgetId, SVG, Text, Input } = widget;

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
